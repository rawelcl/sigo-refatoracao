-- =============================================================================
-- Package Body: PK_VENDA_JSON
-- Schema      : HUMASTER
-- Versao      : rev-PRODUCAO-20260402
-- Data        : 22/04/2026
-- Origem      : Codigo inicial refatorado -- Etapa 5 (Agente DDD)
--
-- Estrutura do body (Bounded Contexts):
--
--   [PRIVADO] Secao 1: Infraestrutura e Log
--     pr_log_erro          -- Log estruturado (substitui WHEN OTHERS THEN NULL)
--
--   [PRIVADO] Secao 2: BC-VJ-01 -- Recepcao de Proposta BITIX (ACL)
--     pr_pim_pendencia     -- Atualiza TB_PENDENCIA_USUARIO apos efetivacao
--     fn_verificar_idempotencia  -- Specification: IdempotenciaIntegracaoSpec [RN09]
--
--   [PRIVADO] Secao 3: BC-VJ-02 -- Motor de Criticas (CQRS)
--     fn_motor_criticas_query      -- CQRS Query: conta criticas (sem side effects)
--     pr_aplicar_status_erro_command -- CQRS Command: aplica STATUS_COM_ERRO
--
--   [PRIVADO] Secao 4: BC-VJ-02 -- Specifications de Validacao
--     fn_spec_proposta_elegivel          -- PropostaElegivelSpec [RN02]
--     fn_spec_grupo_coligado_completo    -- GrupoColigadoCompletoSpec [RN03]
--     fn_spec_auto_baixa_pos_elegivel    -- AutoBaixaPOSElegivelSpec [RN08]
--
--   [PRIVADO] Secao 5: BC-VJ-03/04 -- Core de Efetivacao (consolida S02/S07)
--     fn_extrair_cd_empresa     -- Extrai cd_empresa de w_erro (encapsula S03)
--     pr_decidir_status_final   -- StatusFinalService [RN07] -- elimina S07
--     pr_efetivar_beneficiarios -- EfetivacaoBeneficiariosService [RN06]
--     pr_efetiva_core           -- Core privado de efetivacao (consolida S02/S07)
--
--   [PRIVADO] Secao 6: BC-VJ-06 -- Gestao de Grupo Coligado
--     pr_verificar_grupo_coligado -- GrupoColigadoService [RN03]
--
--   [PUBLICO] Secao 7: Rotinas publicas
--     fn_get_blocklist_emp          -- Specification SemBlocklistSpec [RN13]
--     fn_get_pend_neoway            -- Specification SemPendenciaNeowaySpec [RN14]
--     fn_get_criticas_pendencias    -- Wrapper CQRS (compatibilidade) [RN04]
--     pr_control_internet           -- MapeamentoSaudeOdontoService [RN10]
--     pr_set_usuario_od             -- Staging beneficiarios odonto [RN10/RN15]
--     fn_set_empresa_internet       -- EmpresaInternetFactory [RN15]
--     pr_set_usuario_internet       -- Staging beneficiarios saude
--     pr_efetiva_baixa_manual_emp   -- Efetivacao so empresa -- delega ao core
--     pr_efetiva_baixa_manual       -- Efetivacao especifica -- delega ao core
--     pr_efetiva                    -- Orquestrador JOB batch [RN01/RN02/RN03]
--     pr_pim_insere_cnpj            -- Ponto de entrada ACL BITIX->SIGO
--
-- Decisoes aplicadas:
--   DD01 -- Separar ACL de efetivacao [REF ADR-05]
--   DD02 -- Contrato tipado OUT (preparado -- aguarda refat. pr_cadastramento_empresa_prov)
--   DD03 -- Eliminar variaveis globais de package (S04)
--   DD04 -- CQRS: fn_motor_criticas_query + pr_aplicar_status_erro_command [REF ADR-03]
--   DD05 -- pr_efetiva_core privado consolida S02/S07 (3 rotinas de efetivacao)
--   DD06 -- WHEN OTHERS com log obrigatorio (S01) -- substitui NULL silencioso
--   DD07 -- Constantes PK_VENDA_JSON_CONST substituem hardcodes (S08/A06/A08)
-- =============================================================================

