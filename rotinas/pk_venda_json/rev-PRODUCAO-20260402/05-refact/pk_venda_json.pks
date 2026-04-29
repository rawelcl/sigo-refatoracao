-- =============================================================================
-- Package Spec: PK_VENDA_JSON
-- Schema      : HUMASTER
-- Versao      : rev-PRODUCAO-20260402
-- Data        : 22/04/2026
-- Origem      : Codigo inicial refatorado -- Etapa 5 (Agente DDD)
--
-- Bounded Contexts:
--   BC-VJ-01  Recepcao de Proposta BITIX (ACL canonico BITIX->SIGO)
--   BC-VJ-02  Validacao e Critica BITIX (Motor de Criticas -- CQRS)
--   BC-VJ-03  Efetivacao Empresa BITIX
--   BC-VJ-04  Efetivacao Beneficiarios BITIX
--   BC-VJ-05  Gestao de Status Final
--   BC-VJ-06  Grupo Coligado BITIX
--   BC-VJ-07  Mapeamento Saude-Odonto
--   BC-VJ-08  Auto-baixa POS
--
-- Decisoes aplicadas nesta spec:
--   DD01 -- Separar ACL de efetivacao
--          [REF ADR-05 -- Padrao ACL]
--   DD03 -- Eliminar estado global de package (15 variaveis)
--          [REF ADR-74 -- DDD]: critico S04 -- variaveis globais mutaveis
--   DD04 -- CQRS: fn_motor_criticas_query separada de pr_aplicar_status_erro_command
--          [REF ADR-03 -- CQRS]
--   DD05 -- Contrato tipado via TYPE RECORD para contexto de efetivacao
--          [REF ADR-22 -- Padrao Repositorio]: parametros tipados em vez de parsing
--
-- Baseado em:
--   reversa-pk-venda-json.md (rev-PRODUCAO-20260402)
--   ddd-modelagem-dominio.md (rev-PRODUCAO-20260402)
--
-- [MIGRACAO] Esta spec expoe a Application Layer do package.
--   No microsservico, cada rotina publica desta spec corresponde a um
--   endpoint ou command handler do EfetivacaoBitixService.
-- =============================================================================

