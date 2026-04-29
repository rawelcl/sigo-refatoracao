# Riscos ANS

> Atualizado em: 21/04/2026
> Fonte: Agente Eng. Reversa -- PR_EFETIVA_INTERNET + PR_CADASTRAMENTO_EMPRESA_PROV

---

## ANS01 -- Elegibilidade: Dependente Acima de 43 Anos

| Campo        | Valor                                                                 |
|--------------|-----------------------------------------------------------------------|
| Rotina       | PR_EFETIVA_INTERNET                                                   |
| Regra        | RN11                                                                  |
| Area         | Elegibilidade de dependentes                                          |
| Severidade   | Alta                                                                  |
| Norma        | RN 195/2009 ANS e alteracoes -- elegibilidade por faixa etaria        |
| Descricao    | Dependentes com tipo diferente de 1 e acima de 43 anos bloqueam a proposta (pendencia 4) |
| Estado atual | Pendencia 4 esta INATIVA (fl_status=0 em tb_tp_pend_empresa_internet) -- validacao nao executa em producao |
| Acao         | Verificar com area regulatoria se a desativacao e intencional e se ha outro mecanismo de controle |

---

## ANS02 -- Elegibilidade: Sobrinho Acima de 23 Anos

| Campo        | Valor                                                                 |
|--------------|-----------------------------------------------------------------------|
| Rotina       | PR_EFETIVA_INTERNET                                                   |
| Regra        | RN12                                                                  |
| Area         | Elegibilidade de dependentes -- sobrinho                              |
| Severidade   | Alta                                                                  |
| Norma        | Normas contratuais ANS para planos empresariais                       |
| Descricao    | Sobrinho (cd_tipo_dependente=14) acima de 23 anos bloqueia proposta (pendencia 5). Pendencia 5 ATIVA. |
| Estado atual | Pendencia 5 ATIVA (fl_status=1). Validacao executa normalmente.       |
| Acao         | Confirmar limite de 23 anos por contrato/produto. O codigo usa `> 23` e a descricao diz `> 18 ANOS` -- [ATENCAO] inconsistencia entre codigo e tabela. |

---

## ANS03 -- Elegibilidade: Limite de Idade Titular/Dependente (59 vs 65 anos)

| Campo        | Valor                                                                 |
|--------------|-----------------------------------------------------------------------|
| Rotina       | PR_EFETIVA_INTERNET                                                   |
| Regra        | RN13                                                                  |
| Area         | Elegibilidade por faixa etaria -- planos PME                          |
| Severidade   | Alta                                                                  |
| Norma        | RN 63 ANS -- elegibilidade em planos coletivos empresariais           |
| Descricao    | Limite configuravel via `HABILITA_65ANOS`: 0=59 anos (pendencia 6), 1=65 anos (pendencia 13) |
| Estado atual | `HABILITA_65ANOS=1` em producao -- limite ativo e 65 anos, usa pendencia 13. Pendencia 6 INATIVA. |
| Acao         | Confirmar com area regulatoria qual limite e vigente por produto/contrato. Documentar decisao em `decisoes-design.md`. |

---

## ANS04 -- Carencia: 30 Dias Hardcoded para Odonto Puro

| Campo        | Valor                                                                 |
|--------------|-----------------------------------------------------------------------|
| Rotina       | PR_EFETIVA_INTERNET                                                   |
| Regra        | RN25                                                                  |
| Area         | Carencia odontologica                                                 |
| Severidade   | Media                                                                 |
| Norma        | RN 162/2007 ANS -- carencias em planos odontologicos                  |
| Descricao    | Apos efetivacao de odonto puro, `dias_adm_especial = 30` e atribuido hardcoded em `tb_compra_carencia` |
| Estado atual | Hardcode no codigo -- nao parametrizavel sem alteracao de codigo       |
| Acao         | Verificar se 30 dias e o valor correto para todos os contratos odonto puro. Parametrizar se necessario. |

---

## ANS05 -- Elegibilidade: Exclusao de Ex-Clientes Acoplada a Flag de Idade