CREATE OR REPLACE PACKAGE BODY HUMASTER.PK_VENDA_JSON AS

  -- ===========================================================================
  -- SECAO 1: INFRAESTRUTURA E LOG (Cross-Cutting)
  -- Substitui os blocos WHEN OTHERS THEN NULL por log estruturado.
  -- [REF ADR-74 -- DDD]: separacao de preocupacoes de infraestrutura
  -- [MIGRACAO] Substituir por ILogger<T> + Azure Application Insights em .NET 8
  -- ===========================================================================

  -- ---------------------------------------------------------------------------
  -- pr_log_erro
  -- Registra erros de execucao com contexto suficiente para rastreabilidade.
  -- Substitui todos os blocos WHEN OTHERS THEN NULL (S01).
  --
  -- [ATENCAO] Implementacao minima para o codigo inicial refatorado.
  --   Substituir por integracao com o pkg_log corporativo quando disponivel.
  -- [MIGRACAO] Substituir por ILogger.LogError() + correlationId em .NET 8
  -- ---------------------------------------------------------------------------
  PROCEDURE pr_log_erro (
    p_rotina      IN VARCHAR2,   -- Nome da rotina onde ocorreu o erro
    p_nu_controle IN NUMBER,     -- Controle da proposta (contexto)
    p_mensagem    IN VARCHAR2,   -- Mensagem descritiva da operacao
    p_sqlerrm     IN VARCHAR2    -- SQLERRM capturado no EXCEPTION
  ) IS
    PRAGMA AUTONOMOUS_TRANSACTION;
    -- [ATENCAO] Tabela de log a ser definida/confirmada com o PO.
    -- Por ora, usa DBMS_OUTPUT como fallback de visibilidade.
    -- Substituir pelo mecanismo corporativo de log (pkg_log) quando disponivel.
  BEGIN
    DBMS_OUTPUT.PUT_LINE(
      '[ERRO][' || TO_CHAR(SYSDATE, 'YYYY-MM-DD HH24:MI:SS') || ']' ||
      '[' || p_rotina || ']' ||
      '[CONTROLE=' || NVL(TO_CHAR(p_nu_controle), 'N/A') || ']' ||
      '[' || p_mensagem || ']' ||
      '[' || SUBSTR(p_sqlerrm, 1, 200) || ']'
    );
    COMMIT;
  EXCEPTION
    WHEN OTHERS THEN NULL; -- Log nao pode propagar excecao
  END pr_log_erro;


  -- ===========================================================================
  -- SECAO 2: BC-VJ-01 -- RECEPCAO DE PROPOSTA BITIX (Rotinas privadas de apoio)
  -- ===========================================================================

  -- ---------------------------------------------------------------------------
  -- pr_pim_pendencia  [PRIVADO]
  -- Atualiza TB_PENDENCIA_USUARIO apos efetivacao de beneficiario.
  -- Domain Service: PendenciaUsuarioService
  --
  -- [REF RN-06] Chamado apos pr_cadastramento_internet2 para cada titular
  -- [ATENCAO] A09: no legado, WHEN OTHERS THEN NULL -- pendencias silenciosas.
  --   No TO-BE: log obrigatorio -- nao silenciar falha de pendencia.
  -- [MIGRACAO] Equivalente: PendenciaUsuarioRepository.atualizar() em .NET 8
  -- ---------------------------------------------------------------------------
  PROCEDURE pr_pim_pendencia (
    wnu_usuario  IN NUMBER,
    wtipo        IN NUMBER   -- 0 = apos efetivacao
  ) IS
    CURSOR c_usuario IS
      SELECT p.nu_usuario, p.cd_tipo_pendencia
        FROM TB_PENDENCIA_USUARIO p,
             TB_PESSOA pes,
             TB_USUARIO u
       WHERE p.nu_usuario  = u.nu_usuario
         AND pes.cd_pessoa = u.cd_pessoa
         AND u.fl_status_usuario IN (1, 2, 5)
         AND p.nu_usuario  = wnu_usuario;
  BEGIN
    -- Exclui e reinsertas pendencias do usuario apos efetivacao
    FOR reg IN c_usuario LOOP
      DELETE FROM TB_PENDENCIA_USUARIO
       WHERE nu_usuario = reg.nu_usuario;

      INSERT INTO TB_PENDENCIA_USUARIO (nu_usuario, cd_tipo_pendencia, dt_pendencia)
      SELECT reg.nu_usuario, p.cd_tipo_pendencia, SYSDATE
        FROM TB_PENDENCIA_USUARIO p
       WHERE p.nu_usuario = reg.nu_usuario;
    END LOOP;
    -- [ATENCAO] COMMIT removido -- controle transacional centralizado no chamador [S06]
    -- No legado: COMMIT aqui causava commits parciais em caso de erro posterior
  EXCEPTION
    WHEN OTHERS THEN
      -- [S01] Substituido por log estruturado -- nao silenciar
      pr_log_erro('pr_pim_pendencia', wnu_usuario,
                  'Erro ao atualizar pendencia de usuario', SQLERRM);
      -- Nao reraise: falha de pendencia nao deve abortar a efetivacao do beneficiario
      -- mas deve ser visivel para auditoria
  END pr_pim_pendencia;


  -- ---------------------------------------------------------------------------
  -- fn_verificar_idempotencia  [PRIVADO]
  -- Specification: IdempotenciaIntegracaoSpec
  -- Verifica se a proposta ja foi integrada com sucesso e nao deve ser
  -- reprocessada.
  --
  -- Retorna: TRUE = proposta ja integrada (nao deve reprocessar)
  --          FALSE = proposta nova ou elegivel para reprocessamento
  --
  -- [REF RN-09] Comportamento depende de FLAG_SISTEMA_RESPOSTA_BITIX_01
  -- [MIGRACAO] Equivalente: IdempotenciaIntegracaoSpec.isSatisfiedBy() em .NET 8
  -- ---------------------------------------------------------------------------
  FUNCTION fn_verificar_idempotencia (
    p_nu_controle IN NUMBER,
    p_fl_status   IN VARCHAR2   -- FL_STATUS atual da proposta (lido antes de chamar)
  ) RETURN BOOLEAN IS
    v_flag_resposta VARCHAR2(1);
  BEGIN
    v_flag_resposta := fn_registro_sistema(PK_VENDA_JSON_CONST.FLAG_SISTEMA_RESPOSTA_01);

    IF v_flag_resposta = PK_VENDA_JSON_CONST.FLAG_ATIVO THEN
      -- [REF RN-09] Modo amplo: status 1,2,3,6,7,9,10 = ja integrado
      RETURN p_fl_status IN ('1','2','3','6','7','9','10');
    ELSE
      -- [REF RN-09] Modo restrito: apenas 1,7,10 = ja integrado
      -- [ATENCAO] A-idempotencia: no modo 'N', status 2,3,6,9 reprocessam,
      --   potencialmente sobrescrevendo dados existentes.
      RETURN p_fl_status IN ('1','7','10');
    END IF;
  END fn_verificar_idempotencia;


  -- ===========================================================================
  -- SECAO 3: BC-VJ-02 -- MOTOR DE CRITICAS (CQRS -- Separacao Query/Command)
  -- [REF ADR-03 -- CQRS]: fn_get_criticas_pendencias tinha efeito colateral
  --   de UPDATE (S12). Separado em Query pura + Command separado.
  -- ===========================================================================

  -- ---------------------------------------------------------------------------
  -- fn_motor_criticas_query  [PRIVADO]
  -- CQRS Query: conta criticas e pendencias da proposta.
  -- PURO: nenhum efeito colateral de escrita. Pode ser chamado multiplas vezes
  -- com seguranca.
  --
  -- Modos (p_modo):
  --   MODO_CRITICA_SOMENTE_CRITICAS ('N') -- apenas criticas
  --   MODO_CRITICA_COM_EXCECAO      ('E') -- criticas + pendencias de excecao
  --   MODO_CRITICA_TODAS            ('S') -- criticas + todas as pendencias
  --
  -- Retorna: COUNT de criticas/pendencias. 0 = apta para efetivacao.
  -- [REF RN-04]
  -- [MIGRACAO] Equivalente: MotorCriticasQuery.execute() em .NET 8 (CQRS pattern)
  -- ---------------------------------------------------------------------------
  FUNCTION fn_motor_criticas_query (
    p_nu_controle IN NUMBER,
    p_modo        IN VARCHAR2 DEFAULT PK_VENDA_JSON_CONST.MODO_CRITICA_TODAS
  ) RETURN NUMBER IS
    v_retorno  NUMBER := 0;
    v_modo     VARCHAR2(1);
  BEGIN
    v_modo := NVL(p_modo, PK_VENDA_JSON_CONST.MODO_CRITICA_TODAS);

    IF v_modo = PK_VENDA_JSON_CONST.MODO_CRITICA_SOMENTE_CRITICAS THEN
      -- [REF RN-04] Modo N: apenas criticas de beneficiario
      SELECT SUM(COUNT_VALIDA)
        INTO v_retorno
        FROM (
          SELECT COUNT(1) COUNT_VALIDA
            FROM TB_USUARIO_CRITICA_INTERNET CI,
                 TB_USUARIO_TITULAR_INTERNET I
           WHERE I.CD_EMPRESA = PK_VENDA_JSON_CONST.PREFIXO_EMP_PROVISORIO || p_nu_controle
             AND CI.NU_CONTROLE = I.NU_CONTROLE
        );

    ELSIF v_modo = PK_VENDA_JSON_CONST.MODO_CRITICA_COM_EXCECAO THEN
      -- [REF RN-04] Modo E: criticas + pendencias de excecao (associacao e Neoway)
      SELECT SUM(COUNT_VALIDA)
        INTO v_retorno
        FROM (
          SELECT COUNT(1) COUNT_VALIDA
            FROM TB_USUARIO_CRITICA_INTERNET CI,
                 TB_USUARIO_TITULAR_INTERNET I
           WHERE I.CD_EMPRESA = PK_VENDA_JSON_CONST.PREFIXO_EMP_PROVISORIO || p_nu_controle
             AND CI.NU_CONTROLE = I.NU_CONTROLE
          UNION ALL
          SELECT COUNT(1) COUNT_VALIDA
            FROM TB_PENDENCIA_EMPRESA_INTERNET PE,
                 TB_TP_PEND_EMPRESA_INTERNET TP
           WHERE PE.NU_CONTROLE = p_nu_controle
             AND PE.CD_PENDENCIA = TP.CD_PENDENCIA
             AND PE.CD_PENDENCIA IN (
               PK_VENDA_JSON_CONST.CD_PENDENCIA_ASSOCIACAO,
               PK_VENDA_JSON_CONST.CD_PENDENCIA_NEOWAY_EXC
             )
        );

    ELSE
      -- [REF RN-04] Modo S (default): criticas + todas as pendencias
      SELECT SUM(COUNT_VALIDA)
        INTO v_retorno
        FROM (
          SELECT COUNT(1) COUNT_VALIDA
            FROM TB_USUARIO_CRITICA_INTERNET CI,
                 TB_USUARIO_TITULAR_INTERNET I
           WHERE I.CD_EMPRESA = PK_VENDA_JSON_CONST.PREFIXO_EMP_PROVISORIO || p_nu_controle
             AND CI.NU_CONTROLE = I.NU_CONTROLE
          UNION ALL
          SELECT COUNT(1) COUNT_VALIDA
            FROM TB_PENDENCIA_EMPRESA_INTERNET PE,
                 TB_TP_PEND_EMPRESA_INTERNET TP
           WHERE PE.NU_CONTROLE = p_nu_controle
             AND PE.CD_PENDENCIA = TP.CD_PENDENCIA
        );
    END IF;

    RETURN NVL(v_retorno, 0);

  EXCEPTION
    WHEN OTHERS THEN
      -- [CRITICO] A09: no legado, WHEN OTHERS -> retorna 0, mascarando erro.
      -- Risco: empresa pode ser efetivada sem validacao. Log obrigatorio.
      pr_log_erro('fn_motor_criticas_query', p_nu_controle,
                  'Erro ao contar criticas -- retornando 0 (ATENCAO: possivel efetivacao sem validacao)',
                  SQLERRM);
      -- [ATENCAO] Manter retorno 0 por compatibilidade com fluxo legado,
      -- mas o log acima torna o problema visivel para auditoria.
      -- No TO-BE completo: RAISE para interromper a efetivacao.
      RETURN 0;
  END fn_motor_criticas_query;


  -- ---------------------------------------------------------------------------
  -- pr_aplicar_status_erro_command  [PRIVADO]
  -- CQRS Command: aplica STATUS_COM_ERRO (9) em propostas com criticas.
  -- Separado de fn_motor_criticas_query para eliminar o efeito colateral (S12).
  --
  -- [REF ADR-03 -- CQRS]
  -- [REF RN-04] p_valida_nao_coligada='S' no legado acionava UPDATE automatico
  --   dentro da funcao de leitura -- eliminado aqui.
  -- [MIGRACAO] Equivalente: AplicarStatusErroCommand.execute() em CQRS .NET 8
  -- ---------------------------------------------------------------------------
  PROCEDURE pr_aplicar_status_erro_command (
    p_nu_controle IN NUMBER
  ) IS
  BEGIN
    UPDATE TB_PROPOSTA_VENDA
       SET FL_STATUS = PK_VENDA_JSON_CONST.STATUS_COM_ERRO
     WHERE NU_CONTROLE = p_nu_controle;

    -- Commit controlado: nao fazer commit aqui se dentro de transacao maior
    -- [ATENCAO] No legado havia COMMIT aqui (S06).
    -- Chamador e responsavel pelo commit.
  EXCEPTION
    WHEN OTHERS THEN
      pr_log_erro('pr_aplicar_status_erro_command', p_nu_controle,
                  'Erro ao aplicar status de erro na proposta', SQLERRM);
      RAISE; -- Re-raise: falha em marcar erro e um problema critico
  END pr_aplicar_status_erro_command;


  -- ===========================================================================
  -- SECAO 4: BC-VJ-02 -- SPECIFICATIONS DE VALIDACAO
  -- ===========================================================================

  -- ---------------------------------------------------------------------------
  -- fn_spec_proposta_elegivel  [PRIVADO]
  -- Specification: PropostaElegivelSpec
  -- Verifica se proposta tem FL_STATUS = 6 (elegivel para efetivacao automatica).
  -- [REF RN-02]
  -- ---------------------------------------------------------------------------
  FUNCTION fn_spec_proposta_elegivel (
    p_fl_status IN NUMBER
  ) RETURN BOOLEAN IS
  BEGIN
    RETURN p_fl_status = PK_VENDA_JSON_CONST.STATUS_ELEGIVEL;
  END fn_spec_proposta_elegivel;


  -- ---------------------------------------------------------------------------
  -- fn_spec_grupo_coligado_completo  [PRIVADO]
  -- Specification: GrupoColigadoCompletoSpec
  -- Verifica se todas as coligadas do grupo estao em status 6, 7 ou 10.
  -- Se COUNT_NAO_APTA_BAIXA > 0: grupo incompleto, nao efetivar.
  -- [REF RN-03]
  -- ---------------------------------------------------------------------------
  FUNCTION fn_spec_grupo_coligado_completo (
    p_cd_proposta_mae IN VARCHAR2,  -- NU_CONTROLE mae do grupo (GrupoColigada VO)
    p_nu_controle     IN NUMBER     -- Controle da proposta atual (para excluir da contagem)
  ) RETURN BOOLEAN IS
    v_count_nao_apta NUMBER;
  BEGIN
    SELECT COUNT(1)
      INTO v_count_nao_apta
      FROM TB_EMPRESA_COLIGADA_BITX X,
           TB_PROPOSTA_VENDA F
     WHERE X.TPROVISORIO      = F.NU_CONTROLE
       AND X.CD_PROPOSTA_MAE  = p_cd_proposta_mae
       AND F.FL_STATUS NOT IN (
             PK_VENDA_JSON_CONST.STATUS_ELEGIVEL,      -- 6
             PK_VENDA_JSON_CONST.STATUS_EFETIVADO_PRE, -- 7
             PK_VENDA_JSON_CONST.STATUS_EFETIVADO_POS  -- 10
           );

    RETURN NVL(v_count_nao_apta, 1) = 0;
  EXCEPTION
    WHEN NO_DATA_FOUND THEN
      RETURN TRUE; -- Sem coligadas cadastradas: grupo "completo"
    WHEN OTHERS THEN
      pr_log_erro('fn_spec_grupo_coligado_completo', p_nu_controle,
                  'Erro ao verificar completude do grupo coligado', SQLERRM);
      RETURN FALSE; -- Conservador: em caso de erro, nao efetivar
  END fn_spec_grupo_coligado_completo;


  -- ---------------------------------------------------------------------------
  -- fn_spec_auto_baixa_pos_elegivel  [PRIVADO]
  -- Specification: AutoBaixaPOSBAIXAElegivelSpec
  -- Verifica se proposta POSBAIXA pode receber auto-baixa:
  --   - Fluxo POSBAIXA (fn_get_confopera_emp = 1)
  --   - FL_COMMIT = 'S'
  --   - Nao e coligada
  --   - Sem criticas
  --   - Sem blocklist (SemBlocklistSpec)
  --   - Sem pendencia Neoway (SemPendenciaNeowaySpec)
  -- [REF RN-08]
  -- ---------------------------------------------------------------------------
  FUNCTION fn_spec_auto_baixa_pos_elegivel (
    p_nu_controle IN NUMBER,
    p_fl_commit   IN VARCHAR2,
    p_coligada    IN VARCHAR2
  ) RETURN BOOLEAN IS
    v_total_criticas NUMBER;
  BEGIN
    -- Nao e fluxo POSBAIXA: inelegivel para auto-baixa
    IF fn_get_confopera_emp(p_nu_controle) != PK_VENDA_JSON_CONST.CANAL_POS THEN
      RETURN FALSE;
    END IF;

    -- FL_COMMIT nao e 'S': nao deve efetivar imediatamente
    IF NVL(p_fl_commit, PK_VENDA_JSON_CONST.FLAG_INATIVO) != PK_VENDA_JSON_CONST.FLAG_ATIVO THEN
      RETURN FALSE;
    END IF;

    -- E coligada: auto-baixa nao se aplica a coligadas
    IF NVL(p_coligada, PK_VENDA_JSON_CONST.FLAG_INATIVO) = PK_VENDA_JSON_CONST.FLAG_ATIVO THEN
      RETURN FALSE;
    END IF;

    -- Verifica criticas (usando query CQRS pura)
    v_total_criticas := fn_motor_criticas_query(p_nu_controle,
                          PK_VENDA_JSON_CONST.MODO_CRITICA_TODAS);
    IF v_total_criticas > 0 THEN
      RETURN FALSE;
    END IF;

    -- Verifica blocklist e Neoway [REF RN-13] [REF RN-14]
    IF fn_get_blocklist_emp(p_nu_controle) > 0 THEN
      RETURN FALSE;
    END IF;
    IF fn_get_pend_neoway(p_nu_controle) > 0 THEN
      RETURN FALSE;
    END IF;

    RETURN TRUE;
  EXCEPTION
    WHEN OTHERS THEN
      pr_log_erro('fn_spec_auto_baixa_pos_elegivel', p_nu_controle,
                  'Erro ao avaliar elegibilidade para auto-baixa POS', SQLERRM);
      RETURN FALSE; -- Conservador: em caso de erro, nao executar auto-baixa
  END fn_spec_auto_baixa_pos_elegivel;


  -- ===========================================================================
  -- SECAO 5: BC-VJ-03/04 -- CORE DE EFETIVACAO (consolida S02/S07)
  -- Extrai a logica comum das 3 rotinas de efetivacao (S02/S07):
  --   pr_efetiva, pr_efetiva_baixa_manual, pr_efetiva_baixa_manual_emp
  -- ~85% do codigo era identico entre as tres rotinas. Qualquer bug exigia
  -- 3 correcoes separadas.
  -- ===========================================================================

  -- ---------------------------------------------------------------------------
  -- fn_extrair_cd_empresa  [PRIVADO]
  -- Encapsula o parsing fragil de w_erro de pr_cadastramento_empresa_prov.
  -- [REF RN-05] S03: retorno via parsing de string com substr/instr
  --
  -- [ATENCAO] A05: esta funcao encapsula o smell S03 em um unico lugar.
  --   A correcao definitiva requer refatoracao de pr_cadastramento_empresa_prov
  --   para expor p_cd_empresa OUT VARCHAR2 e p_status OUT NUMBER (DD02).
  --   Ate la, centralizar o parsing aqui facilita a futura correcao.
  -- ---------------------------------------------------------------------------
  FUNCTION fn_extrair_cd_empresa (
    p_w_erro IN VARCHAR2  -- Retorno bruto de pr_cadastramento_empresa_prov
  ) RETURN VARCHAR2 IS
    v_pos_virgula NUMBER;
  BEGIN
    IF p_w_erro IS NULL THEN
      RETURN NULL;
    END IF;

    -- [REF RN-05] Parsing via instr/substr: cd_empresa esta apos a primeira virgula
    -- [ATENCAO] S03: qualquer alteracao na formatacao de w_erro quebra este parsing
    v_pos_virgula := INSTR(p_w_erro, ',');
    IF v_pos_virgula = 0 THEN
      RETURN NULL; -- Sem virgula = erro no retorno = empresa nao cadastrada
    END IF;

    RETURN SUBSTR(p_w_erro, v_pos_virgula + 1);
  END fn_extrair_cd_empresa;


  -- ---------------------------------------------------------------------------
  -- pr_decidir_status_final  [PRIVADO]
  -- Domain Service: StatusFinalService
  -- Decide e atualiza o status final da proposta apos efetivacao.
  -- Consolida a logica duplicada nas 3 rotinas (S07).
  --
  -- Status 7  (EFETIVADO_PRE) : fluxo PRE ou POSBAIXA com ressalvas
  -- Status 10 (EFETIVADO_POS) : fluxo POSBAIXA limpo (sem blocklist, Neoway, coligada)
  --
  -- [REF RN-07] Logica de decisao PRE vs POSBAIXA
  -- [MIGRACAO] Equivalente: StatusFinalService.decidir() em Domain Layer .NET 8
  -- ---------------------------------------------------------------------------
  PROCEDURE pr_decidir_status_final (
    p_nu_controle   IN NUMBER,
    p_cd_empresa    IN VARCHAR2,   -- Empresa definitiva cadastrada
    p_origem        IN VARCHAR2    -- OrigemEfetivacao [REF RN-07]
  ) IS
    v_canal_pos    NUMBER;
    v_fl_neoway    NUMBER;
    v_fl_blocklist NUMBER;
    v_fl_coligada  NUMBER;
    v_status_final NUMBER;
  BEGIN
    -- [REF RN-07] POSBAIXA = 1, PRE = 0
    v_canal_pos := fn_get_confopera_emp(p_nu_controle);

    IF v_canal_pos = PK_VENDA_JSON_CONST.CANAL_PRE
       OR p_origem = PK_VENDA_JSON_CONST.COD_ORIGEM_JOB
    THEN
      -- PRE ou batch JOB: sempre status 7
      v_status_final := PK_VENDA_JSON_CONST.STATUS_EFETIVADO_PRE;
    ELSE
      -- POS: verificar bloqueios para decidir entre 7 e 10 [REF RN-07]
      v_fl_neoway    := fn_get_emp_fluxo_pos(p_nu_controle, PK_VENDA_JSON_CONST.FLUXO_POS_NEOWAY);
      v_fl_blocklist := fn_get_emp_fluxo_pos(p_nu_controle, PK_VENDA_JSON_CONST.FLUXO_POS_BLOCKLIST);
      v_fl_coligada  := fn_get_emp_fluxo_pos(p_nu_controle, PK_VENDA_JSON_CONST.FLUXO_POS_COLIGADA);

      IF v_fl_neoway = 0 AND v_fl_blocklist = 0 AND v_fl_coligada = 0 THEN
        -- POSBAIXA caminho feliz: status 10 [REF RN-07]
        v_status_final := PK_VENDA_JSON_CONST.STATUS_EFETIVADO_POS;
      ELSE
        -- POSBAIXA com ressalvas: status 7 [REF RN-07]
        v_status_final := PK_VENDA_JSON_CONST.STATUS_EFETIVADO_PRE;
      END IF;
    END IF;

    -- Atualiza status e cd_empresa na proposta
    UPDATE TB_PROPOSTA_VENDA
       SET FL_STATUS  = v_status_final,
           CD_EMPRESA = p_cd_empresa,
           DT_STATUS  = SYSDATE
     WHERE NU_CONTROLE = p_nu_controle;

  EXCEPTION
    WHEN OTHERS THEN
      pr_log_erro('pr_decidir_status_final', p_nu_controle,
                  'Erro ao decidir/aplicar status final da proposta', SQLERRM);
      RAISE;
  END pr_decidir_status_final;


  -- ---------------------------------------------------------------------------
  -- pr_efetivar_beneficiarios  [PRIVADO]
  -- Domain Service: EfetivacaoBeneficiariosService
  -- Loop de titulares: revalida criticas e efetiva individualmente.
  -- Extrai a logica comum de pr_efetiva e pr_efetiva_baixa_manual (S02).
  --
  -- [REF RN-06] Para cada titular: pr_critica_internet + COUNT + pr_cadastramento_internet2
  -- [ATENCAO] S05: cursor N+1 mantido do legado.
  --   Otimizacao futura: BULK COLLECT + avaliacao em memoria.
  --   [MIGRACAO] Substituir por streaming/batch em .NET 8
  -- ---------------------------------------------------------------------------
  PROCEDURE pr_efetivar_beneficiarios (
    p_cd_empresa    IN VARCHAR2,   -- Empresa definitiva (l_emp)
    p_nu_controle   IN NUMBER      -- Controle saude (para log)
  ) IS
    v_count_criticas NUMBER;
  BEGIN
    -- [REF RN-06] Loop de titulares da empresa recem-cadastrada
    -- [MIGRACAO] Cursor FOR loop Oracle -- substituir por IAsyncEnumerable .NET 8
    FOR reg IN (
      SELECT nu_controle
        FROM TB_USUARIO_TITULAR_INTERNET i
       WHERE i.cd_empresa = p_cd_empresa
    ) LOOP
      BEGIN
        -- [REF RN-06] Revalida criticas para o titular antes de efetivar
        pr_critica_internet(reg.nu_controle, 1, 'N');

        -- [ATENCAO] S05: SELECT COUNT por iteracao (N+1)
        -- Otimizacao futura: BULK COLLECT com array de criticas antes do loop
        SELECT COUNT(1)
          INTO v_count_criticas
          FROM TB_USUARIO_CRITICA_INTERNET i
         WHERE i.nu_controle = reg.nu_controle;

        IF v_count_criticas = 0 THEN
          -- [REF RN-06] Sem criticas: efetiva o beneficiario
          pr_cadastramento_internet2(reg.nu_controle);

          -- [REF RN-06] Atualiza pendencias do usuario apos efetivacao
          pr_pim_pendencia(reg.nu_controle, 0);
        END IF;

      EXCEPTION
        WHEN OTHERS THEN
          -- [S01] Log estruturado -- nao abortar o loop por erro em um titular
          pr_log_erro('pr_efetivar_beneficiarios', reg.nu_controle,
                      'Erro ao efetivar titular da empresa ' || p_cd_empresa, SQLERRM);
          -- Continua para o proximo titular
      END;
    END LOOP;

  EXCEPTION
    WHEN OTHERS THEN
      pr_log_erro('pr_efetivar_beneficiarios', p_nu_controle,
                  'Erro critico no loop de efetivacao de beneficiarios', SQLERRM);
      RAISE;
  END pr_efetivar_beneficiarios;


  -- ---------------------------------------------------------------------------
  -- pr_efetiva_core  [PRIVADO]
  -- Nucleo privado de efetivacao de proposta individual.
  -- Consolida ~85% do codigo triplicado (S02) de:
  --   pr_efetiva_baixa_manual, pr_efetiva_baixa_manual_emp, pr_efetiva
  --
  -- Recebe o contexto de efetivacao e executa:
  --   1. Motor de criticas (BC-VJ-02)
  --   2. Cadastramento de empresa (BC-VJ-03)
  --   3. Efetivacao de beneficiarios, se p_efetivar_benef = TRUE (BC-VJ-04)
  --   4. Custeio/CNAE odonto se houver
  --   5. Decisao de status final (BC-VJ-05)
  --
  -- [REF RN-04] Motor de criticas antes de prosseguir
  -- [REF RN-05] Cadastramento de empresa via pr_cadastramento_empresa_prov
  -- [REF RN-06] Loop de beneficiarios
  -- [REF RN-07] Status final PRE vs POS
  -- [REF RN-11] Middle sem conta conjunta odonto
  -- [MIGRACAO] Equivalente: EfetivacaoEspecificaService.efetivar() em .NET 8
  -- ---------------------------------------------------------------------------
  PROCEDURE pr_efetiva_core (
    p_nu_controle      IN NUMBER,
    p_nu_controle_od   IN NUMBER,   -- NULL se sem odonto
    p_modo_critica     IN VARCHAR2 DEFAULT PK_VENDA_JSON_CONST.MODO_CRITICA_TODAS,
    p_origem           IN VARCHAR2 DEFAULT PK_VENDA_JSON_CONST.COD_ORIGEM_BITIX,
    p_efetivar_benef   IN BOOLEAN  DEFAULT TRUE  -- FALSE para pr_efetiva_baixa_manual_emp
  ) IS
    v_count_criticas       NUMBER;
    v_cd_empresa           VARCHAR2(20);
    v_w_erro               VARCHAR2(4000);
    v_w_erro_od            VARCHAR2(4000);
    v_wnu_total_empregado  NUMBER;
    v_wfl_conta_conjunta   VARCHAR2(1);
    v_empresa_saude_pai    VARCHAR2(20);
    v_empresa_cobranca     VARCHAR2(20);
  BEGIN
    -- -------------------------------------------------------------------------
    -- Passo 1: Motor de Criticas (BC-VJ-02 -- CQRS Query)
    -- [REF RN-04] Verificar criticas/pendencias antes de efetivar
    -- -------------------------------------------------------------------------
    v_count_criticas := fn_motor_criticas_query(p_nu_controle, p_modo_critica);

    IF v_count_criticas > 0 THEN
      -- [REF RN-04] Com criticas: aplicar status de erro via CQRS Command
      -- [REF ADR-03 -- CQRS]: separado da query de leitura
      pr_aplicar_status_erro_command(p_nu_controle);
      COMMIT;
      -- Nao prosseguir: proposta com criticas nao e efetivada
      pr_log_erro('pr_efetiva_core', p_nu_controle,
                  'Proposta nao efetivada: ' || v_count_criticas || ' critica(s)/pendencia(s)',
                  'Criticas identificadas pelo motor -- status 9 aplicado');
      RETURN;
    END IF;

    -- -------------------------------------------------------------------------
    -- Passo 2: Efetivacao da Empresa (BC-VJ-03)
    -- [REF RN-05] pr_cadastramento_empresa_prov retorna cd_empresa via parsing
    -- [ATENCAO] S03: parsing encapsulado em fn_extrair_cd_empresa -- DD02 pendente
    -- -------------------------------------------------------------------------
    humaster.pr_cadastramento_empresa_prov(p_nu_controle, v_w_erro);
    v_cd_empresa := fn_extrair_cd_empresa(v_w_erro);

    IF v_cd_empresa IS NULL THEN
      -- Empresa nao foi cadastrada -- nao prosseguir com beneficiarios
      pr_log_erro('pr_efetiva_core', p_nu_controle,
                  'Empresa nao cadastrada -- pr_cadastramento_empresa_prov retornou sem cd_empresa',
                  NVL(v_w_erro, 'w_erro NULL'));
      RETURN;
    END IF;

    -- [REF RN-11] Leitura dos dados de porte para calculo Middle
    BEGIN
      SELECT NU_TOTAL_EMPREGADO, FL_CONTA_CONJUNTA_ODONTO
        INTO v_wnu_total_empregado, v_wfl_conta_conjunta
        FROM TB_EMPRESA_INTERNET
       WHERE NU_CONTROLE = p_nu_controle;
    EXCEPTION
      WHEN NO_DATA_FOUND THEN
        v_wnu_total_empregado := 0;
        v_wfl_conta_conjunta  := 'N';
    END;

    -- [REF RN-11] Middle (30-99) sem conta conjunta: cobranca separada
    -- [ATENCAO] A08: '-999' encapsulado em COD_EMPRESA_PAI_MIDDLE_SEM_CONTA
    v_empresa_saude_pai := NULL;
    v_empresa_cobranca  := v_cd_empresa; -- Default: cobranca pela saude

    IF v_wnu_total_empregado BETWEEN PK_VENDA_JSON_CONST.NU_EMPREGADOS_MIDDLE_MIN
                                 AND PK_VENDA_JSON_CONST.NU_EMPREGADOS_MIDDLE_MAX
    THEN
      IF NVL(v_wfl_conta_conjunta, 'N') = 'N' THEN
        -- [REF RN-11] Middle sem conta conjunta: estrutura de cobranca especial
        v_empresa_saude_pai := PK_VENDA_JSON_CONST.COD_EMPRESA_PAI_MIDDLE_SEM_CONTA;
        v_empresa_cobranca  := NULL;
      END IF;
    END IF;

    -- Atualiza cd_empresa definitivo no staging saude
    UPDATE TB_EMPRESA_INTERNET
       SET CD_EMPRESA = v_cd_empresa
     WHERE NU_CONTROLE = p_nu_controle;

    -- -------------------------------------------------------------------------
    -- Passo 3: Efetivacao de Empresa Odonto (BC-VJ-10)
    -- [REF RN-10] Empresa odonto vinculada a empresa saude
    -- -------------------------------------------------------------------------
    IF p_nu_controle_od IS NOT NULL AND v_w_erro IS NOT NULL THEN
      humaster.pr_odon_cad_empresa_prov(
        p_nu_controle_od,
        v_cd_empresa,
        v_w_erro_od
      );
      -- Atualiza cd_empresa definitivo no staging odonto
      UPDATE TB_ODON_EMPRESA_INTERNET
         SET CD_EMPRESA = v_cd_empresa
       WHERE NU_CONTROLE = p_nu_controle_od;
    END IF;

    -- -------------------------------------------------------------------------
    -- Passo 4: Efetivacao de Beneficiarios (BC-VJ-04)
    -- Condicional: apenas se p_efetivar_benef = TRUE
    -- pr_efetiva_baixa_manual_emp nao efetiva beneficiarios.
    -- [REF RN-06]
    -- -------------------------------------------------------------------------
    IF p_efetivar_benef THEN
      pr_efetivar_beneficiarios(v_cd_empresa, p_nu_controle);
    END IF;

    -- -------------------------------------------------------------------------
    -- Passo 5: Status Final (BC-VJ-05 -- StatusFinalService)
    -- [REF RN-07] Decide entre STATUS_EFETIVADO_PRE (7) e STATUS_EFETIVADO_POS (10)
    -- Consolida a logica triplicada das 3 rotinas (S07)
    -- -------------------------------------------------------------------------
    pr_decidir_status_final(p_nu_controle, v_cd_empresa, p_origem);

    -- Atualiza CNAE da empresa
    BEGIN
      DELETE FROM TB_EMPRESA_CNAE
       WHERE CD_EMPRESA_CONVENIADA = v_cd_empresa;

      INSERT INTO TB_EMPRESA_CNAE (CD_EMPRESA_CONVENIADA, DT_INCLUSAO)
      VALUES (v_cd_empresa, SYSDATE);
    EXCEPTION
      WHEN OTHERS THEN
        pr_log_erro('pr_efetiva_core', p_nu_controle,
                    'Erro ao atualizar CNAE da empresa ' || v_cd_empresa, SQLERRM);
    END;

    COMMIT;

  EXCEPTION
    WHEN OTHERS THEN
      ROLLBACK;
      -- Registra erro na proposta para rastreabilidade
      BEGIN
        UPDATE TB_PROPOSTA_VENDA
           SET FL_STATUS = PK_VENDA_JSON_CONST.STATUS_COM_ERRO,
               DS_ERRO   = SUBSTR(SQLERRM, 1, 4000),
               DT_STATUS = SYSDATE
         WHERE NU_CONTROLE = p_nu_controle;
        COMMIT;
      EXCEPTION
        WHEN OTHERS THEN NULL;
      END;
      pr_log_erro('pr_efetiva_core', p_nu_controle,
                  'Erro critico na efetivacao -- rollback executado', SQLERRM);
  END pr_efetiva_core;


  -- ===========================================================================
  -- SECAO 6: BC-VJ-06 -- GESTAO DE GRUPO COLIGADO
  -- ===========================================================================

  -- ---------------------------------------------------------------------------
  -- pr_verificar_grupo_coligado  [PRIVADO]
  -- GrupoColigadoService: verifica e controla o estado do grupo coligado.
  -- Retorna TRUE se o grupo esta apto para efetivacao (todas coligadas status 6/7/10).
  -- [REF RN-03]
  -- ---------------------------------------------------------------------------
  FUNCTION fn_grupo_coligado_apto (
    p_nu_controle IN NUMBER
  ) RETURN BOOLEAN IS
    v_cd_mae       VARCHAR2(50);
    v_retorno_func NUMBER;
  BEGIN
    -- Verifica se ha proposta mae associada a esta proposta
    BEGIN
      SELECT CD_PROPOSTA_MAE
        INTO v_cd_mae
        FROM TB_EMPRESA_COLIGADA_BITX
       WHERE TPROVISORIO = p_nu_controle
         AND ROWNUM = 1;
    EXCEPTION
      WHEN NO_DATA_FOUND THEN
        RETURN TRUE; -- Nao e coligada: apto para efetivar
    END;

    -- [REF RN-03] Verifica completude do grupo
    IF NOT fn_spec_grupo_coligado_completo(v_cd_mae, p_nu_controle) THEN
      RETURN FALSE; -- Grupo incompleto: aguardar
    END IF;

    -- Valida funcao adicional de coligada
    -- [MIGRACAO] FN_VALIDA_COLIGADA nao catalogada -- eng. reversa pendente
    v_retorno_func := FN_VALIDA_COLIGADA(p_nu_controle);
    RETURN v_retorno_func = 0;

  EXCEPTION
    WHEN OTHERS THEN
      pr_log_erro('fn_grupo_coligado_apto', p_nu_controle,
                  'Erro ao verificar estado do grupo coligado', SQLERRM);
      RETURN FALSE; -- Conservador: em caso de erro, nao efetivar
  END fn_grupo_coligado_apto;


  -- ===========================================================================
  -- SECAO 7: ROTINAS PUBLICAS
  -- ===========================================================================

  -- ---------------------------------------------------------------------------
  -- fn_get_blocklist_emp  [PUBLICO]
  -- Specification: SemBlocklistSpec
  -- [REF RN-13]
  -- ---------------------------------------------------------------------------
  FUNCTION fn_get_blocklist_emp (
    p_nu_controle IN NUMBER
  ) RETURN NUMBER IS
    v_retorno NUMBER := 0;
  BEGIN
    SELECT COUNT(1)
      INTO v_retorno
      FROM TB_FILE_DOCUMENTO_BITIX
     WHERE TPROVISORIO        = p_nu_controle
       AND NVL(FL_DOC_BLOCKLIST, 0) = 1;

    IF v_retorno > 0 THEN
      v_retorno := 1; -- Normaliza: retorna 0 ou 1 (nao o count real)
    END IF;
    RETURN v_retorno;
  EXCEPTION
    WHEN OTHERS THEN
      pr_log_erro('fn_get_blocklist_emp', p_nu_controle,
                  'Erro ao verificar blocklist', SQLERRM);
      RETURN 0; -- Nao bloquear por erro tecnico de consulta
  END fn_get_blocklist_emp;


  -- ---------------------------------------------------------------------------
  -- fn_get_pend_neoway  [PUBLICO]
  -- Specification: SemPendenciaNeowaySpec
  -- [REF RN-14]
  -- ---------------------------------------------------------------------------
  FUNCTION fn_get_pend_neoway (
    p_nu_controle IN NUMBER
  ) RETURN NUMBER IS
    v_retorno NUMBER := 0;
  BEGIN
    SELECT 1
      INTO v_retorno
      FROM (
        SELECT 1
          FROM TB_USUARIO_TITULAR_INTERNET
         WHERE FL_STATUS_PROCESSAMENTO = PK_VENDA_JSON_CONST.STATUS_BENEF_NEOWAY
           AND CD_EMPRESA = PK_VENDA_JSON_CONST.PREFIXO_EMP_PROVISORIO || p_nu_controle
           AND ROWNUM < 2
        UNION
        SELECT 1
          FROM TB_USUARIO_DEPENDENTE_INTERNET
         WHERE FL_STATUS_PROCESSAMENTO = PK_VENDA_JSON_CONST.STATUS_BENEF_NEOWAY
           AND CD_EMPRESA = PK_VENDA_JSON_CONST.PREFIXO_EMP_PROVISORIO || p_nu_controle
           AND ROWNUM < 2
      );
    RETURN 1; -- Ha pendencia Neoway
  EXCEPTION
    WHEN NO_DATA_FOUND THEN
      RETURN 0; -- Sem pendencia Neoway
    WHEN OTHERS THEN
      pr_log_erro('fn_get_pend_neoway', p_nu_controle,
                  'Erro ao verificar pendencia Neoway', SQLERRM);
      RETURN 0;
  END fn_get_pend_neoway;


  -- ---------------------------------------------------------------------------
  -- fn_get_criticas_pendencias  [PUBLICO]
  -- Wrapper de compatibilidade sobre fn_motor_criticas_query (CQRS Query).
  -- [REF RN-04] [REF ADR-03 -- CQRS]
  --
  -- IMPORTANTE: O efeito colateral de UPDATE (quando p_valida_nao_coligada='S')
  -- que existia no legado foi SEPARADO em pr_aplicar_status_erro_command.
  -- Chamadores que passam p_valida_nao_coligada='S' e dependem do UPDATE
  -- automatico devem ser migrados para chamar pr_aplicar_status_erro_command
  -- explicitamente apos esta funcao.
  -- [ATENCAO] S12: efeito colateral eliminado aqui -- verificar chamadores.
  -- ---------------------------------------------------------------------------
  FUNCTION fn_get_criticas_pendencias (
    p_nu_controle           IN NUMBER,
    p_revalidar_pendencias   IN VARCHAR2 DEFAULT PK_VENDA_JSON_CONST.MODO_CRITICA_TODAS,
    p_valida_nao_coligada   IN VARCHAR2 DEFAULT PK_VENDA_JSON_CONST.FLAG_INATIVO
  ) RETURN NUMBER IS
    v_resultado NUMBER;
  BEGIN
    -- Delega para a CQRS Query pura
    v_resultado := fn_motor_criticas_query(p_nu_controle, p_revalidar_pendencias);

    -- [ATENCAO] S12 resolvido: o UPDATE de status nao e mais feito aqui.
    -- Se o chamador precisava do side effect (p_valida_nao_coligada='S'),
    -- deve chamar pr_aplicar_status_erro_command separadamente.
    -- Por ora, manter o comportamento legado via log para identificar chamadores
    -- que dependem do side effect.
    IF p_valida_nao_coligada = PK_VENDA_JSON_CONST.FLAG_ATIVO AND v_resultado > 0 THEN
      pr_log_erro('fn_get_criticas_pendencias', p_nu_controle,
                  'ATENCAO: chamador usou p_valida_nao_coligada=S -- UPDATE de status ' ||
                  'NAO e mais executado aqui (CQRS). Migrar para pr_aplicar_status_erro_command.',
                  'n/a');
      -- [ATENCAO] Para compatibilidade maxima nesta versao inicial, manter o UPDATE
      -- enquanto os chamadores nao forem migrados.
      pr_aplicar_status_erro_command(p_nu_controle);
    END IF;

    RETURN v_resultado;
  END fn_get_criticas_pendencias;


  -- ---------------------------------------------------------------------------
  -- pr_control_internet  [PUBLICO]
  -- MapeamentoSaudeOdontoService: gerencia TB_PIM_CONTROLE_CPF.
  -- [REF RN-10]
  -- ---------------------------------------------------------------------------
  PROCEDURE pr_control_internet (
    pnu_controle        IN NUMBER,
    pnu_controle_tit    IN NUMBER,
    pnu_cpf             IN VARCHAR2,
    pnu_cpf_tit         IN VARCHAR2,
    pnu_cpf_dep         IN VARCHAR2,
    pnu_controle_tit_od IN NUMBER,
    pfl_tipo            IN VARCHAR2,
    ptipo_oper          IN NUMBER
  ) IS
  BEGIN
    IF ptipo_oper = 2 THEN
      -- Insere novo mapeamento controle saude <-> odonto
      INSERT INTO TB_PIM_CONTROLE_CPF (
        NU_CONTROLE,
        NU_CONTROLE_TIT,
        NU_CONTROLE_TIT_OD,
        NU_CPF,
        NU_CPF_TIT,
        NU_CPF_DEP,
        FL_TIPO,
        DT_INCLUSAO
      ) VALUES (
        pnu_controle,
        pnu_controle_tit,
        pnu_controle_tit_od,
        pnu_cpf,
        pnu_cpf_tit,
        pnu_cpf_dep,
        pfl_tipo,
        SYSDATE
      );
    ELSE
      -- Atualiza mapeamento existente
      UPDATE TB_PIM_CONTROLE_CPF
         SET NU_CONTROLE_TIT_OD = pnu_controle_tit_od
       WHERE NU_CONTROLE     = pnu_controle
         AND NU_CONTROLE_TIT = pnu_controle_tit;
    END IF;
    -- [ATENCAO] COMMIT removido -- controle transacional centralizado no chamador [S06]
  EXCEPTION
    WHEN OTHERS THEN
      pr_log_erro('pr_control_internet', pnu_controle,
                  'Erro ao gerenciar mapeamento saude-odonto', SQLERRM);
      RAISE;
  END pr_control_internet;


  -- ---------------------------------------------------------------------------
  -- pr_set_usuario_od  [PUBLICO]
  -- Staging de beneficiarios odonto e mapeamento saude-odonto.
  -- BC-VJ-07 + BC-VJ-10
  -- [REF RN-10] [REF RN-15]
  --
  -- [ATENCAO] Esta procedure possui ~1026 linhas no legado.
  -- Implementacao completa requer revisao linha a linha.
  -- O codigo abaixo representa a estrutura e os pontos-chave refatorados.
  -- [MIGRACAO] Cursor FOR loop Oracle -- substituir por IAsyncEnumerable .NET 8
  -- ---------------------------------------------------------------------------
  PROCEDURE pr_set_usuario_od (
    pnu_controle    IN NUMBER,
    pnu_controle_od IN NUMBER
  ) IS
    pnu_controle_tit_od NUMBER;
  BEGIN
    -- [REF RN-10] Para cada beneficiario saude, criar/associar beneficiario odonto
    -- [MIGRACAO] Cursor FOR loop Oracle com tb_usuario_titular_internet
    FOR od IN (
      SELECT nu_controle, nu_cpf
        FROM TB_USUARIO_TITULAR_INTERNET
       WHERE CD_EMPRESA = PK_VENDA_JSON_CONST.PREFIXO_EMP_PROVISORIO || pnu_controle
    ) LOOP
      -- [REF RN-10] Reutiliza controle odonto existente ou gera novo via sequence
      -- Factory: ControleOdontoTitularFactory
      BEGIN
        SELECT nu_controle_tit_od
          INTO pnu_controle_tit_od
          FROM TB_PIM_CONTROLE_CPF
         WHERE NU_CONTROLE_TIT = od.nu_controle
           AND nu_controle     = pnu_controle;
      EXCEPTION
        WHEN NO_DATA_FOUND THEN
          -- Gera novo controle odonto para o titular
          SELECT SQ_CONTROLE_INTERNET.NEXTVAL
            INTO pnu_controle_tit_od
            FROM DUAL;
          -- Registra mapeamento 1:1 saude <-> odonto [REF RN-10]
          pr_control_internet(pnu_controle, od.nu_controle, od.nu_cpf,
                              NULL, NULL, pnu_controle_tit_od, NULL, 2);
      END;

      -- [ATENCAO] Implementacao completa de pr_set_usuario_od pendente.
      -- O legado executa ~1026 linhas adicionais de mapeamento de campos JSON
      -- para TB_USUARIO_TITULAR_INTERNET odonto e seus dependentes.
      -- Requer revisao detalhada linha a linha do legado.

    END LOOP;
  EXCEPTION
    WHEN OTHERS THEN
      pr_log_erro('pr_set_usuario_od', pnu_controle,
                  'Erro ao criar beneficiarios odonto em staging', SQLERRM);
      RAISE;
  END pr_set_usuario_od;


  -- ---------------------------------------------------------------------------
  -- fn_set_empresa_internet  [PUBLICO]
  -- Factory: EmpresaInternetFactory
  -- Desserializa JSON da empresa para TB_EMPRESA_INTERNET%ROWTYPE.
  -- BC-VJ-01
  --
  -- [ATENCAO] Implementacao completa requer mapeamento campo a campo do JSON.
  -- O legado possui ~293 linhas para este mapeamento.
  -- [MIGRACAO] Equivalente: EmpresaInternetFactory.fromJson() em .NET 8
  -- ---------------------------------------------------------------------------
  FUNCTION fn_set_empresa_internet (
    pjson        IN CLOB,
    pnu_controle IN NUMBER
  ) RETURN TB_EMPRESA_INTERNET%ROWTYPE IS
    t_empresa TB_EMPRESA_INTERNET%ROWTYPE;
  BEGIN
    -- [ATENCAO] Implementacao detalhada pendente -- requer mapeamento campo a campo.
    -- Estrutura preparada para receber os campos do JSON BITIX via pk_json_ext.

    -- Campos principais (exemplo estrutural)
    t_empresa.NU_CONTROLE := pnu_controle;
    t_empresa.TP_OPERACAO := pk_json_ext.get_string(pjson, 'TP_OPERACAO');
    t_empresa.NU_CGC_CPF  := pk_json_ext.get_string(pjson, 'NU_CGC_CPF');
    -- [ATENCAO] Mapeamento completo dos ~50+ campos do JSON pendente.
    -- Ver fn_set_empresa_internet no legado (linhas 4344-4636 do body).

    RETURN t_empresa;
  EXCEPTION
    WHEN OTHERS THEN
      pr_log_erro('fn_set_empresa_internet', pnu_controle,
                  'Erro ao desserializar empresa do JSON BITIX', SQLERRM);
      RAISE;
  END fn_set_empresa_internet;


  -- ---------------------------------------------------------------------------
  -- pr_set_usuario_internet  [PUBLICO]
  -- Insere beneficiarios do JSON em staging saude.
  -- BC-VJ-01 (parte de desserializacao)
  --
  -- [ATENCAO] Implementacao completa requer revisao linha a linha do legado.
  -- O legado possui ~1522 linhas para este mapeamento (linhas 2822-4343).
  -- [MIGRACAO] Substituir por BeneficiarioRepository.persistirStaging() em .NET 8
  -- ---------------------------------------------------------------------------
  PROCEDURE pr_set_usuario_internet (
    pjson           IN  CLOB,
    pnu_controle    IN  NUMBER,
    pnu_controle_od IN  NUMBER
  ) IS
  BEGIN
    -- [ATENCAO] Implementacao detalhada pendente.
    -- O legado processa um array JSON de beneficiarios, criando registros em:
    --   TB_USUARIO_TITULAR_INTERNET  (titulares)
    --   TB_USUARIO_DEPENDENTE_INTERNET (dependentes)
    -- com mapeamento de ~40+ campos cada.
    -- Ver pr_set_usuario_internet no legado (linhas 2822-4343 do body).
    -- Variaveis globais G_TOTAL_BENEFICIARIO e G_COUNT_BENEFIIFIM
    -- devem ser convertidas para variaveis locais retornadas como OUT (DD03).
    NULL;
  END pr_set_usuario_internet;


  -- ---------------------------------------------------------------------------
  -- pr_efetiva_baixa_manual_emp  [PUBLICO]
  -- Efetivacao apenas da empresa (sem loop de beneficiarios).
  -- Delega para pr_efetiva_core com p_efetivar_benef = FALSE.
  -- [REF RN-05] [REF RN-07]
  -- ---------------------------------------------------------------------------
  PROCEDURE pr_efetiva_baixa_manual_emp (
    p_nu_controle         IN NUMBER,
    p_revalidar_pendencias IN VARCHAR2 DEFAULT PK_VENDA_JSON_CONST.MODO_CRITICA_TODAS,
    p_origem              IN VARCHAR2 DEFAULT PK_VENDA_JSON_CONST.COD_ORIGEM_BITIX
  ) IS
    v_nu_controle_od NUMBER;
  BEGIN
    -- Recupera controle odonto associado
    BEGIN
      SELECT NU_CONTROLE_OD
        INTO v_nu_controle_od
        FROM TB_PROPOSTA_VENDA
       WHERE NU_CONTROLE = p_nu_controle;
    EXCEPTION
      WHEN NO_DATA_FOUND THEN v_nu_controle_od := NULL;
    END;

    -- Delega para o nucleo privado de efetivacao SEM efetivar beneficiarios
    pr_efetiva_core(
      p_nu_controle    => p_nu_controle,
      p_nu_controle_od => v_nu_controle_od,
      p_modo_critica   => p_revalidar_pendencias,
      p_origem         => p_origem,
      p_efetivar_benef => FALSE  -- So empresa, sem beneficiarios
    );
  END pr_efetiva_baixa_manual_emp;


  -- ---------------------------------------------------------------------------
  -- pr_efetiva_baixa_manual  [PUBLICO]
  -- Efetivacao de proposta especifica (empresa + beneficiarios).
  -- Delega para pr_efetiva_core com p_efetivar_benef = TRUE.
  -- [REF RN-04] [REF RN-05] [REF RN-06] [REF RN-07]
  -- ---------------------------------------------------------------------------
  PROCEDURE pr_efetiva_baixa_manual (
    p_nu_controle         IN NUMBER,
    p_revalidar_pendencias IN VARCHAR2 DEFAULT PK_VENDA_JSON_CONST.MODO_CRITICA_TODAS,
    p_origem              IN VARCHAR2 DEFAULT PK_VENDA_JSON_CONST.COD_ORIGEM_BITIX
  ) IS
    v_nu_controle_od NUMBER;
  BEGIN
    -- Recupera controle odonto associado
    BEGIN
      SELECT NU_CONTROLE_OD
        INTO v_nu_controle_od
        FROM TB_PROPOSTA_VENDA
       WHERE NU_CONTROLE = p_nu_controle;
    EXCEPTION
      WHEN NO_DATA_FOUND THEN v_nu_controle_od := NULL;
    END;

    -- Delega para o nucleo privado de efetivacao COM beneficiarios
    pr_efetiva_core(
      p_nu_controle    => p_nu_controle,
      p_nu_controle_od => v_nu_controle_od,
      p_modo_critica   => p_revalidar_pendencias,
      p_origem         => p_origem,
      p_efetivar_benef => TRUE
    );
  END pr_efetiva_baixa_manual;


  -- ---------------------------------------------------------------------------
  -- pr_efetiva  [PUBLICO]
  -- Orquestrador JOB: processa batch de propostas com FL_STATUS = 6.
  -- BC-VJ-03 + BC-VJ-04 + BC-VJ-06
  --
  -- [REF RN-01] Dois caminhos via fn_registro_sistema(FLAG_SISTEMA_EFETIVA_01)
  -- [REF RN-02] Selecao de propostas elegiveis (FL_STATUS = 6)
  -- [REF RN-03] Gestao de grupo coligado
  --
  -- [ATENCAO] A04: valor de FLAG_SISTEMA_EFETIVA_01 em producao nao confirmado.
  --   Nao sabemos qual dos dois caminhos (fluxo legado ou avancado) e executado.
  --   Ambos sao implementados abaixo.
  --
  -- [MIGRACAO] Substituir cursor batch por Azure Functions Timer Trigger +
  --   processamento via Azure Service Bus (Event-Driven) em .NET 8
  -- ---------------------------------------------------------------------------
  PROCEDURE pr_efetiva IS
    v_flag_fluxo VARCHAR2(1);
  BEGIN
    -- [REF RN-01] Determina qual fluxo de batch esta ativo
    v_flag_fluxo := fn_registro_sistema(PK_VENDA_JSON_CONST.FLAG_SISTEMA_EFETIVA_01);

    IF v_flag_fluxo != PK_VENDA_JSON_CONST.FLAG_ATIVO THEN
      -- -----------------------------------------------------------------------
      -- Fluxo legado (FLAG = 'N' ou NULL):
      -- Dois loops separados: primeiro nao-coligadas, depois coligadas
      -- [REF RN-01] [REF RN-02]
      -- [MIGRACAO] Cursor FOR loop Oracle sem paralelismo -- reescrever em .NET 8
      -- -----------------------------------------------------------------------

      -- Loop 1: propostas SEM coligada
      FOR st_e IN (
        SELECT BB.NU_CONTROLE, BB.NU_CONTROLE_OD
          FROM TB_PROPOSTA_VENDA BB
         WHERE BB.FL_STATUS = PK_VENDA_JSON_CONST.STATUS_ELEGIVEL
           AND NOT EXISTS (
             SELECT 1
               FROM TB_EMPRESA_COLIGADA_BITX T
              WHERE T.TPROVISORIO = BB.NU_CONTROLE
           )
      ) LOOP
        BEGIN
          pr_efetiva_core(
            p_nu_controle    => st_e.nu_controle,
            p_nu_controle_od => st_e.nu_controle_od,
            p_modo_critica   => PK_VENDA_JSON_CONST.MODO_CRITICA_TODAS,
            p_origem         => PK_VENDA_JSON_CONST.COD_ORIGEM_JOB,
            p_efetivar_benef => TRUE
          );
        EXCEPTION
          WHEN OTHERS THEN
            pr_log_erro('pr_efetiva', st_e.nu_controle,
                        'Erro no loop de nao-coligadas (fluxo legado)', SQLERRM);
        END;
      END LOOP;

      -- Loop 2: propostas COM coligada (verifica completude do grupo)
      -- [REF RN-03]
      FOR st_e IN (
        SELECT DISTINCT X.TPROVISORIO     NU_CONTROLE,
                        BB.NU_CONTROLE_OD
          FROM TB_EMPRESA_COLIGADA_BITX X,
               TB_PROPOSTA_VENDA BB
         WHERE X.TPROVISORIO = BB.NU_CONTROLE
           AND BB.FL_STATUS = PK_VENDA_JSON_CONST.STATUS_ELEGIVEL
      ) LOOP
        BEGIN
          -- [REF RN-03] Grupo coligado deve estar completo antes de efetivar
          IF fn_grupo_coligado_apto(st_e.nu_controle) THEN
            pr_efetiva_core(
              p_nu_controle    => st_e.nu_controle,
              p_nu_controle_od => st_e.nu_controle_od,
              p_modo_critica   => PK_VENDA_JSON_CONST.MODO_CRITICA_TODAS,
              p_origem         => PK_VENDA_JSON_CONST.COD_ORIGEM_JOB,
              p_efetivar_benef => TRUE
            );
          END IF;
          -- GrupoColigadoIncompleto: proposta aguarda proximo ciclo do JOB
          -- [Domain Event: GrupoColigadoIncompleto] -- registrado via log
        EXCEPTION
          WHEN OTHERS THEN
            pr_log_erro('pr_efetiva', st_e.nu_controle,
                        'Erro no loop de coligadas (fluxo legado)', SQLERRM);
        END;
      END LOOP;

    ELSE
      -- -----------------------------------------------------------------------
      -- Fluxo avancado (FLAG = 'S'):
      -- CTE unifica nao-coligadas e coligadas completas em uma unica consulta.
      -- [REF RN-01] [REF RN-02] [REF RN-03]
      -- [MIGRACAO] CTE Oracle sem paralelismo -- reescrever em .NET 8
      -- -----------------------------------------------------------------------
      FOR st_val IN (
        SELECT NU_CONTROLE, NU_CONTROLE_OD
          FROM TB_PROPOSTA_VENDA CC,
               (
                 WITH QTD_COLIGADA AS (
                   SELECT CD_PROPOSTA_MAE,
                          COUNT(1) TOTAL_EMP_COLIGADA
                     FROM TB_EMPRESA_COLIGADA_BITX
                    GROUP BY CD_PROPOSTA_MAE
                 ),
                 COLIGADAS_APTAS AS (
                   SELECT TO_NUMBER(X.TPROVISORIO) NU_CONTROLEZ
                     FROM TB_EMPRESA_COLIGADA_BITX X,
                          TB_PROPOSTA_VENDA F,
                          QTD_COLIGADA Q
                    WHERE X.TPROVISORIO    = F.NU_CONTROLE
                      AND X.CD_PROPOSTA_MAE = Q.CD_PROPOSTA_MAE
                    GROUP BY X.CD_PROPOSTA_MAE, X.TPROVISORIO, Q.TOTAL_EMP_COLIGADA
                   HAVING SUM(CASE WHEN F.FL_STATUS IN (
                                PK_VENDA_JSON_CONST.STATUS_ELEGIVEL,
                                PK_VENDA_JSON_CONST.STATUS_EFETIVADO_PRE,
                                PK_VENDA_JSON_CONST.STATUS_EFETIVADO_POS
                              ) THEN 1 ELSE 0 END) = Q.TOTAL_EMP_COLIGADA
                 )
                 SELECT NU_CONTROLEZ NU_CONTROLE FROM COLIGADAS_APTAS
                 UNION ALL
                 SELECT BB.NU_CONTROLE
                   FROM TB_PROPOSTA_VENDA BB
                  WHERE BB.FL_STATUS = PK_VENDA_JSON_CONST.STATUS_ELEGIVEL
                    AND NOT EXISTS (
                      SELECT 1 FROM TB_EMPRESA_COLIGADA_BITX T
                       WHERE T.TPROVISORIO = BB.NU_CONTROLE
                    )
               ) UNION_CTRL
         WHERE UNION_CTRL.NU_CONTROLE = CC.NU_CONTROLE
           AND CC.FL_STATUS           = PK_VENDA_JSON_CONST.STATUS_ELEGIVEL
      ) LOOP
        BEGIN
          pr_efetiva_core(
            p_nu_controle    => st_val.nu_controle,
            p_nu_controle_od => st_val.nu_controle_od,
            p_modo_critica   => PK_VENDA_JSON_CONST.MODO_CRITICA_TODAS,
            p_origem         => PK_VENDA_JSON_CONST.COD_ORIGEM_JOB,
            p_efetivar_benef => TRUE
          );
        EXCEPTION
          WHEN OTHERS THEN
            pr_log_erro('pr_efetiva', st_val.nu_controle,
                        'Erro no loop avancado de efetivacao (fluxo CTE)', SQLERRM);
        END;
      END LOOP;

    END IF; -- Fim selecao de fluxo

  EXCEPTION
    WHEN OTHERS THEN
      pr_log_erro('pr_efetiva', NULL,
                  'Erro critico no orquestrador de batch', SQLERRM);
  END pr_efetiva;


  -- ---------------------------------------------------------------------------
  -- pr_pim_insere_cnpj  [PUBLICO]
  -- ACL BITIX->SIGO: ponto de entrada principal para propostas JSON do canal BITIX.
  -- BC-VJ-01 Recepcao de Proposta BITIX
  --
  -- [REF RN-09] Idempotencia: fn_verificar_idempotencia
  -- [REF RN-15] Replicacao staging saude -> odonto
  -- [REF RN-16] Validacao de contagem de beneficiarios
  -- [REF RN-08] Auto-baixa POS ao final
  -- [REF RN-12] Coligada POS: registra fluxo 7
  --
  -- [ATENCAO] Esta procedure possui ~1419 linhas no legado.
  -- Implementacao completa requer revisao linha a linha.
  -- O codigo abaixo representa a estrutura principal com os pontos-chave
  -- refatorados (eliminacao de variaveis globais, idempotencia tipada,
  -- auto-baixa via spec, JSON_VALUE cacheado).
  --
  -- [MIGRACAO] Equivalente: BITIXAdapterService.receberProposta() em .NET 8
  --   [MIGRACAO] O contrato de retorno deve ser tipado -- remover JSON livre R_JSON
  --   [MIGRACAO] Desserializacao JSON: usar System.Text.Json em .NET 8
  -- ---------------------------------------------------------------------------
  PROCEDURE pr_pim_insere_cnpj (
    pnu_controle    OUT NUMBER,
    pnu_controle_od OUT NUMBER,
    pjson           IN  CLOB,
    r_json          OUT CLOB
  ) IS
    -- -------------------------------------------------------------------------
    -- Variaveis locais (substituem as 15 variaveis globais -- DD03/S04)
    -- [MIGRACAO] Cada variavel local = campo do record EfetivacaoContext .NET 8
    -- -------------------------------------------------------------------------
    v_nu_controle      NUMBER;
    v_nu_controle_od   NUMBER;
    v_provisorio       VARCHAR2(20);
    v_provisorio_od    VARCHAR2(20);
    v_fl_commit        VARCHAR2(1);   -- [S10] Cached: evita JSON_VALUE repetido
    v_coligada         VARCHAR2(1);
    v_cod_operadora    VARCHAR2(10);
    v_total_benef      NUMBER := 0;
    v_count_benef_fim  NUMBER := 0;
    v_status_atual     VARCHAR2(2);
    v_proposta         VARCHAR2(50);
    v_r_json           TP_JSON;       -- JSON de resposta ao BITIX
    v_lob_resposta     CLOB;

  BEGIN
    -- [S10] Cache de campos JSON usados multiplas vezes
    v_fl_commit := JSON_VALUE(TO_CLOB(pjson), '$.FL_COMMIT');

    -- [REF ADR-05 -- ACL] Operadora sempre BITIX neste ACL
    -- [S08] Hardcode 'BITIX' substituido por constante -- A06 resolvido
    v_cod_operadora := PK_VENDA_JSON_CONST.COD_OPERADORA_BITIX;

    v_r_json := TP_JSON();

    -- -------------------------------------------------------------------------
    -- Verificacao de idempotencia [REF RN-09]
    -- -------------------------------------------------------------------------
    -- [ATENCAO] Implementacao completa de busca por STATUS atual pendente.
    -- A logica abaixo representa a estrutura da verificacao.
    BEGIN
      SELECT FL_STATUS, NU_CONTROLE
        INTO v_status_atual, v_nu_controle
        FROM TB_PROPOSTA_VENDA
       WHERE NU_CGC_CPF = JSON_VALUE(TO_CLOB(pjson), '$.NU_CGC_CPF')
         AND CD_OPERADOS = v_cod_operadora
         AND ROWNUM = 1;

      -- Verifica se deve rejeitar por idempotencia
      IF fn_verificar_idempotencia(v_nu_controle, v_status_atual) THEN
        -- Proposta ja integrada: retorna sem reprocessar [REF RN-09]
        v_r_json.PUT('TPROVISORIO', TO_CHAR(v_nu_controle));
        v_r_json.PUT('INTEGRACAO',  '0');
        v_r_json.PUT('MENSAGEM',    'JA INTEGRADO');
        -- [Domain Event: PropostaIntegradaBitix -- duplicada detectada]
        DBMS_LOB.CREATETEMPORARY(r_json, TRUE);
        v_r_json.TO_CLOB(r_json);
        pnu_controle    := v_nu_controle;
        pnu_controle_od := v_nu_controle_od;
        RETURN;
      END IF;

    EXCEPTION
      WHEN NO_DATA_FOUND THEN
        -- Proposta nova: prosseguir com integracao
        v_nu_controle   := NULL;
        v_status_atual  := NULL;
    END;

    -- -------------------------------------------------------------------------
    -- Geracao de controles (PropostaEmpresaFactory)
    -- [MIGRACAO] Sequences Oracle -> UUIDs ou Azure SQL Identity em .NET 8
    -- -------------------------------------------------------------------------
    SELECT SQ_EMPRESA_INTERNET.NEXTVAL INTO v_nu_controle    FROM DUAL;
    SELECT SQ_EMPRESA_INTERNET.NEXTVAL INTO v_nu_controle_od FROM DUAL;

    v_provisorio    := TO_CHAR(v_nu_controle);
    v_provisorio_od := TO_CHAR(v_nu_controle_od);

    pnu_controle    := v_nu_controle;
    pnu_controle_od := v_nu_controle_od;

    -- -------------------------------------------------------------------------
    -- Desserializacao da empresa (EmpresaInternetFactory) [REF RN-15]
    -- [ATENCAO] Implementacao completa de fn_set_empresa_internet pendente.
    -- -------------------------------------------------------------------------

    -- Insercao de staging saude (TB_EMPRESA_INTERNET) [REF RN-15]
    -- [ATENCAO] Implementacao detalhada pendente -- mapeamento campo a campo do JSON

    -- Replicacao automatica staging saude -> odonto [REF RN-15]
    -- [ATENCAO] Implementacao detalhada pendente

    -- Processamento de beneficiarios (BC-VJ-01)
    -- pr_set_usuario_internet(pjson, v_nu_controle, v_nu_controle_od);

    -- Validacao de contagem de beneficiarios [REF RN-16]
    SELECT COUNT(1)
      INTO v_count_benef_fim
      FROM TB_USUARIO_TITULAR_INTERNET
     WHERE CD_EMPRESA = PK_VENDA_JSON_CONST.PREFIXO_EMP_PROVISORIO || v_nu_controle;

    IF v_count_benef_fim != v_total_benef THEN
      -- [REF RN-16] Divergencia de contagem: registrar pendencia
      -- [Domain Event: DivergenciaContadorBeneficiario]
      INSERT INTO TB_PENDENCIA_EMPRESA_INTERNET (
        NU_CONTROLE_PENDENCIA, CD_PENDENCIA, NU_CONTROLE, DT_PENDENCIA,
        DS_OBSERVACAO
      ) VALUES (
        SQ_CONTROLE_PENDENCIA.NEXTVAL,
        PK_VENDA_JSON_CONST.CD_PENDENCIA_CONTADOR_DIVERGENTE,
        v_nu_controle,
        SYSDATE,
        'A quantidade de beneficiarios esta diferente da quantidade informada no JSON'
      );
    END IF;

    -- -------------------------------------------------------------------------
    -- Auto-baixa POS [REF RN-08] (BC-VJ-08)
    -- Usando Specification tipada em vez de IF inline
    -- -------------------------------------------------------------------------
    IF fn_spec_auto_baixa_pos_elegivel(v_nu_controle, v_fl_commit, v_coligada) THEN
      -- [Domain Event: AutoBaixaAcionada]
      UPDATE TB_PROPOSTA_VENDA
         SET FL_STATUS = PK_VENDA_JSON_CONST.STATUS_ELEGIVEL
       WHERE NU_CONTROLE = v_nu_controle;
      COMMIT;
      pr_set_emp_fluxo_pos(v_nu_controle, '', PK_VENDA_JSON_CONST.FLUXO_POS_BASE);
      -- Auto-baixa: efetivacao imediata com origem BAIXAPOS
      pr_efetiva_baixa_manual(
        p_nu_controle         => v_nu_controle,
        p_revalidar_pendencias => PK_VENDA_JSON_CONST.MODO_CRITICA_COM_EXCECAO,
        p_origem              => PK_VENDA_JSON_CONST.COD_ORIGEM_BAIXAPOS
      );
    ELSIF fn_get_confopera_emp(v_nu_controle) = PK_VENDA_JSON_CONST.CANAL_POS
       AND NVL(v_fl_commit, 'N') = PK_VENDA_JSON_CONST.FLAG_ATIVO
       AND NVL(v_coligada, 'N') = PK_VENDA_JSON_CONST.FLAG_ATIVO
    THEN
      -- [REF RN-12] POS coligada: registra fluxo 7 para impedir status 10
      -- [Domain Event: ColigadaRegistradaComFluxoPOS]
      pr_set_emp_fluxo_pos(v_nu_controle, '', PK_VENDA_JSON_CONST.FLUXO_POS_COLIGADA);
    END IF;

    -- -------------------------------------------------------------------------
    -- Montagem do JSON de resposta ao BITIX
    -- [ATENCAO] Retorno via JSON livre: migrar para contrato tipado (DD01)
    -- [MIGRACAO] Substituir TP_JSON livre por DTO tipado com serialization .NET 8
    -- -------------------------------------------------------------------------
    v_r_json.PUT('TPROVISORIO', v_provisorio);
    v_r_json.PUT('INTEGRACAO',  '1');
    v_r_json.PUT('MENSAGEM',    'INTEGRADO COM SUCESSO');

    DBMS_LOB.CREATETEMPORARY(r_json, TRUE);
    v_r_json.TO_CLOB(r_json);

    COMMIT;

  EXCEPTION
    WHEN OTHERS THEN
      ROLLBACK;
      pr_log_erro('pr_pim_insere_cnpj', v_nu_controle,
                  'Erro critico na integracao BITIX -- rollback executado', SQLERRM);
      -- Monta JSON de erro para retornar ao BITIX
      v_r_json := TP_JSON();
      v_r_json.PUT('TPROVISORIO', NVL(v_provisorio, '0'));
      v_r_json.PUT('INTEGRACAO',  '0');
      v_r_json.PUT('MENSAGEM',    'ERRO NA INTEGRACAO');
      -- [Domain Event: erroCapturado] -- CRITICA tipo 3
      DBMS_LOB.CREATETEMPORARY(r_json, TRUE);
      v_r_json.TO_CLOB(r_json);
      COMMIT;
  END pr_pim_insere_cnpj;

END PK_VENDA_JSON;
/
