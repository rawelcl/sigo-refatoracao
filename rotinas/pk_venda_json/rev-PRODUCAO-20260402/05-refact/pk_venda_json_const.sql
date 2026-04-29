-- =============================================================================
-- Package: PK_VENDA_JSON_CONST
-- Schema : HUMASTER
-- Versao : rev-PRODUCAO-20260402
-- Data   : 22/04/2026
-- Origem : Codigo inicial refatorado -- Etapa 5 (Agente DDD)
--
-- Propósito:
--   Eliminar valores magicos e hardcodes identificados na engenharia reversa
--   de PK_VENDA_JSON (Smells S08, A06, A08 e outros).
--
-- Baseado em:
--   reversa-pk-venda-json.md (rev-PRODUCAO-20260402)
--   ddd-modelagem-dominio.md (rev-PRODUCAO-20260402)
--
-- ADRs:
--   [REF ADR-21 -- Linguagem Onipresente]: nomes alinhados com linguagem de negocio
--
-- [MIGRACAO] Este package de constantes corresponde, em uma futura migracao
--   para microsservico, a enums e classes de valor imutavel em .NET 8.
--   Ex: StatusPropostaBitix.Elegivel, OrigemEfetivacao.Tela, FluxoPOS.Coligada
-- =============================================================================

