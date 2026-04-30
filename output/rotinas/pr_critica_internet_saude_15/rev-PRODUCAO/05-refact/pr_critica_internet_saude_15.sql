CREATE OR REPLACE PROCEDURE pr_critica_internet_saude_15 (
  p_titular    IN tb_usuario_titular_internet%ROWTYPE DEFAULT NULL,
  p_dependente IN tb_usuario_dependente_internet%ROWTYPE DEFAULT NULL
) AS
  -- [REF RN02] Validar idade crítica
  -- [REF RN03] Validar status de processamento
  -- [REF ADR-03] CQRS aplicado
  v_idade_critica NUMBER;
BEGIN
  -- Determinar idade crítica
  IF fn_registro_sistema('HABILITA_65ANOS') = 0 THEN
    v_idade_critica := pr_critica_internet_saude_15_const.C_IDADE_PADRAO;
  ELSE
    v_idade_critica := pr_critica_internet_saude_15_const.C_IDADE_ALTERNATIVA;
  END IF;

  -- Validar titular
  IF p_titular.nu_controle IS NOT NULL AND p_dependente.nu_controle IS NULL THEN
    IF p_titular.tp_operacao = '1' THEN
      IF p_titular.cd_usuario IS NULL AND
         MONTHS_BETWEEN(SYSDATE, p_titular.dt_nascimento) >= v_idade_critica AND
         p_titular.cd_plano NOT IN (1099, 2099) THEN
        INSERT INTO tb_usuario_critica_internet (
          nu_controle, nu_controle_dep, ds_critica, ds_campo
        ) VALUES (
          p_titular.nu_controle, 0,
          pr_critica_internet_saude_15_const.C_CRITICA_TITULAR, NULL
        );
      END IF;
    END IF;
  END IF;

  -- Validar dependente
  IF p_titular.nu_controle IS NOT NULL AND p_dependente.nu_controle IS NOT NULL THEN
    IF p_dependente.fl_status_processamento <> 2 AND
       MONTHS_BETWEEN(SYSDATE, p_dependente.dt_nascimento) >= v_idade_critica THEN
      INSERT INTO tb_usuario_critica_internet (
        nu_controle, nu_controle_dep, ds_critica, ds_campo
      ) VALUES (
        p_titular.nu_controle, p_dependente.nu_controle_dep,
        pr_critica_internet_saude_15_const.C_CRITICA_DEPENDENTE, NULL
      );
    END IF;
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    INSERT INTO tb_usuario_critica_internet (
      nu_controle, nu_controle_dep, ds_critica, ds_campo
    ) VALUES (
      p_dependente.nu_controle, p_dependente.nu_controle_dep,
      'ERRO FATAL pr_critica_internet_saude_15 ' || SUBSTR(SQLERRM, 1, 1024), '???'
    );
END;
/