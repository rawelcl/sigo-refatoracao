# -*- coding: utf-8 -*-
# update_indice.py — atualiza o indice_base_conhecimento.md com todas as telas analisadas
import os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INDICE = os.path.join(ROOT, 'eng-reversa', 'telas_fmb', 'indice_base_conhecimento.md')

idx = open(INDICE, encoding='utf-8').read()

# 1. Atualizar cabecalho
idx = idx.replace('**Total de telas analisadas:** 3', '**Total de telas analisadas:** 12')

# 2. Adicionar remover_emojis.py no catalogo de scripts (antes de remover_emojis.ps1)
old_script4 = '| 4 | `remover_emojis.ps1` | PowerShell | Substitui emojis por tokens textuais em todos os `.md` | `.\\scripts\\remover_emojis.ps1` |'
new_script4 = ('| 4 | `remover_emojis.py` | Python | Substitui emojis por tokens textuais em todos os `.md`'
               ' | `python scripts/remover_emojis.py` |\n'
               '| 5 | `remover_emojis.ps1` | PowerShell | Wrapper que chama `remover_emojis.py`'
               ' | `.\\scripts\\remover_emojis.ps1` |')
idx = idx.replace(old_script4, new_script4)

# Renumerar 5->6, 6->7, 7->8
idx = idx.replace('| 5 | `corrigir_encoding.ps1`', '| 6 | `corrigir_encoding.ps1`')
idx = idx.replace('| 6 | `verificar_encoding.ps1`', '| 7 | `verificar_encoding.ps1`')
idx = idx.replace('| 7 | `aplicar_padrao_projeto.ps1`', '| 8 | `aplicar_padrao_projeto.ps1`')

# 3. Adicionar as telas faltantes na tabela de Telas Analisadas
# Inserir apos a linha de T2125 (ultima existente)
nova_linha_t2125 = ('| **T2125** | Credenciamento Médico — Cadastro de Prestador Jurídico'
    ' | 16/04/2026 | `TB_PRESTADOR_JURIDICO`, `TB_PESSOA`, `VW_PRESTADOR_JURIDICO_CAD`,'
    ' `TB_ENDERECO_PESSOA`, `TB_CONTA_BANCARIA_PESSOA`, `TB_MEIO_COMUNICACAO_PESSOA`,'
    ' `TB_TIPO_SERVICO_SAUDE`, `INTEGRA_SAP.TB_SAP_PRESTADOR_JURIDICO`'
    ' | `PR_CARGA_DADOS_CRED_MED` (via BT_IMPORTA_CAPA), `PK_ADMINISTRACAO.FN_DIGITO_OUT`'
    ' | [analise_tela_T2125.md](t2125/analise_reversa/analise_tela_T2125.md) |')