| Campo        | Valor                                                                 |
|--------------|-----------------------------------------------------------------------|
| Rotina       | PR_EFETIVA_INTERNET                                                   |
| Regra        | RN06                                                                  |
| Area         | Portabilidade / elegibilidade                                         |
| Severidade   | Media                                                                 |
| Norma        | Normas ANS de portabilidade e restricao de exclusao                   |
| Descricao    | A verificacao de ex-clientes (fl_tipo_contrato=2) so executa quando `HABILITA_65ANOS != 0`. Com HABILITA_65ANOS=0, ex-clientes NAO sao detectados. |
| Estado atual | HABILITA_65ANOS=1 -- verificacao ativa. Mas acoplamento e semanticamente incorreto. |
| Acao         | Separar logica de ex-cliente da logica de limite de idade. Verificar se ha requisito regulatorio especifico. |

---

## ANS06 -- Coparticipacao: Selecao de Planos por fl_participacao (PR_CADASTRAMENTO_EMPRESA_PROV)

| Campo        | Valor                                                                 |
|--------------|-----------------------------------------------------------------------|
| Rotina       | PR_CADASTRAMENTO_EMPRESA_PROV                                         |
| Regra        | RN13                                                                  |
| Area         | Coparticipacao -- selecao de planos                                   |
| Severidade   | Alta                                                                  |
| Norma        | RN 195/2009 ANS -- coparticipacao em planos coletivos                 |
| Descricao    | Ao copiar valores para tb_valor_plano, a procedure filtra planos por fl_participacao = fl_coparticipacao da proposta. Erro no campo da proposta resultara em empresa cadastrada com planos de coparticipacao incorretos. |
| Estado atual | Logica esta implementada; dependente da qualidade do dado em tb_empresa_internet.fl_coparticipacao |
| Acao         | Validar alinhamento de fl_coparticipacao com criterios ANS; adicionar validacao explicita do campo na fase de criticas |

---

## ANS07 -- RN279/309: Tabela de Inativos na Efetivacao (PR_CADASTRAMENTO_EMPRESA_PROV)

| Campo        | Valor                                                                 |
|--------------|-----------------------------------------------------------------------|
| Rotina       | PR_CADASTRAMENTO_EMPRESA_PROV                                         |
| Regra        | RN14                                                                  |
| Area         | Portabilidade / Permanencia de inativos                               |
| Severidade   | Alta                                                                  |
| Norma        | RN 279 e RN 309 da ANS -- permanencia em planos coletivos             |
| Descricao    | pr_tabela_inativos_rn279 determina se empresa deve ter tabela de inativos. Se atende RN279, copia tabela e registra datas em tb_empresa_conveniada. Excecao e silenciada (WHEN OTHERS - campos ficam NULL). |
| Estado atual | Logica implementada; excecao silenciada pode mascarar falhas na aplicacao |
| Acao         | Investigar pr_tabela_inativos_rn279 para garantir que criterios RN279/309 estao atualizados conforme resolucoes vigentes |

---

## ANS08 -- Faixa Etaria ANS (RN195): Condicao de 100 Vidas Exatas (PR_CADASTRAMENTO_EMPRESA_PROV)

| Campo        | Valor                                                                 |
|--------------|-----------------------------------------------------------------------|
| Rotina       | PR_CADASTRAMENTO_EMPRESA_PROV                                         |
| Regra        | RN15                                                                  |
| Area         | Reajuste por faixa etaria -- planos coletivos                         |
| Severidade   | Alta                                                                  |
| Norma        | RN 195/2009 ANS -- reajuste por faixa etaria em planos de ate 29 vidas |
| Descricao    | fl_faixa_etaria_ans='S' e ativado para: (a) contratos AFFIX; (b) empresas com 1-99 vidas (canais 1 e 2); (c) empresas com exatamente 100 vidas. A condicao para 100 vidas (nu_total_empregado = 100) pode ser uma anomalia -- empresas de 101+ vidas nao recebem o flag. |
| Estado atual | Implementado com esta logica desde pelo menos SACTI 449802 (2017)     |
| Acao         | Confirmar com area regulatoria ANS se o criterio de 100 vidas e correto ou se deveria ser >= 100 ou <= 100 |

---

