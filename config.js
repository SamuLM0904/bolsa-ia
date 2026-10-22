// ===== CONFIGURAÇÃO DO FIREBASE =====
const firebaseConfig = {
  apiKey: "AIzaSyCt3dqR_UnfNer0lLTfz4ZquE5-iD8LJ8M",
  authDomain: "bolsa-ia-203a0.firebaseapp.com",
  databaseURL: "https://bolsa-ia-203a0-default-rtdb.firebaseio.com",
  projectId: "bolsa-ia-203a0",
  storageBucket: "bolsa-ia-203a0.firebasestorage.app",
  messagingSenderId: "296137685032",
  appId: "1:296137685032:web:b31771f4c646a9754c1d1d"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ===== REGRAS DO JOGO =====
const CAIXA_INICIAL = 1000;   // IA$ que cada aluno recebe
const IMPACTO = 0.015;        // cada ação comprada sobe o preço 1,5% (vendida: cai 1,5%)

// ===== AÇÕES (fictícias, inspiradas nas empresas reais) =====
// div = dividendo pago ao fim de cada pregão, sobre o valor da ação (maduras pagam mais, startups menos)
const ACOES = {
  NVDA: { nome: "Nvidia",      pais: "EUA",     flag: "🇺🇸", setor: "Projeta os chips de IA",        preco: 120, div: 0.01 },
  TSM:  { nome: "TSMC",        pais: "Taiwan",  flag: "🇹🇼", setor: "Fabrica os chips",              preco: 100, div: 0.04 },
  ASML: { nome: "ASML",        pais: "Holanda", flag: "🇳🇱", setor: "Máquinas que fazem chips",      preco: 90,  div: 0.03 },
  OPAI: { nome: "OpenAI",      pais: "EUA",     flag: "🇺🇸", setor: "ChatGPT",                       preco: 110, div: 0.01 },
  GOOG: { nome: "Google",      pais: "EUA",     flag: "🇺🇸", setor: "Gemini + data centers",         preco: 100, div: 0.03 },
  DSEK: { nome: "DeepSeek",    pais: "China",   flag: "🇨🇳", setor: "IA chinesa open source",        preco: 40,  div: 0.01 },
  MRTC: { nome: "Maritaca AI", pais: "Brasil",  flag: "🇧🇷", setor: "Sabiá, IA brasileira",          preco: 20,  div: 0.01 }
};
const TICKERS = Object.keys(ACOES);

// ===== EVENTOS (notícias que você dispara do painel) =====
// Na ordem dos slides (PDF de 15 slides). bloco = "apresentador · slide" em que o tema aparece.
// efeitos em %: +30 = sobe 30%, -40 = cai 40%
const EVENTOS = [
  // --- Abertura (Samuel) ---
  { id: "boom", bloco: "Samuel · s1 Abertura", titulo: "Febre da IA!", texto: "Todo mundo quer IA. Empresas correm atrás de chips.",
    efeitos: { NVDA: 30, TSM: 15, ASML: 15, OPAI: 20, GOOG: 10, DSEK: 10, MRTC: 10 } },
  // --- Parte 1 (Davi): espacialização, infraestrutura, impacto ambiental, consumo, IA no BR ---
  { id: "energia", bloco: "Davi · s3-4 Infraestrutura / Impacto ambiental", titulo: "Data centers sem energia e água", texto: "Só o Brasil já tem 169 data centers, 55 em SP. Energia e água no limite: expansão travada.",
    efeitos: { NVDA: -10, GOOG: -12, OPAI: -15, MRTC: 5 } },
  { id: "consumo", bloco: "Davi · s5 Consumo global", titulo: "Milhões usam IA todo dia", texto: "ChatGPT, Copilot e Canva IA viram rotina no mundo todo. A demanda explode.",
    efeitos: { OPAI: 20, GOOG: 12, NVDA: 10, TSM: 5 } },
  { id: "vexame", bloco: "Davi · s6 I.A no BR?", titulo: "Vexame da IA brasileira", texto: "A polêmica do \"ChatGPT carioca\" vira piada nacional. Investidores desconfiam da IA feita no Brasil.",
    efeitos: { MRTC: -30, OPAI: 5 } },
  { id: "sabia", bloco: "Davi · s7 Sabiá (Maritaca AI)", titulo: "Sabiá dá a volta por cima", texto: "O Sabiá, da Maritaca AI, ganha investimento para o Brasil não depender de IA estrangeira.",
    efeitos: { MRTC: 40 } },
  // --- Parte 2 (Lucas): cadeia global, mercados econômicos, local × global ---
  { id: "taiwan", bloco: "Lucas · s8 Cadeia global", titulo: "🚨 TENSÃO NO ESTREITO DE TAIWAN 🚨", texto: "Fábricas de chips paradas. A cadeia global inteira trava.",
    efeitos: { TSM: -45, NVDA: -30, ASML: -25, GOOG: -10, OPAI: -10, DSEK: -5, MRTC: -5 } },
  { id: "trilhao", bloco: "Lucas · s9 Mercados econômicos", titulo: "Big Techs valem trilhões", texto: "Oligopólio: poucas gigantes concentram a tecnologia e os lucros. O dinheiro corre para as maiores.",
    efeitos: { NVDA: 20, GOOG: 15, OPAI: 10, DSEK: -5, MRTC: -10 } },
  { id: "bolha", bloco: "Lucas · s9 (só se falar de bolha)", titulo: "💥 A BOLHA ESTOUROU 💥", texto: "Investiram bilhões em data centers, o lucro não veio. Pânico no mercado.",
    efeitos: { NVDA: -35, TSM: -30, ASML: -30, OPAI: -40, GOOG: -25, DSEK: -20, MRTC: -15 } },
  { id: "dolar", bloco: "Lucas · s10 Local × global", titulo: "Dólar dispara: IA estrangeira fica cara", texto: "Assinaturas em dólar pesam no bolso do brasileiro. Empresas buscam alternativa nacional.",
    efeitos: { MRTC: 25, OPAI: -8, GOOG: -5 } },
  // --- Parte 3 + fechamento (Victor): soft power, Nova Guerra Fria (chips, drones, hacks), potencial BR ---
  { id: "ranking", bloco: "Victor · s11 Soft power", titulo: "Ranking mundial: EUA na frente, China logo atrás", texto: "No Artificial Analysis, modelos dos EUA lideram e os chineses vêm em seguida. Quem treina a IA espalha seus valores.",
    efeitos: { OPAI: 12, GOOG: 12, DSEK: 5, MRTC: -8 } },
  { id: "embargo", bloco: "Victor · s12 Guerra Fria: chips", titulo: "EUA proíbem chips para a China", texto: "Embargo: chips avançados da Nvidia não podem mais ser vendidos aos chineses.",
    efeitos: { NVDA: -12, ASML: -8, DSEK: -20 } },
  { id: "deepseek", bloco: "Victor · s12 Guerra Fria: chips", titulo: "Choque DeepSeek", texto: "Sem os melhores chips, a China cria uma IA barata e eficiente. O Vale do Silício treme (jan/2025).",
    efeitos: { DSEK: 70, NVDA: -17, OPAI: -15, GOOG: -8 } },
  { id: "militar", bloco: "Victor · s12 Guerra Fria: drones", titulo: "Drones com IA: corrida militar", texto: "Drones autônomos e sistemas de mira com IA. Governos assinam contratos bilionários.",
    efeitos: { OPAI: 15, GOOG: 12, NVDA: 15, DSEK: 10 } },
  { id: "hacks", bloco: "Victor · s12 Guerra Fria: hacks", titulo: "Ataques hackers feitos com IA", texto: "Ciberataques automatizados atingem grandes empresas de tecnologia. Pânico na segurança digital.",
    efeitos: { GOOG: -12, OPAI: -15, NVDA: -5, DSEK: -8 } },
  { id: "terras", bloco: "Victor · s13 Potencial BR", titulo: "Brasil: 2ª maior reserva de terras raras", texto: "O Brasil tem 23% das terras raras do mundo, atrás só da China (48%). Minério essencial para os chips.",
    efeitos: { MRTC: 20, TSM: 5, ASML: 5, DSEK: -10 } }
];

// ===== UTILITÁRIOS =====
let serverOffset = 0;
db.ref(".info/serverTimeOffset").on("value", s => { serverOffset = s.val() || 0; });
function agora() { return Date.now() + serverOffset; }
function fmt(v) { return "IA$ " + (Number(v) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function pct(v) { const n = (Number(v) || 0); return (n >= 0 ? "+" : "") + n.toFixed(1) + "%"; }
function r2(v) { return Math.round(v * 100) / 100; }
function patrimonio(j, acoes) {
  let total = j.caixa || 0;
  const cart = j.carteira || {};
  for (const t in cart) total += (cart[t] || 0) * ((acoes[t] && acoes[t].preco) || 0);
  return total;
}
function pregaoAberto(estado) {
  const p = estado && estado.pregao;
  return !!(p && p.aberto && p.fimEm > agora());
}
