# Guia de Storytelling - Apresentacao Refatoracao DDD

> Guia pratico para Thiago Rawel apresentar com confianca e impacto.

---

## A REGRA DE OURO

**Voce nao esta apresentando codigo. Voce esta contando a historia de como vai salvar a empresa de um risco critico.**

Toda boa apresentacao tecnica segue este arco:

```
DOR  -->  ESPERANCA  -->  CAMINHO  -->  VITORIA
```

Seus slides ja estao nessa ordem. Agora vamos dar vida a eles.

---

## ANTES DE COMECAR: PREPARACAO

### Controle o Nervosismo
- **Respire 4-7-8**: Inspire 4s, segure 7s, expire 8s. Faca 3x antes de comecar
- **Chegue 10 min antes** e teste o projetor/tela
- **Tenha agua por perto**
- **Lembre-se**: voce sabe mais sobre esse assunto do que qualquer pessoa na sala

### Postura e Voz
- **Fique em pe** se possivel (transmite autoridade)
- **Fale devagar** — quando estamos nervosos, aceleramos sem perceber
- **Faca pausas** depois de numeros impactantes (deixe o dado "respirar")
- **Olhe para as pessoas**, nao para a tela
- **Nao leia os slides** — eles sao apoio visual, nao roteiro

### Tempo
- **26 slides / ~30 minutos** = ~70 segundos por slide
- Slides de secao (3, 8, 12, 17, 20): **10 segundos** cada (so respirar)
- Slides de conteudo denso (5, 14, 18): **2-3 minutos**
- Reserve **5-10 minutos** para perguntas no final

---

## ROTEIRO SLIDE A SLIDE

### ATO 1: "HOUSTON, TEMOS UM PROBLEMA" (Slides 1-7)

O objetivo aqui e fazer a plateia **sentir a dor**. Nao comece com a solucao.

---

#### Slide 1 - Capa
**O que dizer:**
> "Boa tarde a todos. Hoje eu vou contar a historia de uma procedure que nasceu pequena, cresceu sem controle, e hoje e uma das maiores fontes de risco do nosso sistema."

**Dica:** Comece com uma frase de impacto. Nao diga "vou falar sobre refatoracao DDD".

---

#### Slide 2 - Agenda
**O que dizer:**
> "Vou dividir em 5 blocos curtos. Primeiro entender o problema, depois a solucao, e no final o impacto pro negocio. Fiquem a vontade pra perguntar a qualquer momento."

**Dica:** Dizer "fiquem a vontade pra perguntar" relaxa voce e a plateia.

---

#### Slide 3 - "Por que refatorar?"
**O que dizer:** (pausa dramatica, so olhe pra plateia)
> "Por que refatorar?"
> (pausa de 3 segundos)
> "Porque o custo de nao fazer esta ficando alto demais."

**Dica:** Slides de secao sao perguntas retoricas. Use a pausa como ferramenta.

---

#### Slide 4 - O que a procedure faz
**O que dizer:**
> "Essa procedure e o coracao do cadastro de empresas. Tudo passa por ela: desde o contrato ate o beneficiario final. E ela faz TUDO isso em um unico bloco de codigo."

**Dica:** Use a analogia: *"Imagina uma cozinha onde um unico cozinheiro faz entrada, prato principal, sobremesa, lava a louca e atende o cliente. Ao mesmo tempo."*

---

#### Slide 5 - O tamanho do desafio ? SLIDE CHAVE
**O que dizer:**
> "4.991 linhas. Pra dar perspectiva, e como um livro de 100 paginas. De codigo. Em um unico arquivo."
> (pausa)
> "87 tabelas. 13 procedures chamadas internamente. 340 variaveis."
> (pausa)
> "Alguem aqui ja precisou dar manutencao nesse codigo?"
> (espere alguem acenar ou rir)

**Dica:** Esse slide e o seu momento de ouro. Deixe os numeros falarem. Faca PAUSAS entre cada numero. Nao apresse.