CREATE OR REPLACE PACKAGE HUMASTER.PK_VENDA_JSON AS

  -- ===========================================================================
  -- SECAO 1: TIPOS DE DOMINIO
  -- Eliminam o parsing fragil de strings (S03/A05) e encapsulam o contexto
  -- de execucao das rotinas de efetivacao (DD05).
  -- [REF ADR-74 -- DDD]: agregados representados como TYPE RECORD
  -- [MIGRACAO] t_resultado_efetivacao -> classe ResultadoEfetivacao em .NET 8
  -- ===========================================================================

  -- Resultado tipado do cadastramento de empresa (substitui o parsing de w_erro)
  -- [REF RN-05] Elimina substr/instr em w_erro de pr_cadastramento_empresa_prov
  -- [ATENCAO] S03: a implementacao completa depende da refatoracao de
  --           pr_cadastramento_empresa_prov para expor OUT tipados.
  --           Ate la, a conversao e feita internamente no body.
  TYPE t_resultado_empresa IS RECORD (
    cd_empresa        VARCHAR2(20),  -- Codigo definitivo da empresa cadastrada (NULL se erro)
    fl_sucesso        BOOLEAN,       -- TRUE se empresa cadastrada com sucesso
    ds_erro           VARCHAR2(4000) -- Descricao do erro (quando fl_sucesso = FALSE)
  );

  -- Contexto de execucao de uma efetivacao individual
  -- Passado entre rotinas privadas para eliminar estado global (S04/DD03)
  -- [MIGRACAO] Equivalente: record EfetivacaoContext em Application Layer .NET 8
  TYPE t_contexto_efetivacao IS RECORD (
    nu_controle       NUMBER,         -- Controle saude da proposta
    nu_controle_od    NUMBER,         -- Controle odonto (NULL se sem odonto)
    p_origem          VARCHAR2(10),   -- OrigemEfetivacao: T229B, JOB, BITIX, BAIXAPOS, BPR
    p_revalidar       VARCHAR2(1),    -- Modo do motor de criticas (N/E/S)
    cd_empresa        VARCHAR2(20),   -- Preenchido apos pr_cadastramento_empresa_prov
    fl_erro           BOOLEAN,        -- TRUE se houve erro critico na efetivacao
    ds_erro           VARCHAR2(4000)  -- Descricao do erro para log
  );

  -- ===========================================================================
  -- SECAO 2: CONTRATOS PUBLICOS (Application Layer -- BC-VJ-01 a BC-VJ-08)
  --
  -- Regras de compatibilidade com chamadores existentes:
  --   - PR_EFETIVA_INTERNET chama PK_VENDA_JSON.pr_efetiva (confirmado via CVS)
  --   - T229B chama pr_efetiva_baixa_manual com p_origem='T229B'
  --   - BITIX externo chama pr_pim_insere_cnpj diretamente
  -- ===========================================================================

  -- ---------------------------------------------------------------------------
  -- pr_efetiva
  -- Orquestrador JOB: processa em batch todas as propostas com FL_STATUS = 6.
  -- BC-VJ-03 Efetivacao Empresa BITIX + BC-VJ-04 Efetivacao Beneficiarios BITIX
  --
  -- [REF RN-01] Dois caminhos via fn_registro_sistema(FLAG_SISTEMA_EFETIVA_01)
  -- [REF RN-02] Selecao de propostas elegiveis: FL_STATUS = 6
  -- [REF RN-03] Grupo coligado completo antes de efetivar
  -- [MIGRACAO] Equivalente: EfetivacaoBatchJob no Azure Functions com Timer Trigger
  -- ---------------------------------------------------------------------------
  PROCEDURE pr_efetiva;

  -- ---------------------------------------------------------------------------
  -- pr_efetiva_baixa_manual
  -- Efetivacao de proposta especifica: manual (T229B), auto-baixa (BAIXAPOS),
  -- batch (BPR) ou chamada direta.
  --
  -- Parametros:
  --   p_nu_controle        : Controle saude da proposta a efetivar
  --   p_revalidar_pendencias: Modo do motor de criticas (N=so criticas, E=excecao, S=todas)
  --   p_origem             : OrigemEfetivacao (T229B, JOB, BITIX, BAIXAPOS, BPR)
  --
  -- [REF RN-04] Motor de criticas antes de efetivar
  -- [REF RN-05] Efetivacao via pr_cadastramento_empresa_prov
  -- [REF RN-06] Loop de titulares: critica + efetivacao individual
  -- [REF RN-07] Status final: 7 (PRE/POS ressalva) ou 10 (POS limpo)
  -- [MIGRACAO] Equivalente: EfetivacaoEspecificaService.efetivar() em .NET 8
  -- ---------------------------------------------------------------------------
  PROCEDURE pr_efetiva_baixa_manual (
    p_nu_controle         IN NUMBER,
    p_revalidar_pendencias IN VARCHAR2 DEFAULT PK_VENDA_JSON_CONST.MODO_CRITICA_TODAS,
    p_origem              IN VARCHAR2 DEFAULT PK_VENDA_JSON_CONST.COD_ORIGEM_BITIX
  );

  -- ---------------------------------------------------------------------------
  -- pr_efetiva_baixa_manual_emp
  -- Efetivacao apenas da empresa (sem beneficiarios) -- especifico para BITIX.
  -- Utilizado quando o BITIX necessita efetivar a empresa em etapa separada.
  --
  -- [REF RN-05] Efetivacao via pr_cadastramento_empresa_prov
  -- [REF RN-07] Status final sem loop de beneficiarios
  -- ---------------------------------------------------------------------------
  PROCEDURE pr_efetiva_baixa_manual_emp (
    p_nu_controle         IN NUMBER,
    p_revalidar_pendencias IN VARCHAR2 DEFAULT PK_VENDA_JSON_CONST.MODO_CRITICA_TODAS,
    p_origem              IN VARCHAR2 DEFAULT PK_VENDA_JSON_CONST.COD_ORIGEM_BITIX
  );

  -- ---------------------------------------------------------------------------
  -- pr_pim_insere_cnpj
  -- Ponto de entrada do ACL BITIX->SIGO: recebe proposta JSON completa,
  -- desserializa, persiste staging, retorna JSON de resposta.
  -- BC-VJ-01 Recepcao de Proposta BITIX
  --
  -- Parametros:
  --   pnu_controle : OUT -- Numero de controle saude gerado (ControleProvisorio VO)
  --   pnu_controle_od: OUT -- Numero de controle odonto gerado (pode ser NULL)
  --   pjson        : IN  -- JSON CLOB com dados completos da proposta BITIX
  --   r_json       : OUT -- JSON CLOB de resposta (TPROVISORIO, INTEGRACAO, MENSAGEM, MOTIVOS)
  --
  -- [REF RN-09] Idempotencia: proposta ja integrada nao e reprocessada
  -- [REF RN-15] Replicacao automatica staging saude -> odonto
  -- [REF RN-16] Validacao de contagem de beneficiarios vs JSON
  -- [MIGRACAO] Equivalente: BITIXAdapterService.receberProposta() em .NET 8
  --   [MIGRACAO] O contrato de retorno deve ser tipado -- remover JSON livre
  -- ---------------------------------------------------------------------------
  PROCEDURE pr_pim_insere_cnpj (
    pnu_controle    OUT NUMBER,
    pnu_controle_od OUT NUMBER,
    pjson           IN  CLOB,
    r_json          OUT CLOB
  );

  -- ---------------------------------------------------------------------------
  -- pr_set_usuario_internet
  -- Insere beneficiarios do JSON em staging:
  --   TB_USUARIO_TITULAR_INTERNET e TB_USUARIO_DEPENDENTE_INTERNET.
  -- BC-VJ-01 (parte de desserializacao de beneficiarios)
  --
  -- [MIGRACAO] Equivalente: BeneficiarioRepository.persistirStaging() em .NET 8
  -- ---------------------------------------------------------------------------
  PROCEDURE pr_set_usuario_internet (
    pjson           IN  CLOB,
    pnu_controle    IN  NUMBER,
    pnu_controle_od IN  NUMBER
  );

  -- ---------------------------------------------------------------------------
  -- fn_set_empresa_internet
  -- Desserializa o JSON da empresa para TB_EMPRESA_INTERNET%ROWTYPE.
  -- Factory: EmpresaInternetFactory
  -- BC-VJ-01 (desserializacao de empresa)
  --
  -- [MIGRACAO] Equivalente: EmpresaInternetFactory.fromJson() em .NET 8
  -- ---------------------------------------------------------------------------
  FUNCTION fn_set_empresa_internet (
    pjson        IN CLOB,
    pnu_controle IN NUMBER
  ) RETURN TB_EMPRESA_INTERNET%ROWTYPE;

  -- ---------------------------------------------------------------------------
  -- pr_set_usuario_od
  -- Cria/atualiza registros de beneficiarios odonto em staging.
  -- BC-VJ-07 Mapeamento Saude-Odonto
  --
  -- [REF RN-10] Mapeamento 1:1 controle saude-odonto por beneficiario
  -- ---------------------------------------------------------------------------
  PROCEDURE pr_set_usuario_od (
    pnu_controle    IN NUMBER,
    pnu_controle_od IN NUMBER
  );

  -- ---------------------------------------------------------------------------
  -- pr_control_internet
  -- Gerencia TB_PIM_CONTROLE_CPF: vinculo controle saude <-> odonto por CPF.
  -- BC-VJ-07 Mapeamento Saude-Odonto (MapeamentoSaudeOdontoService)
  --
  -- [REF RN-10] Insert/update do mapeamento 1:1
  -- [MIGRACAO] Equivalente: MapeamentoControleRepository.upsert() em .NET 8
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
  );

  -- ---------------------------------------------------------------------------
  -- fn_get_blocklist_emp
  -- BC-VJ-02 Validacao Blocklist: verifica se proposta tem documento blocklist.
  -- Specification: SemBlocklistSpec
  --
  -- Retorna: 0 = sem blocklist | 1 = ha documento blocklist
  -- [REF RN-13] TB_FILE_DOCUMENTO_BITIX.FL_DOC_BLOCKLIST = 1
  -- ---------------------------------------------------------------------------
  FUNCTION fn_get_blocklist_emp (
    p_nu_controle IN NUMBER
  ) RETURN NUMBER;

  -- ---------------------------------------------------------------------------
  -- fn_get_pend_neoway
  -- BC-VJ-02 Validacao Neoway: verifica pendencias de status 17 em beneficiarios.
  -- Specification: SemPendenciaNeowaySpec
  --
  -- Retorna: 0 = sem pendencia | 1 = ha beneficiario com status Neoway
  -- [REF RN-14] FL_STATUS_PROCESSAMENTO = '17' em titular ou dependente
  -- ---------------------------------------------------------------------------
  FUNCTION fn_get_pend_neoway (
    p_nu_controle IN NUMBER
  ) RETURN NUMBER;

  -- ---------------------------------------------------------------------------
  -- fn_get_criticas_pendencias
  -- Motor de Criticas (BC-VJ-02) -- mantido para compatibilidade com chamadores.
  -- IMPORTANTE: no TO-BE, esta funcao e um WRAPPER sobre:
  --   fn_motor_criticas_query   (leitura -- CQRS Query)
  --   pr_aplicar_status_erro_command (escrita -- CQRS Command, chamado separadamente)
  -- Chamadores diretos desta funcao que passam p_valida_nao_coligada='S' devem
  -- migrar para chamar explicitamente os dois metodos separados.
  --
  -- [REF ADR-03 -- CQRS]: separacao de query e command
  -- [ATENCAO] A09: WHEN OTHERS -> retorna 0, mascarando erros internos.
  --   Risco: empresa pode ser efetivada sem que as criticas tenham sido
  --   avaliadas. Log obrigatorio deve ser implementado no body.
  -- [REF RN-04] Motor de 3 modos: N (so criticas), E (com excecao), S (todas)
  -- [MIGRACAO] Separar em MotorCriticasQuery + AplicarStatusErroCommand no microsservico
  -- ---------------------------------------------------------------------------
  FUNCTION fn_get_criticas_pendencias (
    p_nu_controle           IN NUMBER,
    p_revalidar_pendencias   IN VARCHAR2 DEFAULT PK_VENDA_JSON_CONST.MODO_CRITICA_TODAS,
    p_valida_nao_coligada   IN VARCHAR2 DEFAULT PK_VENDA_JSON_CONST.FLAG_INATIVO
  ) RETURN NUMBER;

END PK_VENDA_JSON;
/
