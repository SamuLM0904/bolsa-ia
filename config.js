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
// efeitos em %: +30 = sobe 30%, -40 = cai 40%
const EVENTOS = [
  { id: "boom", bloco: "Abertura", titulo: "Febre da IA!", texto: "Todo mundo quer IA. Empresas correm atrás de chips.",
    efeitos: { NVDA: 30, TSM: 15, ASML: 15, OPAI: 20, GOOG: 10, DSEK: 10, MRTC: 10 } },
  { id: "energia", bloco: "Davi", titulo: "Data centers sem energia e água", texto: "Servidores de IA consomem energia e água demais. Expansão travada.",
    efeitos: { NVDA: -10, GOOG: -12, OPAI: -15, MRTC: 5 } },
  { id: "sabia", bloco: "Davi", titulo: "Brasil aposta em IA soberana", texto: "Modelo brasileiro ganha investimento para não depender de IA estrangeira.",
    efeitos: { MRTC: 40 } },
  { id: "taiwan", bloco: "Lucas", titulo: "🚨 TENSÃO NO ESTREITO DE TAIWAN 🚨", texto: "Fábricas de chips paradas. A cadeia global inteira trava.",
    efeitos: { TSM: -45, NVDA: -30, ASML: -25, GOOG: -10, OPAI: -10, DSEK: -5, MRTC: -5 } },
  { id: "bolha", bloco: "Lucas", titulo: "💥 A BOLHA ESTOUROU 💥", texto: "Investiram bilhões, o lucro não veio. Pânico no mercado.",
    efeitos: { NVDA: -35, TSM: -30, ASML: -30, OPAI: -40, GOOG: -25, DSEK: -20, MRTC: -15 } },
  { id: "embargo", bloco: "Victor", titulo: "EUA proíbem chips para a China", texto: "Embargo: chips avançados não podem mais ser vendidos aos chineses.",
    efeitos: { NVDA: -12, ASML: -8, DSEK: -20 } },
  { id: "deepseek", bloco: "Victor", titulo: "Choque DeepSeek", texto: "IA chinesa barata e eficiente assusta o Vale do Silício (inspirado em jan/2025).",
    efeitos: { DSEK: 70, NVDA: -17, OPAI: -15, GOOG: -8 } },
  { id: "militar", bloco: "Victor", titulo: "Governos compram IA para defesa", texto: "Contratos militares bilionários para empresas de IA.",
    efeitos: { OPAI: 15, GOOG: 12, NVDA: 15, DSEK: 10 } }
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