**Tecnica "Ponte para o Publico":** Pergunte "alguem ja precisou mexer nesse codigo?" — isso conecta a plateia com a dor.

---

#### Slide 6 - A dor por persona
**O que dizer:**
> "Cada pessoa sente essa dor de um jeito diferente.
> O dev novo? Demora semanas pra entender.
> O dev senior? Tem medo de quebrar algo que nem sabe que existe.
> O PO? Pede uma feature simples e ouve '3 sprints'.
> O gestor? Ve risco de compliance sem conseguir medir."

**Dica:** Olhe para pessoas diferentes da plateia conforme menciona cada persona. Se tiver devs, POs e gestores na sala, fale PARA eles.

---

#### Slide 7 - Contrato fragil
**O que dizer:**
> "Deixa eu dar um exemplo concreto. Hoje o retorno dessa procedure e uma string. Uma string com valores separados por posicao. Se alguem muda uma posicao, quem consome quebra silenciosamente. Sem erro. Sem log. So quebra."

**Dica:** A palavra "silenciosamente" e poderosa. Enfatize ela. O medo do erro invisivel e universal.

---

### ATO 2: "EXISTE UM CAMINHO" (Slides 8-11)

Agora a plateia esta desconfortavel. Otimo. E hora de dar esperanca.

---

#### Slide 8 - "O que e DDD?"
**O que dizer:**
> "Entao, como resolver? Com uma abordagem que grandes empresas usam: Domain-Driven Design."

**Dica:** Nao diga "vou explicar DDD". Diga "vou mostrar como outras empresas resolveram problemas iguais ao nosso".

---

#### Slide 9 - DDD em 1 slide
**O que dizer:**
> "DDD em essencia e simples: o codigo deve falar a mesma lingua do negocio. Se o PO diz 'proposta', o codigo tem uma classe chamada 'Proposta'. Se ele diz 'efetivar', existe um metodo 'efetivar'. Acabou a traducao mental."

**Dica:** Use o exemplo: *"Hoje quando o PO fala 'proposta', o dev pensa 'linha 2.347 da procedure'. Com DDD, ele pensa 'classe Proposta, metodo efetivar'."*

---

#### Slide 10 - 3 conceitos
**O que dizer:**
> "Voces so precisam saber 3 coisas:
> 1. Bounded Context — cada area do negocio tem seu espaco
> 2. Aggregate — protege as regras, ninguem mexe por fora
> 3. Linguagem Ubiqua — todo mundo fala a mesma lingua"

**Dica:** Nao aprofunde demais. Se alguem quiser detalhes, diga "temos documentacao completa, posso compartilhar depois". Isso mostra preparo.

---

#### Slide 11 - Mapa de subdominios
**O que dizer:**
> "Quando analisamos a procedure, descobrimos que ela na verdade contem 18 dominios diferentes misturados. Vendas, financeiro, compliance, beneficiario... tudo junto. O mapa mostra como separamos cada um."

**Dica:** Aponte para o mapa e destaque 2-3 dominios mais criticos. Nao tente explicar todos os 18.

---

### ATO 3: "JA COMECAMOS" (Slides 12-16)

Mostre que nao e so teoria. Tem trabalho feito.

---

#### Slide 12 - "O que foi feito"
**O que dizer:**
> "Isso nao e so uma ideia. Ja temos entregas concretas."

---

#### Slide 13 - Artefatos produzidos
**O que dizer:**
> "Produzimos modelagem completa, diagramas C4, analise de impacto, proposta de novo contrato... tudo documentado e versionado."

**Dica:** Mencione que a documentacao esta no repositorio. Mostra maturidade.

---

#### Slide 14 - 18 Bounded Contexts
**O que dizer:**
> "Cada um desses 18 contextos pode ser desenvolvido, testado e implantado de forma independente. Se der problema em Vendas, Financeiro continua funcionando."

