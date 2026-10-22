# Projeto: Bolsa da IA — dinâmica interativa para apresentação de Geografia

Você vai trabalhar num projeto que **já existe e já funciona**. Antes de mudar qualquer coisa, leia os 4 arquivos da pasta (`config.js`, `index.html`, `painel.html`, `telao.html`) inteiros. Não reescreva do zero: faça alterações pontuais e explique cada uma em uma linha.

---

## 1. Contexto (por que isso existe)

Sou o Samuel, aluno do Técnico em Informática Integrado do IFSC Câmpus Chapecó. Meu grupo (Davi, Lucas, Samuel, Victor) apresenta **hoje à tarde** um trabalho de Geografia: **"IA, Globalização e Soft Power"**. A apresentação tem 4 blocos:

| Bloco | Quem | Conteúdo |
|---|---|---|
| Abertura | Samuel (eu) | Introdução + **esta dinâmica** |
| Parte 1 | Davi | IA e Geografia: onde é produzida (Vale do Silício, China), data centers (energia e água), chips, Brasil como consumidor, Maritaca AI / Sabiá |
| Parte 2 | Lucas | IA e Globalização: cadeia global (minérios → ASML/Holanda → TSMC/Taiwan → EUA), mercado financeiro, **risco de bolha**, vida cotidiana |
| Parte 3 + Fechamento | Victor | Soft power, EUA × China, **embargo de chips**, DeepSeek, IA militar, Nova Guerra Fria, conclusão |

**Minha única função na apresentação é rodar esta dinâmica.** Os outros apresentam normalmente.

### A dinâmica
A turma vira um **mercado de ações de empresas de IA**. Cada aluno entra pelo celular (QR Code no telão), recebe IA$ 1.000 e compra/vende ações. Entre os blocos eu abro o **pregão** (30–90 s) e disparo **notícias** ligadas ao que acabou de ser apresentado (ex.: depois do Lucas falar de Taiwan → "Tensão no Estreito de Taiwan", TSMC despenca). Quem prestar atenção na apresentação consegue antecipar o mercado e lucrar. No final, ranking e prêmio.

**Princípio de design inegociável:** o jogo precisa estar amarrado ao conteúdo da apresentação. Toda ação é uma empresa real citada no trabalho e todo evento é um fato ou tema citado por um apresentador. Não adicione mecânicas que não tenham relação com IA, geografia, globalização ou soft power.

---

## 2. Arquitetura

- **Front-end puro:** HTML + CSS + JS vanilla, sem build, sem framework, sem npm.
- **Tempo real:** Firebase **Realtime Database** (SDK *compat* 10.12.2 via CDN `gstatic.com`). Projeto `bolsa-ia-203a0`, banco em **modo de teste** (regras abertas, expira em 30 dias).
- **Hospedagem:** Netlify Drop (arrastar a pasta em app.netlify.com/drop). Link de produção = `https://<site>.netlify.app/`.
- **QR Code:** gerado no próprio telão com `qrcodejs` (cdnjs), apontando para a raiz do site.
- **Custo:** zero. Não introduza nada pago (Cloud Functions, Blaze, etc.).

### Arquivos

| Arquivo | Quem usa | Função |
|---|---|---|
| `config.js` | todos | Config do Firebase, regras do jogo (`CAIXA_INICIAL`, `IMPACTO`, `DIVIDENDO`), lista de `ACOES`, lista de `EVENTOS`, utilitários (`agora()`, `fmt()`, `pct()`, `r2()`, `patrimonio()`, `pregaoAberto()`) |
| `index.html` | alunos (celular) | Entrar com nome, ver carteira, comprar/vender (+1, +5, −1, Tudo), ver notícia, status do pregão com contagem regressiva, tela final com posição no ranking |
| `painel.html` | eu (controlador) | Abrir pregão (45/60/90 s), fechar, disparar eventos, notícia livre, ajuste manual de preço (±5%, ±20%), pagar dividendos, ligar/desligar QR grande e resultado final no telão, ranking, movimento da rodada, **RESETAR** |
| `telao.html` | projetor | Cards das ações com preço, variação e sparkline, faixa de notícia, status do pregão, top 10, QR pequeno no canto, overlay de QR grande, pódio final |

### Modelo de dados (Realtime Database)

```
acoes/{TICKER}         { preco: number, base: number }      // base = preço inicial, para calcular variação
jogadores/{id}         { nome, caixa, carteira: {TICKER: qtd}, entrou }
estado/pregao          { aberto: bool, fimEm: timestamp(ms), rodada: int }
estado/noticia         { titulo, texto, efeitos?, ts }
estado/qr              bool   // overlay de QR grande no telão
estado/final           bool   // mostra pódio / tela final
estado/usados/{idEvt}  true   // marca evento já disparado (fica opaco no painel)
rodadas/{n}/{TICKER}   { c: compras, v: vendas }            // via ServerValue.increment
```

- O `id` do jogador é aleatório e salvo no `localStorage` (`bolsaId`), com try/catch.
- Tempo: usar sempre `agora()` (`Date.now()` + `.info/serverTimeOffset`), nunca `Date.now()` puro, para os celulares concordarem com o fim do pregão.

