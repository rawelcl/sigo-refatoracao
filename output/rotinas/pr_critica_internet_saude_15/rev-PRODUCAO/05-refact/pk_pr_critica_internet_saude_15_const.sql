-- Constantes para a rotina pr_critica_internet_saude_15
CREATE OR REPLACE PACKAGE pk_pr_critica_internet_saude_15_const AS
  -- Limites de idade parametrizados
  C_IDADE_PADRAO CONSTANT NUMBER := 708; -- 59 anos em meses
  C_IDADE_EXTENDIDA CONSTANT NUMBER := 780; -- 65 anos em meses

  -- Códigos de crítica
  C_CRITICA_TITULAR CONSTANT VARCHAR2(20) := '100MT-INCLUSAO PENDENTE';
  C_CRITICA_DEPENDENTE CONSTANT VARCHAR2(20) := '100MD-INCLUSAO PENDENTE';

END pk_pr_critica_internet_saude_15_const;
/