**Dica:** Use a analogia do predio: *"Hoje e um predio sem paredes internas — se um canudo estoura, inunda tudo. Com BCs, cada apartamento tem seu registro."*

---

#### Slide 15 - Jornada de uma proposta
**O que dizer:**
> "Esse e o caminho que uma proposta faz hoje, mas agora com fronteiras claras entre cada etapa. Cada seta e um contrato definido."

---

#### Slide 16 - Decisoes arquiteturais
**O que dizer:**
> "Tomamos algumas decisoes importantes e documentamos o 'por que' de cada uma. Nao e achismo — cada decisao tem justificativa tecnica."

**Dica:** Se alguem questionar uma decisao, diga: "Otima pergunta, registramos isso como ADR (Architecture Decision Record). Posso compartilhar o documento."

---

### ATO 4: "O PLANO E SEGURO" (Slides 17-19)

A plateia esta pensando: "Legal, mas como faz sem quebrar tudo?"

---

#### Slide 17 - "Como sera feito"
**O que dizer:**
> "E a pergunta mais importante: como fazer isso em producao, sem parar nada?"

---

#### Slide 18 - Strangler Fig ? SLIDE CHAVE
**O que dizer:**
> "Usamos o padrao Strangler Fig. O nome vem de uma planta que cresce ao redor de uma arvore, assumindo aos poucos, ate que a arvore antiga nem e mais necessaria. O sistema antigo continua funcionando enquanto o novo cresce ao lado."
> (pausa)
> "Zero downtime. Zero big-bang. Cada fase entrega valor sozinha."

**Dica:** Essa analogia e poderosa. Se possivel, mostre uma foto de uma figueira estranguladora (Google Images). A imagem gruda na memoria.

**Frase de ouro:** *"Se pararmos na Fase 1, ja ganhamos. Se chegarmos na Fase 4, transformamos."*

---

#### Slide 19 - Antes/Depois codigo
**O que dizer:**
> "Olhem a diferenca. A esquerda, o que temos hoje. A direita, como fica na Fase 3. De 5.000 linhas para 30. Trinta linhas. A complexidade nao sumiu — ela foi organizada."

**Dica:** A ultima frase e crucial: *"A complexidade nao sumiu — ela foi organizada."* Isso responde a objecao silenciosa de "mas o negocio e complexo".

---

### ATO 5: "O RETORNO" (Slides 20-26)

Agora traduza tudo pra linguagem de negocio.

---

#### Slide 20 - "Impacto no negocio"
**O que dizer:**
> "Tudo isso e muito bonito tecnicamente. Mas o que muda pro negocio?"

---

#### Slide 21 - Antes vs. Depois
**O que dizer:**
> "Hoje: semanas pra uma mudanca. Depois: dias.
> Hoje: medo de mexer. Depois: confianca com testes.
> Hoje: um dev senior preso. Depois: a equipe inteira pode contribuir."

**Dica:** Fale em pares contrastantes. O cerebro humano ama comparacoes.

---

#### Slides 22-24 - Metricas, Riscos, Proximos passos
**O que dizer:** Seja direto e objetivo. A plateia ja esta convencida, agora quer ver numeros e proximos passos.

---

#### Slide 25 - Frase de impacto
**O que dizer:**
> (leia a frase do slide em voz alta, devagar)
> (pausa de 3 segundos)
> "E isso que estamos fazendo."

---

#### Slide 26 - Encerramento
**O que dizer:**
> "Obrigado. A documentacao completa esta no repositorio. Estou a disposicao pra perguntas."

**Dica:** NUNCA termine com "e isso". Termine com "estou a disposicao" — transmite confianca.

---

## TECNICAS DE STORYTELLING

### 1. A Regra de 3
O cerebro humano memoriza grupos de 3. Seus slides ja usam isso:
- **3 conceitos** de DDD
- **3 personas** com dor
- **4 fases** do roadmap (mas destaque 3 principais)