novas_telas = (
    '\n| **T00C1** | Portal Web / Salesforce — Parametrizacao de Criticas da Internet'
    ' | 07/04/2026 | `TB_CRITICA_INTERNET`, `TB_CRITICA_INTERNET_CONTRATO`,'
    ' `TB_CRITICA_INTERNET_FILIAL`, `TB_CRITICA_INTERNET_CANAL`,'
    ' `TB_EMP_PERCENTUAL_VIDAS`, `TB_DEP_PARAMETRIZACAO_IDADE`'
    ' | `fn_individual_familiar`, `fn_get_delim_valor`, `pr_grava_alteracao_empresa`'
    ' | [reversa_t00c1.md](t00c1/analise_reversa/reversa_t00c1.md) |'

    '\n| **T02VI** | Vendas Internet — Conferencia de Orcamentos VI'
    ' | 18/03/2026 | `TB_VI_CONFERENCIA_ORCAMENTO`, `TB_VI_PENDENCIA_ORCAMENTO`,'
    ' `TB_USUARIO_CRITICA_INTERNET`, `TB_VI_ENDERECO_CONTRATO`,'
    ' `TB_VI_ORCAMENTO_MENSAGEM`, `TB_VI_OPERADOR_ORCAMENTO`'
    ' | `pr_proximo_orcamento` (externa)'
    ' | [reversa_t02vi.md](t02vi/analise_reversa/reversa_t02vi.md) |'

    '\n| **T2212** | Contrato Coletivo — Cadastro Completo de Empresa Conveniada'
    ' | 2025 | `VW_EMPRESA_CONVENIADA_CAD`, `TB_EMPRESA_CONVENIADA`,'
    ' `TB_EMPRESA_TOP`, `TB_432_NOTIFICACAO`, `TB_ADITIVOS_CONTRATOS`,'
    ' `TB_COMISSAO_INTERNA`, `TB_COMISSAO_EXTERNA`, `TB_FIDELIZACAO_EMPRESA`'
    ' (25 abas / +30 tabelas detalhe)'
    ' | `fn_individual_familiar`, `PR_INCLUI_IMPOSTO_ODONTO`, `PR_MSG_TABELA_REAJUSTE`'
    ' | [reversa_t2212.md](t2212/analise_reversa/reversa_t2212.md) |'

    '\n| **T221D** | Vendas Internet — Digitacao e Validacao de Propostas (Adesao Digital)'
    ' | 07/04/2026 | `TB_USUARIO_TITULAR_INTERNET`, `TB_USUARIO_DEPENDENTE_INTERNET`'
    ' | `fn_efetiva_adesao_digital`, `PK_ADMINISTRACAO.FN_CHECK_CIC`,'
    ' `FN_NEOWAY_HIGIENIZADO`'
    ' | [reversa_t221d.md](t221d/analise_reversa/reversa_t221d.md) |'

    '\n| **T2283PSIB** | Contratos — Parametrizacao de Regras SIB por Empresa/Faixa Etaria'
    ' | 07/04/2026 | `TB_CARGA_SIB_PARAMETRO`, `TB_CARGA_SIB_PARAMETRO_CONGE`,'
    ' `TB_CARGA_SIB_PARAMETRO_BLOQ`, `TB_CARGA_SIB_PARAMETRO_OBS`'
    ' | Replicacao por empresa mae/coligadas (logica interna na tela)'
    ' | [reversa_t2283psib.md](t2283psib/analise_reversa/reversa_t2283psib.md) |'

    '\n| **T229A** | Contratos — Parametrizacao por Modelo de Negocio (TB_EMPRESA_NEG)'
    ' | 07/04/2026 | `TB_EMPRESA_NEG`, `TB_EMPRESA_NEG_TABELA`,'
    ' `TB_EMPRESA_NEG_CARENCIA`, `TB_EMPRESA_NEG_DESCONTO`,'
    ' `TB_EMPRESA_NEG_FATOR`, `TB_EMPRESA_NEG_CONTROLE` (+ 9 tabelas detalhe)'
    ' | `AU_OPERADORA_VENDA` (auditoria); exportacao CSV para BITIX'
    ' | [reversa_t229a.md](t229a/analise_reversa/reversa_t229a.md) |'

    '\n| **T229B (familia)** | Contratos — Gestao de Contratos Empresas Conveniadas'
    ' (4 forms: t229b principal, t229bcon conferencia, t229bod odonto, t229bba abrangencia)'
    ' | 12/03/2026 | `TB_EMPRESA` (contratos), `TB_VI_CONFERENCIA_ORCAMENTO`'
    ' (via t229bcon); tabelas odontologicas (t229bod)'
    ' | Integracao entre forms; job de processamento de propostas'
    ' | [README_T229B.md](t229b/README_T229B.md) |'

    '\n| **T22ZR** | Contratos — Agendamento de Pre-cancelamento de Empresas Conveniadas'
    ' | 2026 | `TB_PRE_CANCELA_EMPRESA`, `TB_EMPRESA_CONVENIADA`,'
    ' `TB_USUARIO`, `TB_USUARIO_ODONTOLOGIA`, `TB_CLIENTE_PLN_ESP`,'
    ' `TB_PRE_CANCELA_EMP_COLIGADA`, `TB_AJUSTE_FATURA`, `TB_MENSALIDADE_USUARIO`'
    ' | `PR_INSERE_EMPRESA_COLIGADA`, `PK_CHAMA.PR_TELA` (navegacao T22ZAMOT)'
    ' | [reversa_T22ZR.md](t22zr/analise_reversa/reversa_T22ZR.md) |'

    '\n| **T22ZS** | Financeiro / Faturamento — Gestao de Obrigacoes Financeiras (Boletos)'
    ' | 18/03/2026 | `TB_OBRIGACAO` (tipos 3 e 4), `TB_STATUS_OBRIGACAO`,'
    ' `TB_REMESSA_HEADER_BB`, `TB_AJUSTE_FATURA`,'
    ' `HUMASTER.TB_ESPECIE_TITULO`, `TB_CARTEIRA_BANCO`'
    ' | `PR_FATURA_INDIVIDUAL`, `PR_REFATURA_OBRIGACAO`,'
    ' `PR_GERA_NOSSO_NUMERO`, `pk_suporte.pr_produto`'
    ' | [reversa_T22ZS.md](t22zs/analise_reversa/reversa_T22ZS.md) |'
)

idx = idx.replace(nova_linha_t2125, nova_linha_t2125 + novas_telas)

# 4. Adicionar secao "Outros Documentos" antes das Pendencias
secao_outros = (
    '\n---\n\n'
    '## Outros Documentos (Fora do Escopo Oracle Forms)\n\n'
    '| Documento | Tipo | Descricao |\n'
    '|---|---|---|\n'
    '| [FASE1_DETALHAMENTO_TECNICO.md](telas_fmb/taffix/FASE1_DETALHAMENTO_TECNICO.md) | Arquitetura | Detalhamento tecnico Fase 1 — projeto TAFFIX (arquitetura de referencia Hapvida) |\n'
    '| [ROADMAP_TAFFIX.md](telas_fmb/taffix/ROADMAP_TAFFIX.md) | Planejamento | Roadmap de desenvolvimento do projeto TAFFIX |\n'
    '| [STACK_DETALHAMENTO.md](telas_fmb/taffix/STACK_DETALHAMENTO.md) | Arquitetura | Stack tecnologica detalhada do projeto TAFFIX |\n'
    '| [MITIGACAO_VULNERABILIDADES_TAFFIX.md](telas_fmb/taffix/MITIGACAO_VULNERABILIDADES_TAFFIX.md) | Seguranca | Mitigacao de vulnerabilidades — projeto TAFFIX |\n'
    '\n'
)

idx = idx.replace('\n---\n\n## Pendências em Aberto', secao_outros + '\n---\n\n## Pendências em Aberto')

with open(INDICE, 'w', encoding='utf-8') as f:
    f.write(idx)

print('Indice atualizado com sucesso!')
print('Total de linhas:', len(idx.splitlines()))