> [REVISAO] Riscos abaixo identificados durante modelagem DDD do PK_VENDA_JSON -- fluxo ADM (24/04/2026). Ausentes no catalogo original. Adicionados como retroalimentacao.

## ANS09 -- Venda ADM: Beneficiario Alto Risco sem Rastro Auditavel de Deliberacao (PK_VENDA_JSON)

| Campo        | Valor                                                                 |
|--------------|-----------------------------------------------------------------------|
| Rotina       | PK_VENDA_JSON -- pr_set_usuario_internet                              |
| Regra        | RN18                                                                  |
| Area         | Selecao de risco -- venda administrativa (ADM)                        |
| Severidade   | Alta                                                                  |
| Norma        | RDC ANS sobre selecao de risco e cobertura assistencial               |
| Descricao    | Beneficiarios marcados como Devolucao ADM (DEVOLUCAO_TIT_ADM='S') sao registrados em TB_USUARIO_ALT_RISCO com FL_DELIBERACAO=0 (aguardando). A proposta recebe FL_STATUS=3. Porem nao ha log auditavel de quem deliberou, quando e com qual justificativa. A tabela apenas armazena FL_DELIBERACAO=2 quando aprovado, sem historico. |
| Estado atual | Implementado sem auditoria de deliberacao                             |
| Acao         | Criar tabela/coluna de historico de deliberacao (auditor, data, justificativa). Confirmar com area regulatoria ANS se o processo atual esta em conformidade. |

---

## ANS10 -- Venda ADM: Recuperacao de Carencia sem Nova Declaracao de Saude (PK_VENDA_JSON)

| Campo        | Valor                                                                 |
|--------------|-----------------------------------------------------------------------|
| Rotina       | PK_VENDA_JSON -- pr_set_usuario_internet                              |
| Regra        | RN19, RN20                                                            |
| Area         | Portabilidade de carencias -- venda administrativa (ADM)              |
| Severidade   | Alta                                                                  |
| Norma        | RN 195/2009 ANS -- portabilidade de carencias e declaracao de saude   |
| Descricao    | Beneficiarios ADM com historico recebem CD_CONVENIO=542 (recuperacao de carencia) e herdam a declaracao de saude do contrato anterior. Nao e exigida nova declaracao de saude. Se o estado de saude do beneficiario mudou desde o contrato anterior, a operadora pode estar assumindo risco nao avaliado. CD_CONVENIO=542 e um valor magico sem constante nomeada, sem documentacao oficial identificada no CVS. |
| Estado atual | Implementado com codigo magico 542 sem documentacao formal            |
| Acao         | (1) Validar com area juridica e regulatoria se a dispensa de nova declaracao e legal conforme RN 195/2009. (2) Documentar formalmente o CD_CONVENIO=542 ou criar constante PKG_CONST.CD_CONVENIO_RECUPERACAO_CARENCIA_ADM. |

---

## ANS11 -- Venda ADM: Declaracao de Saude Importada do Contrato Anterior Pode Estar Desatualizada (PK_VENDA_JSON)

| Campo        | Valor                                                                 |
|--------------|-----------------------------------------------------------------------|
| Rotina       | PK_VENDA_JSON -- pr_set_usuario_internet                              |
| Regra        | RN20                                                                  |
| Area         | Declaracao de saude -- venda administrativa (ADM)                     |
| Severidade   | Media                                                                 |
| Norma        | RN 195/2009 ANS -- declaracao de saude na portabilidade               |
| Descricao    | Quando V_CD_USU_ANT_TITULAR IS NOT NULL, a declaracao de saude e importada do contrato anterior (TB_DECLARACAO_SAUDE_GRUPO_CID do usuario anterior). O CID historico e replicado para o novo staging sem validacao de data ou exigencia de nova declaracao. Se o beneficiario desenvolveu novas condicoes de saude desde o contrato anterior, a operadora nao tem visibilidade. |
| Estado atual | Implementado desde versao PRODUCAO-20260402                           |
| Acao         | Confirmar com area regulatoria ANS se e obrigatoria nova declaracao para propostas ADM ou se a importacao do historico e suficiente. Registrar decisao em ADR. |