### 2. Contraste Dramatico
Sempre mostre o ANTES e o DEPOIS lado a lado:
- "Hoje 5.000 linhas. Amanha 30."
- "Hoje semanas. Amanha dias."
- "Hoje medo. Amanha confianca."

### 3. Analogias que Grudam
Use analogias do mundo real:
- **Procedure monolitica** = "Um cozinheiro fazendo tudo sozinho em uma cozinha"
- **Bounded Contexts** = "Apartamentos com paredes proprias em um predio"
- **Strangler Fig** = "A planta que cresce ao redor da arvore"
- **Contrato de retorno** = "Carta sem envelope — qualquer vento espalha"

### 4. A Pausa Estrategica
Depois de um dado impactante, **PARE de falar por 3 segundos**. O silencio amplifica o impacto.

Momentos para pausar:
- Depois de "4.991 linhas"
- Depois de "quebra silenciosamente"
- Depois de "de 5.000 para 30 linhas"
- Depois da frase de impacto final

### 5. Perguntas Retoricas
- "Alguem aqui ja precisou dar manutencao nesse codigo?"
- "Quanto custa um bug que ninguem detecta?"
- "O que acontece se o unico dev que entende isso sair?"

### 6. A Tecnica do "E se..."
Para responder objecoes antes que elas surjam:
- "E se alguem perguntar: 'isso nao vai parar producao?' — nao. Strangler Fig."
- "E se alguem perguntar: 'quanto tempo?' — cada fase entrega valor sozinha."

---

## COMO LIDAR COM PERGUNTAS DIFICEIS

### "Quanto tempo vai levar?"
> "Cada fase tem prazo independente. A Fase 1 pode comecar ja e levar poucas semanas. O mais importante: cada fase entrega valor sozinha."

### "Isso nao vai quebrar producao?"
> "Nao. Usamos Strangler Fig — o sistema antigo continua funcionando enquanto o novo cresce ao lado. So desligamos o antigo quando o novo esta validado."

### "Por que DDD e nao X?"
> "DDD e a abordagem que melhor se adapta a complexidade de negocio que temos. Nao e a unica, mas e a mais madura pra esse tipo de problema. Documentamos essa decisao como ADR."

### "Quem vai fazer?"
> "A modelagem ja esta pronta. A implementacao pode ser distribuida entre a equipe — cada BC e independente."

### Se voce nao souber a resposta:
> "Otima pergunta. Nao tenho esse dado agora, mas anoto e te retorno. Posso te mandar por email?"

**NUNCA invente uma resposta.** Dizer "vou verificar" transmite mais confianca do que chutar.

---

## CHECKLIST DO DIA

- [ ] Testar o projetor/tela 10 min antes
- [ ] Ter agua por perto
- [ ] Respiracao 4-7-8 (3 repeticoes)
- [ ] Primeiro slide aberto antes de todos chegarem
- [ ] Celular no silencioso
- [ ] Guia de FAQ a mao (no celular ou impresso)
- [ ] Slide de backup com detalhes tecnicos (caso perguntem)

---

## RESUMO FINAL

| Bloco | Slides | Tempo | Emocao da Plateia |
|-------|--------|-------|-------------------|
| O Problema | 1-7 | 8 min | Desconforto, reconhecimento |
| A Solucao | 8-11 | 5 min | Esperanca, curiosidade |
| O Trabalho | 12-16 | 6 min | Respeito, confianca |
| O Plano | 17-19 | 5 min | Seguranca, alivio |
| O Impacto | 20-26 | 6 min | Convencimento, vontade de agir |

**Lembre-se:** Voce nao precisa ser um orador perfeito. Voce precisa ser **autentico** e **preparado**. E voce esta preparado — conhece esse codigo melhor que ninguem.

> *"As pessoas vao esquecer o que voce disse, vao esquecer o que voce fez, mas nunca vao esquecer como voce as fez sentir."* — Maya Angelou

Boa apresentacao, Thiago! ??
