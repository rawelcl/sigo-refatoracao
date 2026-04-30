CREATE OR REPLACE PACKAGE pk_pr_critica_internet_saude_15 AS
  -- Valida idade dos beneficiários
  PROCEDURE pr_validar_idade(p_idade IN NUMBER, p_tipo_beneficiario IN VARCHAR2);

  -- Registra críticas na tabela de críticas
  PROCEDURE pr_registrar_critica(p_beneficiario_id IN NUMBER, p_critica IN VARCHAR2);
END pk_pr_critica_internet_saude_15;
/