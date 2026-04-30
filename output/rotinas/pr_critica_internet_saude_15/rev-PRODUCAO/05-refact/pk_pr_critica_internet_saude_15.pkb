CREATE OR REPLACE PACKAGE BODY pk_pr_critica_internet_saude_15 AS

  -- ============================================================
  -- SEÇÃO 1 -- Validação de Idade
  -- ============================================================
  PROCEDURE pr_validar_idade(p_idade IN NUMBER, p_tipo_beneficiario IN VARCHAR2) IS
  BEGIN
    IF p_idade > pk_pr_critica_internet_saude_15_const.C_IDADE_PADRAO THEN
      pr_registrar_critica(NULL, pk_pr_critica_internet_saude_15_const.C_CRITICA_TITULAR);
    END IF;
  END pr_validar_idade;

  -- ============================================================
  -- SEÇÃO 2 -- Registro de Críticas
  -- ============================================================
  PROCEDURE pr_registrar_critica(p_beneficiario_id IN NUMBER, p_critica IN VARCHAR2) IS
  BEGIN
    INSERT INTO tb_usuario_critica_internet (id_beneficiario, ds_critica)
    VALUES (p_beneficiario_id, p_critica);
  END pr_registrar_critica;

END pk_pr_critica_internet_saude_15;
/