### Regras de preço
- Cada compra de 1 ação sobe o preço em `IMPACTO` (1,5%); cada venda derruba 1,5% (piso de IA$ 1).
- Compra: transação no preço (captura o preço pago e sobe) → transação no jogador (debita, aborta se faltar saldo) → se falhar, desfaz o preço → incrementa `rodadas/n/T/c`.
- Venda: transação na quantidade (aborta se < 1) → transação no preço (captura e derruba) → transação no caixa → incrementa `rodadas/n/T/v`.
- **Detalhe crítico das transações:** retornar `undefined` aborta, e retornar `null` **apaga o nó**. As transações abortam quando o valor é `null`. Isso só é seguro porque cada página mantém listeners `.on("value")` nesses caminhos (o cache local fica preenchido). **Não remova esses listeners e não troque `return;` por `return null`.**
- Eventos aplicam multiplicadores percentuais por ticker (transação em cada preço).
- Dividendos: 3% do valor de mercado das ações de cada jogador, creditado em caixa.
- Patrimônio = caixa + Σ(qtd × preço atual). O ranking é por patrimônio.

### Ações atuais (fictícias, inspiradas nas reais)
NVDA Nvidia (EUA, 120), TSM TSMC (Taiwan, 100), ASML (Holanda, 90), OPAI OpenAI (EUA, 110), GOOG Google (EUA, 100), DSEK DeepSeek (China, 40), MRTC Maritaca AI (Brasil, 20).

### Eventos atuais (em `config.js` → `EVENTOS`)
Febre da IA (abertura) · Data centers sem energia e água (Davi) · Brasil aposta em IA soberana (Davi) · Tensão no Estreito de Taiwan (Lucas, o "crash") · A bolha estourou (Lucas) · EUA proíbem chips para a China (Victor) · Choque DeepSeek, inspirado em jan/2025 (Victor) · Governos compram IA para defesa (Victor).

---

## 3. Roteiro de uso na aula (para você entender o fluxo)

1. Antes da aula: painel → **RESETAR JOGO** (digitar `RESET`). Isso cria as ações e liga o QR grande.
2. Abertura: telão com QR grande → todos entram → desligo o QR → disparo "Febre da IA" → abro pregão 60 s.
3. Davi apresenta → disparo "Data centers" e/ou "Brasil IA soberana" → pregão.
4. Lucas apresenta → "Taiwan" (crash) e depois "Bolha" → pregão.
5. Victor apresenta → "Embargo" e "Choque DeepSeek" → pregão.
6. Pago dividendos → ligo **Resultado final** → pódio no telão, posição em cada celular.

O painel fica no meu celular ou num notebook **fora do projetor**. A aba do painel precisa ficar aberta, porque é ela que fecha o pregão automaticamente quando o tempo acaba.

---

## 4. Regras para você (Antigravity / agente)

1. **Leia antes de editar.** Leia o arquivo inteiro antes de qualquer mudança.
2. **Não apague arquivos.** Antes de editar algo que já existe, diga o que vai mudar e por quê.
3. **Mudanças mínimas.** Não reorganize, não renomeie variáveis, não troque o SDK compat pelo modular, não adicione framework nem build.
4. **Não altere** a `firebaseConfig`, o modelo de dados ou a lógica de transação sem me perguntar.
5. **Mobile first** em `index.html`: tem que funcionar bem num celular Android barato, com tela de 360 px.
6. **Telão legível de longe:** fontes grandes e alto contraste. Não reduza tamanhos.
7. **Sem dependências novas**, exceto via CDN (cdnjs / jsdelivr / gstatic).
8. **Português do Brasil** em todo texto visível.
9. Depois de cada mudança: rode uma verificação de sintaxe (`node --check` nos scripts extraídos) e me diga **como testar** em 1–3 passos.
10. Se faltar informação relevante, **pergunte**. Não deduza.

---

## 5. Melhorias que talvez eu peça (faça só quando eu pedir)

- **Senha no painel:** um prompt simples no `painel.html` que guarda um PIN no `sessionStorage`. É proteção fraca, mas evita curioso.
- **Regras de segurança do Realtime Database** para impedir que um aluno se dê dinheiro pelo console. Ideia: o jogador só escreve no próprio nó e o caixa não pode aumentar fora de venda. Isso exige Firebase Anonymous Auth (gratuito). Avise o trade-off de tempo antes.
- **Som** no telão quando um evento dispara (sirene no crash, caixa registradora nos dividendos), com arquivo via CDN ou Web Audio API gerado em código.
- **Histórico das notícias** no celular do aluno (lista das últimas 5).
- **Gráfico maior** da ação selecionada no telão.
- Ajuste fino de `IMPACTO`, preços iniciais e efeitos dos eventos, conforme o teste com amigos.

---

## 6. Checklist de teste (antes da aula)

- [ ] Deploy no Netlify, abrir `/painel.html` → RESETAR → as 7 ações aparecem
- [ ] `/telao.html` mostra QR grande, e o QR abre a raiz no celular
- [ ] Entrar com 3–5 celulares diferentes, com nomes no ranking
- [ ] Pregão aberto: comprar/vender funciona, preço sobe/desce, caixa atualiza
- [ ] Pregão fechado: botões desativados nos celulares, contagem some
- [ ] Disparar "Taiwan": telão pisca, notícia aparece no celular (flash + vibração), preços caem
- [ ] Dividendos: caixa de quem tem ação aumenta
- [ ] Resultado final: pódio no telão, posição no celular
- [ ] Testar no 4G (fora do Wi-Fi do IFSC)

---

**Primeira tarefa:** leia os 4 arquivos, confirme que entendeu a arquitetura em até 10 linhas e aponte qualquer bug ou risco que você encontrar. **Não altere nada ainda.**