CREATE OR REPLACE PACKAGE HUMASTER.PK_VENDA_JSON_CONST AS

  -- ---------------------------------------------------------------------------
  -- Origens de Efetivacao (Value Object: OrigemEfetivacao)
  -- Conjunto fechado de valores que identificam o canal que acionou a efetivacao.
  -- [REF RN-07] Status final depende da origem (fn_get_confopera_emp + origem)
  -- [ATENCAO] A06: sem constantes no codigo legado -- S08 eliminado aqui
  -- ---------------------------------------------------------------------------
  COD_ORIGEM_TELA     CONSTANT VARCHAR2(5)  := 'T229B';    -- Tela operacional T229B
  COD_ORIGEM_JOB      CONSTANT VARCHAR2(3)  := 'JOB';      -- Execucao por JOB agendado
  COD_ORIGEM_BITIX    CONSTANT VARCHAR2(5)  := 'BITIX';    -- Canal de vendas externo BITIX
  COD_ORIGEM_BAIXAPOS CONSTANT VARCHAR2(7)  := 'BAIXAPOS'; -- Auto-baixa POS (NDI Minas)
  COD_ORIGEM_BPR      CONSTANT VARCHAR2(3)  := 'BPR';      -- Origem BPR

  -- ---------------------------------------------------------------------------
  -- Status da Proposta BITIX (Value Object: StatusProposta)
  -- Maquina de estados definida em TB_PROPOSTA_VENDA.FL_STATUS.
  -- Transicoes validas: ver RN02, RN07, RN09 na eng. reversa.
  -- [MIGRACAO] Equivalente: enum StatusPropostaBitix em microsservico .NET 8
  -- ---------------------------------------------------------------------------
  STATUS_AGUARDANDO       CONSTANT NUMBER(2) := 0;  -- Staging criado, aguardando processamento
  STATUS_DEVOLVIDO        CONSTANT NUMBER(2) := 1;  -- Devolvida para reanalize pelo operador
  STATUS_EM_ANALISE       CONSTANT NUMBER(2) := 2;  -- Em analise interna
  STATUS_AGUARDANDO_ADM   CONSTANT NUMBER(2) := 3;  -- Aguardando acao administrativa
  STATUS_CANCELADO        CONSTANT NUMBER(2) := 4;  -- Cancelada (BITIX resposta 'DEVOLVIDO')
  STATUS_ELEGIVEL         CONSTANT NUMBER(2) := 6;  -- Elegivel para efetivacao automatica [REF RN-02]
  STATUS_EFETIVADO_PRE    CONSTANT NUMBER(2) := 7;  -- Efetivado PRE ou POS com ressalvas [REF RN-07]
  STATUS_CANCELADO_FINAL  CONSTANT NUMBER(2) := 8;  -- Cancelada definitivamente
  STATUS_COM_ERRO         CONSTANT NUMBER(2) := 9;  -- Efetivacao com criticas/erro [REF RN-04]
  STATUS_EFETIVADO_POS    CONSTANT NUMBER(2) := 10; -- Efetivado POS caminho feliz [REF RN-07]

  -- ---------------------------------------------------------------------------
  -- Codigos de Fluxo POS (Value Object: FluxoPOSRastreamento)
  -- Registrados em TB_PIM_FLUXO_POS via pr_set_emp_fluxo_pos.
  -- Utilizados para rastrear impedimentos de auto-baixa.
  -- [REF RN-07] [REF RN-12] [REF RN-13] [REF RN-14]
  -- [MIGRACAO] Equivalente: enum FluxoPOSRastreamento em microsservico .NET 8
  -- ---------------------------------------------------------------------------
  FLUXO_POS_COLIGADA  CONSTANT NUMBER(2) := 7;  -- Proposta pertence a grupo coligado [REF RN-12]
  FLUXO_POS_BASE      CONSTANT NUMBER(2) := 10; -- Proposta POS base (sem impedimentos)
  FLUXO_POS_NEOWAY    CONSTANT NUMBER(2) := 17; -- Beneficiario com pendencia Neoway [REF RN-14]
  FLUXO_POS_BLOCKLIST CONSTANT NUMBER(2) := 99; -- Documento em blocklist BITIX [REF RN-13]

  -- ---------------------------------------------------------------------------
  -- Flags de Configuracao do Sistema (fn_registro_sistema)
  -- Controlam o comportamento de execucao por parametro configuravel.
  -- [REF RN-01] [REF RN-09]
  -- [ATENCAO] A04: valor de FLAG_SISTEMA_EFETIVA_01 em producao nao confirmado --
  --           determina qual dos dois fluxos de pr_efetiva esta ativo.
  -- ---------------------------------------------------------------------------
  FLAG_SISTEMA_EFETIVA_01  CONSTANT VARCHAR2(50) := 'PK_VENDA_JSON_PR_EFETIVA_01';
  FLAG_SISTEMA_RESPOSTA_01 CONSTANT VARCHAR2(50) := 'PK_VENDA_JSON_RESPOSTA_BITIX_01';
  FLAG_SISTEMA_NEOWAY_01   CONSTANT VARCHAR2(50) := 'PK_VENDA_JSON_EXECUTA_NEOWAY';

  -- Flag ativa (retorno de fn_registro_sistema)
  FLAG_ATIVO   CONSTANT VARCHAR2(1) := 'S';
  FLAG_INATIVO CONSTANT VARCHAR2(1) := 'N';

  -- ---------------------------------------------------------------------------
  -- Canal de Vendas BITIX (Anti-Corruption Layer)
  -- Identifica o operador externo BITIX no sistema SIGO.
  -- [REF ADR-05 -- Padrao ACL]: pr_pim_insere_cnpj e o ACL canonico BITIX->SIGO
  -- [ATENCAO] A06: hardcode 'BITIX' em V_COD_OPERADORA eliminado -- S08 resolvido
  -- ---------------------------------------------------------------------------
  COD_OPERADORA_BITIX CONSTANT VARCHAR2(5) := 'BITIX';

  -- ---------------------------------------------------------------------------
  -- Empresa Middle: codigo especial para cobranca separada (sem conta conjunta)
  -- Utilizado em pr_efetiva_baixa_manual / pr_efetiva_baixa_manual_emp.
  -- [REF RN-11] Middle (30-99 empregados) sem conta conjunta odonto
  -- [ATENCAO] A08: valor '-999' e um valor magico sem documentacao oficial --
  --           encapsulado aqui ate confirmacao com o PO
  -- [MIGRACAO] Substituir por regra explícita de dominio em microsservico
  -- ---------------------------------------------------------------------------
  COD_EMPRESA_PAI_MIDDLE_SEM_CONTA CONSTANT VARCHAR2(4) := '-999';

  -- Faixa de empregados para classificacao Middle
  NU_EMPREGADOS_MIDDLE_MIN CONSTANT NUMBER(3) := 30;
  NU_EMPREGADOS_MIDDLE_MAX CONSTANT NUMBER(3) := 99;

  -- ---------------------------------------------------------------------------
  -- Prefixo de Empresa Provisoria (cd_empresa em staging)
  -- Convencao: cd_empresa em staging = 'T' || nu_controle.
  -- [ATENCAO] S09: convencao fragil encapsulada como constante para facilitar
  --           busca e modificacao futura.
  -- [MIGRACAO] Eliminar este prefixo -- usar identidade separada no microsservico
  -- ---------------------------------------------------------------------------
  PREFIXO_EMP_PROVISORIO CONSTANT VARCHAR2(1) := 'T';

  -- ---------------------------------------------------------------------------
  -- Motor de Criticas: modos de validacao (Domain Service: MotorCriticasQuery)
  -- [REF RN-04] fn_get_criticas_pendencias recebe p_revalidar_pendencias
  -- [REF ADR-03 -- CQRS]: modos sao usados pela query (leitura); o command
  --   (pr_aplicar_status_erro_command) nao depende destes modos
  -- ---------------------------------------------------------------------------
  MODO_CRITICA_SOMENTE_CRITICAS CONSTANT VARCHAR2(1) := 'N'; -- Apenas criticas, sem pendencias
  MODO_CRITICA_COM_EXCECAO      CONSTANT VARCHAR2(1) := 'E'; -- Criticas + pendencias de excecao
  MODO_CRITICA_TODAS            CONSTANT VARCHAR2(1) := 'S'; -- Criticas + todas as pendencias

  -- Pendencias que entram no modo EXCECAO (p_revalidar_pendencias = 'E')
  CD_PENDENCIA_ASSOCIACAO CONSTANT NUMBER(2) := 1;  -- Pendencia de associacao/sindicato
  CD_PENDENCIA_NEOWAY_EXC CONSTANT NUMBER(2) := 12; -- Pendencia Neoway modo excecao

  -- Status do beneficiario indicando pendencia Neoway
  STATUS_BENEF_NEOWAY CONSTANT VARCHAR2(2) := '17'; -- [REF RN-14]

  -- ---------------------------------------------------------------------------
  -- Codigo de pendencia para divergencia de contador de beneficiarios
  -- [REF RN-16] Inserido em TB_PENDENCIA_EMPRESA_INTERNET quando
  --   COUNT(beneficiarios staging) != G_TOTAL_BENEFICIARIO do JSON
  -- ---------------------------------------------------------------------------
  CD_PENDENCIA_CONTADOR_DIVERGENTE CONSTANT NUMBER(2) := 9;

  -- ---------------------------------------------------------------------------
  -- POSBAIXA (POS): proposta cujo fluxo de conferencia documental ocorre APOS a efetivacao
  -- PRE: fluxo padrao, conferencia ocorre ANTES da efetivacao
  -- fn_get_confopera_emp retorna 1 para POSBAIXA, 0 para PRE
  -- [REF RN-07] [REF RN-08]
  -- ---------------------------------------------------------------------------
  CANAL_POS CONSTANT NUMBER(1) := 1;
  CANAL_PRE CONSTANT NUMBER(1) := 0;

END PK_VENDA_JSON_CONST;
/
