/* Rifa da Formatura · página pública e painel da vendedora */
(function () {
'use strict';

/* ---------- moldura do documento (para a página se republicar) ---------- */
var RESET = ":root{color-scheme:light;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}html{scroll-padding-top:env(safe-area-inset-top,0px)}body{margin:0;padding:0;font:14px -apple-system,BlinkMacSystemFont,sans-serif;background:#fff;color:#000}img{max-width:100%}[hidden]:not([hidden=until-found i]){display:none!important}";
var PREFIXO = '<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"><style>' + RESET + '</style></head><body>';
var CABECA = '<title>Rifa da Formatura</title><meta name="claude:viewport-fit-sides" content="cover"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lexend:wght@300..800&amp;display=swap"><script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js"><\/script>';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

/* onde a página está rodando: página pública ou painel (site no GitHub + Supabase) */
const PAGINA = (document.body && document.body.dataset.pagina) || 'publico';
const RAIZ = (document.body && document.body.dataset.raiz) || '';
const SB_CFG = window.RIFA_SUPABASE || {};
const TEM_SB = !!(SB_CFG.url && SB_CFG.chave);
const SB = (TEM_SB && window.supabase && typeof window.supabase.createClient === 'function')
  ? window.supabase.createClient(SB_CFG.url, SB_CFG.chave, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } })
  : null;

const CFG_PADRAO = {
  pronto: false,
  vendedora: 'Geo',
  titulo: 'Rifa da formatura',
  subtitulo: 'Oi, aqui é a Geo! Que bom te ver por aqui 💛 Cada número que você compra me deixa um passo mais perto da formatura, e eu fico muito grata pela ajuda. Pra participar é fácil: escolha seus números, pague por Pix e me mande o pedido no WhatsApp. Assim que eu confirmar, te envio o bilhete digital.',
  msgs: {},
  preco: 5,
  whatsapp: '',
  pixTipo: 'celular', pixChave: '', pixNome: '', pixCidade: '',
  faixas: '19201-19300, 19351-19500',
  mostrarContador: true,
  link: '',
  edicao: 'Rifa Formô 26.2',
  instagram: '@formobrasil.pr',
  prazoEntrega: 30,
  prazoReserva: 24,
  conferencia: '16 a 22/03/2027',
  fimVendas: '2027-03-15',
  sorteio: '2027-03-23',
  premios: ['Nintendo Switch', 'Patinete elétrico', 'Adega de vinhos', 'Fone de ouvido de corrida JBL', 'Robô aspirador']
};

let MIDIA = {};
try { MIDIA = JSON.parse($('#midia').textContent || '{}'); } catch (e) { MIDIA = {}; }
if (!MIDIA.p1) ['p1', 'p2', 'p3', 'p4', 'p5'].forEach(k => { MIDIA[k] = RAIZ + 'img/' + k + '.webp'; });
let estadoPub = {};
try { estadoPub = JSON.parse($('#estado').textContent || '{}'); } catch (e) { estadoPub = {}; }
let cfg = Object.assign({}, CFG_PADRAO, estadoPub.cfg || {});
const ocupadosPub = new Set((estadoPub.ocupados || []).map(Number));
let atualizadoPub = estadoPub.atualizado || '';

/* ---------- utilidades ---------- */
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const brl = v => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dataBR = iso => { const p = String(iso || '').split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : ''; };
const soDigitos = s => String(s || '').replace(/\D/g, '');
const ordenar = arr => Array.from(arr).map(Number).sort((a, b) => a - b);
const listaNums = arr => ordenar(arr).join(', ');
const primeiroNome = n => String(n || '').trim().split(/\s+/)[0] || '';
const plural = (n, um, varios) => n === 1 ? um : varios;

function fmtQuando(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const dia = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' });
    const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
    return dia + ' às ' + hora;
  } catch (e) { return ''; }
}
function foneWa(s) {
  const d = soDigitos(s);
  if (!d) return '';
  if (d.length >= 12 && d.startsWith('55')) return d;
  if (d.length === 10 || d.length === 11) return '55' + d;
  return d;
}
function foneBonito(s) {
  let d = soDigitos(s);
  if (d.length > 11 && d.startsWith('55')) d = d.slice(2);
  if (d.length === 11) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
  if (d.length === 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
  return String(s || '');
}
function linkWa(fone, texto) { return 'https://wa.me/' + foneWa(fone) + '?text=' + encodeURIComponent(texto); }
function diaSemana(iso) { try { return new Date(iso + 'T12:00:00-03:00').toLocaleDateString('pt-BR', { weekday: 'long', timeZone: 'America/Sao_Paulo' }); } catch (e) { return ''; } }
function prazoDe(v) { const t = Date.parse(v.criadoEm || ''); return new Date((isNaN(t) ? Date.now() : t) + (Number(cfg.prazoReserva) || 24) * 3600000); }
function vencida(v) { return !v.pago && Date.now() > prazoDe(v).getTime(); }
function vendasEncerradas() { return Date.now() > new Date(cfg.fimVendas + 'T23:59:59-03:00').getTime(); }

/* faixas de números → universo e blocos de 50 */
function lerFaixas(txt) {
  const nums = new Set(); const erros = [];
  String(txt || '').split(/[,;\n]+/).forEach(parte => {
    const p = parte.trim();
    if (!p) return;
    const m = p.match(/^(\d{3,7})\s*(?:-|–|—|a|até)\s*(\d{3,7})$/i) || p.match(/^(\d{3,7})$/);
    if (!m) { erros.push(p); return; }
    let a = Number(m[1]), b = Number(m[2] || m[1]);
    if (a > b) { const t = a; a = b; b = t; }
    if (b - a > 4999) { erros.push(p); return; }
    for (let n = a; n <= b; n++) nums.add(n);
  });
  return { nums: ordenar(nums), erros };
}
function montarBlocos(nums) {
  const m = new Map();
  nums.forEach(n => { const k = Math.floor((n - 1) / 50); if (!m.has(k)) m.set(k, []); m.get(k).push(n); });
  return Array.from(m.values()).map(ns => ({ ini: ns[0], fim: ns[ns.length - 1], nums: ns }));
}
let UNI = [], UNI_SET = new Set(), BLOCOS = [];
function trechos(nums) {
  const t = [];
  nums.forEach(n => { const u = t[t.length - 1]; if (u && n === u[1] + 1) u[1] = n; else t.push([n, n]); });
  return t;
}
function faixasTexto() {
  const t = trechos(UNI).map(x => x[0] === x[1] ? String(x[0]) : x[0] + ' a ' + x[1]);
  return t.length > 1 ? t.slice(0, -1).join(', ') + ' e ' + t[t.length - 1] : (t[0] || '');
}
function definirUniverso() { UNI = lerFaixas(cfg.faixas).nums; UNI_SET = new Set(UNI); BLOCOS = montarBlocos(UNI); }
definirUniverso();

/* Pix copia e cola (BR Code estático) */
function semAcento(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9 ]/g, '').replace(/\s+/g, ' ').trim(); }
function tlv(id, v) { const s = String(v); return id + String(s.length).padStart(2, '0') + s; }
function crc16(str) {
  let crc = 0xFFFF;
  const bytes = new TextEncoder().encode(str);
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i] << 8;
    for (let j = 0; j < 8; j++) { crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1); crc &= 0xFFFF; }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}
function chavePixNormal() {
  const c = String(cfg.pixChave || '').trim();
  if (!c) return '';
  if (cfg.pixTipo === 'cpf') return soDigitos(c);
  if (cfg.pixTipo === 'celular') { const d = soDigitos(c); return (d.length >= 12 && d.startsWith('55')) ? '+' + d : '+55' + d; }
  return c.toLowerCase();
}
function brCode(chave, nome, cidade, valor) {
  const conta = tlv('00', 'BR.GOV.BCB.PIX') + tlv('01', chave);
  let p = tlv('00', '01') + tlv('01', '11') + tlv('26', conta) + tlv('52', '0000') + tlv('53', '986');
  if (valor > 0) p += tlv('54', valor.toFixed(2));
  p += tlv('58', 'BR') + tlv('59', nome) + tlv('60', cidade) + tlv('62', tlv('05', '***')) + '6304';
  return p + crc16(p);
}
function cortarPalavra(s, max) {
  if (s.length <= max) return s;
  const corte = s.slice(0, max + 1).lastIndexOf(' ');
  return (corte > 0 ? s.slice(0, corte) : s.slice(0, max)).trim();
}
function pixCopiaECola(valor) {
  const chave = chavePixNormal();
  const nome = cortarPalavra(semAcento(cfg.pixNome || cfg.vendedora).toUpperCase(), 25);
  if (!chave || !nome) return '';
  const cidade = cortarPalavra((semAcento(cfg.pixCidade) || 'BRASIL').toUpperCase(), 15);
  return brCode(chave, nome, cidade, valor);
}
function qrSVG(texto, rotulo) {
  if (typeof window.qrcode !== 'function' || !texto) return '';
  try {
    const qr = window.qrcode(0, 'M'); qr.addData(texto); qr.make();
    const n = qr.getModuleCount(), m = 4, t = n + m * 2; let d = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += 'M' + (c + m) + ',' + (r + m) + 'h1v1h-1z';
    return '<svg viewBox="0 0 ' + t + ' ' + t + '" role="img" aria-label="' + esc(rotulo || 'QR Code Pix') + '" shape-rendering="crispEdges"><rect width="' + t + '" height="' + t + '" fill="#FFFFFF"/><path d="' + d + '" fill="#000000"/></svg>';
  } catch (e) { return ''; }
}
const ROTULO_PIX = { celular: 'celular', email: 'e-mail', cpf: 'CPF/CNPJ', aleatoria: 'chave aleatória' };

/* mensagens de WhatsApp (modelos editáveis no painel, aba Mensagens) */
const MSGS_PADRAO = {
  pedido: 'Oi, {vendedora}! Vim pela página da rifa e quero participar 🎉\nNome: {nome}\nNúmeros: {numeros}\nTotal: {total}\nJá te mando o comprovante do Pix aqui.',
  bilhete: 'Oi, {nome}! Pagamento confirmado, muito obrigada pela ajuda 💛\nSeus números da rifa: {numeros}\nJá vou te mandar os bilhetes digitais aqui. Guarda eles até o sorteio, tá?\nO sorteio é dia {sorteio}, ao vivo no {instagram}. Boa sorte!',
  cobranca: 'Oi, {nome}! Tudo bem? Separei pra você os números {numeros} da rifa da formatura 😊\nO total ficou {total}. Minha chave Pix é {chave}.\nPra garantir seus números, o pagamento precisa chegar até {prazo}, tá? Depois disso eles voltam a ficar livres.\nQuando pagar, me manda o comprovante aqui. Obrigada!',
  divulgar: 'Gente, tô vendendo a rifa da minha formatura! 🎓\nSão 5 prêmios: {premios}. Cada número custa {preco} e o sorteio é dia {sorteio}.\nEscolhe os seus aqui: {link}\nCada número me ajuda muito, obrigada!',
  divulgarAmigos: 'Tô ajudando a {vendedora} com a rifa da formatura dela! 🎓 São 5 prêmios, incluindo um {premio1}, e cada número custa {preco}.\nEscolhe os seus aqui: {link}'
};
const MSGS_INFO = [
  ['pedido', 'Pedido do comprador', 'O comprador manda pra você quando toca em “Enviar pedido no WhatsApp”.', ['vendedora', 'nome', 'numeros', 'total']],
  ['bilhete', 'Envio do bilhete', 'Você manda depois de confirmar o pagamento, junto com as imagens dos bilhetes.', ['nome', 'numeros', 'total', 'sorteio', 'instagram']],
  ['cobranca', 'Cobrança', 'Você manda pra quem reservou e ainda não pagou.', ['nome', 'numeros', 'total', 'chave', 'prazo', 'pix']],
  ['divulgar', 'Divulgação (sua)', 'O texto que vai quando você toca em Divulgar.', ['premios', 'premio1', 'preco', 'sorteio', 'link']],
  ['divulgarAmigos', 'Divulgação (dos amigos)', 'O texto que vai quando um comprador toca em “Mandar no WhatsApp” pra te ajudar.', ['vendedora', 'premios', 'premio1', 'preco', 'sorteio', 'link']]
];
const VAR_DESC = { vendedora: 'seu nome', nome: 'nome do comprador', numeros: 'números escolhidos', total: 'valor total', sorteio: 'data do sorteio', instagram: 'Instagram do sorteio', chave: 'sua chave Pix', pix: 'código Pix copia e cola com o valor', prazo: 'até quando a reserva vale', premios: 'os 5 prêmios', premio1: '1º prêmio', preco: 'preço por número', link: 'link da página' };
function msgModelo(k) { const m = (cfg.msgs || {})[k]; return (typeof m === 'string' && m.trim()) ? m : MSGS_PADRAO[k]; }
function preencher(tpl, vars) { return String(tpl).replace(/\{(\w+)\}/g, (t, k) => (vars[k] != null ? String(vars[k]) : t)); }
function listaPremios() { const p = cfg.premios.map((x, i) => i ? x.charAt(0).toLowerCase() + x.slice(1) : x); return p.slice(0, -1).join(', ') + ' e ' + p[p.length - 1]; }
function varsBase() { return { vendedora: cfg.vendedora, sorteio: dataBR(cfg.sorteio), instagram: cfg.instagram, preco: brl(cfg.preco), premios: listaPremios(), premio1: cfg.premios[0], link: cfg.link || '' }; }
function varsVenda(nome, nums, completo) {
  const total = nums.length * cfg.preco;
  return Object.assign(varsBase(), {
    nome: completo ? nome : primeiroNome(nome), numeros: listaNums(nums), total: brl(total),
    chave: cfg.pixChave ? cfg.pixChave + ' (' + ROTULO_PIX[cfg.pixTipo] + ')' : '', pix: pixCopiaECola(total)
  });
}
function msgPedido(nome, nums) { return preencher(msgModelo('pedido'), varsVenda(nome, nums, true)); }
function msgBilhete(v) { return preencher(msgModelo('bilhete'), varsVenda(v.nome, ordenar(v.numeros || []), false)); }
function msgCobranca(v) { return preencher(msgModelo('cobranca'), Object.assign(varsVenda(v.nome, ordenar(v.numeros || []), false), { prazo: fmtQuando(prazoDe(v).toISOString()) })); }
function semLinkSeVazio(tpl) { return cfg.link ? tpl : String(tpl).split('\n').filter(l => !l.includes('{link}')).join('\n'); }
function msgDivulgar(daDona) { return preencher(semLinkSeVazio(msgModelo(daDona ? 'divulgar' : 'divulgarAmigos')), varsBase()); }

/* aba Mensagens do painel */
function exemploVars(k) {
  const v = varsVenda('Ana Souza', [19203, 19245], k === 'pedido');
  v.prazo = fmtQuando(new Date(Date.now() + (Number(cfg.prazoReserva) || 24) * 3600000).toISOString());
  return v;
}
function htmlMensagens() {
  return '<form id="f-msgs" class="ajustes" novalidate>' +
    '<p class="dica">Edite os textos do seu jeito. As palavras entre chaves, como {nome}, são trocadas sozinhas pelos dados de cada venda. Embaixo de cada caixa aparece como a mensagem vai ficar.</p>' +
    '<fieldset><legend>Apresentação da página</legend>' +
      '<div class="campo"><label for="m-subtitulo">Texto que aparece no topo, embaixo do título</label><textarea id="m-subtitulo" rows="5">' + esc(cfg.subtitulo) + '</textarea></div>' +
    '</fieldset>' +
    MSGS_INFO.map(i => '<fieldset><legend>' + i[1] + '</legend>' +
      '<p class="dica">' + i[2] + '</p>' +
      '<div class="campo"><label for="m-' + i[0] + '" class="sr">' + i[1] + '</label><textarea id="m-' + i[0] + '" data-msg="' + i[0] + '" rows="6">' + esc(msgModelo(i[0])) + '</textarea></div>' +
      '<p class="vars">' + i[3].map(k => '<button type="button" class="var" data-inserir="{' + k + '}" data-alvo="m-' + i[0] + '" title="' + esc(VAR_DESC[k]) + '">{' + k + '}</button>').join('') + '</p>' +
      (i[0] === 'pedido' ? '<p class="dica">Deixe as linhas “Nome:” e “Números:”: é com elas que o painel preenche a venda sozinho quando você cola o pedido.</p>' : '') +
      '<div class="previa"><span class="rot">Como fica</span><p id="p-' + i[0] + '"></p></div>' +
      '<button type="button" class="btn peq fantasma" data-acao="msg-original" data-msg="' + i[0] + '">Voltar ao texto original</button>' +
    '</fieldset>').join('') +
    '<p class="erro" id="m-erro" hidden></p>' +
    '<button class="btn primario largo" type="submit" id="m-salvar">Salvar mensagens</button>' +
  '</form>';
}
function previaMsg(k) {
  const ta = $('#m-' + k), pv = $('#p-' + k); if (!ta || !pv) return;
  const tpl = ta.value.trim() ? ta.value : MSGS_PADRAO[k];
  pv.textContent = (k === 'divulgar' || k === 'divulgarAmigos') ? preencher(semLinkSeVazio(tpl), varsBase()) : preencher(tpl, exemploVars(k));
}
function ligarMensagens() {
  MSGS_INFO.forEach(i => { const ta = $('#m-' + i[0]); ta.addEventListener('input', () => previaMsg(i[0])); ta.addEventListener('focus', () => { ta.dataset.mexeu = '1'; }); previaMsg(i[0]); });
  $('#f-msgs').addEventListener('submit', async e => {
    e.preventDefault();
    const msgs = {};
    MSGS_INFO.forEach(i => { const t = $('#m-' + i[0]).value.replace(/\r/g, '').trim(); msgs[i[0]] = t || MSGS_PADRAO[i[0]]; });
    const sub = $('#m-subtitulo').value.trim() || CFG_PADRAO.subtitulo;
    $('#m-salvar').disabled = true;
    const ok = await publicar(Object.assign({}, cfg, { msgs, subtitulo: sub }), 'Mensagens salvas. A página já está atualizada.');
    if (!ok) { const b = $('#m-salvar'); if (b) b.disabled = false; }
  });
}

/* ---------- estado da tela ---------- */
const ui = { modo: 'publico', ehDona: false, bloco: 0, sel: new Set(), destaque: null, aba: cfg.pronto ? 'vendas' : 'ajustes', busca: '', filtro: 'todas', folha: null, vendaEdit: null, confirmarExclusao: false, publicando: false, nomeComprador: '' };
let caps = { db: null, artifact: null, downloads: null };
let vendas = [], vendasCarregadas = false, erroVendas = '';
let timerPub = null, mudouNestaSessao = false;

function mapaVendas() {
  const m = new Map();
  vendas.forEach(v => (v.numeros || []).forEach(n => m.set(Number(n), v)));
  return m;
}
function ocupadosAtuais() { return new Set(mapaVendas().keys()); }
function pendentes() {
  if (TEM_SB) return 0;
  if (!vendasCarregadas) return 0;
  const a = ocupadosAtuais(); let c = 0;
  a.forEach(n => { if (!ocupadosPub.has(n)) c++; });
  ocupadosPub.forEach(n => { if (!a.has(n)) c++; });
  return c;
}
function estaOcupado(n) { return ui.modo === 'admin' ? mapaVendas().has(n) : ocupadosPub.has(n); }

/* ---------- camadas fixas ---------- */
function criarCamadas() {
  ['barra', 'fundo', 'toast'].forEach(id => {
    if ($('#' + id)) return;
    const el = document.createElement('div');
    el.id = id; el.className = id; el.hidden = true;
    document.body.appendChild(el);
  });
  $('#toast').setAttribute('role', 'status');
}
let toastTimer = null;
function toast(msg) {
  const t = $('#toast'); if (!t) return;
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 3200);
}
function selecionarCampo(el) {
  try { el.focus({ preventScroll: true }); el.select(); el.setSelectionRange(0, el.value.length); } catch (e) { /* nada */ }
}
async function copiar(texto, alvoId) {
  try { await navigator.clipboard.writeText(texto); toast('Copiado!'); return; } catch (e) { /* segue */ }
  const alvo = alvoId ? document.getElementById(alvoId) : null;
  let ok = false;
  try {
    if (alvo) {
      const ro = alvo.readOnly; alvo.readOnly = false; selecionarCampo(alvo);
      ok = document.execCommand('copy'); alvo.readOnly = ro;
    } else {
      const ta = document.createElement('textarea'); ta.value = texto;
      ta.style.position = 'fixed'; ta.style.top = '0'; ta.style.opacity = '0'; document.body.appendChild(ta);
      selecionarCampo(ta); ok = document.execCommand('copy'); ta.remove();
    }
  } catch (e) { ok = false; }
  if (alvo) selecionarCampo(alvo);
  toast(ok ? 'Copiado! Se não colar, segure o código e copie.' : (alvo ? 'O código está selecionado: toque em Copiar no menu do celular.' : 'Não deu pra copiar. Segure o texto e copie à mão.'));
}
document.addEventListener('focusin', e => { if (e.target.classList && e.target.classList.contains('cc-campo')) setTimeout(() => selecionarCampo(e.target), 0); });

/* ---------- rabiscos de fundo ---------- */
const FORMAS = {
  mola(g, s) { const n = 260, fim = Math.PI * 2 * 3.2; for (let i = 0; i <= n; i++) { const t = i / n * fim; const x = s * .3 * Math.cos(t), y = s * .055 * t + s * .2 * Math.sin(t); if (i) g.lineTo(x, y); else g.moveTo(x, y); } },
  laco(g, s) { const n = 220, a = -Math.PI * .6, b = Math.PI * 2.4; for (let i = 0; i <= n; i++) { const t = a + (b - a) * i / n; const x = s * .16 * t - s * .3 * Math.sin(t), y = -s * .3 * Math.cos(t) + s * .015 * t * t; if (i) g.lineTo(x, y); else g.moveTo(x, y); } },
  onda(g, s) { const n = 140; for (let i = 0; i <= n; i++) { const u = i / n; const x = s * u, y = s * .1 * Math.sin(u * Math.PI * 2 * 2.2); if (i) g.lineTo(x, y); else g.moveTo(x, y); } },
  zigue(g, s) { const n = 160; for (let i = 0; i <= n; i++) { const u = i / n; const x = s * u, y = s * .26 * Math.sin(u * Math.PI * 2 * 2.5); if (i) g.lineTo(x, y); else g.moveTo(x, y); } }
};
/* [forma, x (fração da largura), y (fração da altura), tamanho, giro, cor, espessura] */
const RABISCOS = {
  hero: [['mola', .94, .015, 92, .35, '--c5', 15], ['laco', .6, .94, 130, -.2, '--c2', 14], ['zigue', -.03, .995, 80, -.25, '--c6', 12]],
  creme: [['zigue', .86, .02, 90, .2, '--c6', 13], ['laco', -.03, .95, 120, .3, '--c4', 13]],
  rosa: [['mola', .97, .06, 70, -.3, '--c6', 13], ['onda', -.03, .99, 150, -.12, '--c2', 13]],
  verde: [['laco', .9, .06, 120, .5, '--c5', 14], ['zigue', .02, .99, 70, -.35, '--c3', 11]]
};
function desenharRabiscos() {
  const css = getComputedStyle(document.documentElement);
  $$('canvas.rabiscos').forEach(cv => {
    const lista = RABISCOS[cv.dataset.preset]; if (!lista) return;
    const box = cv.getBoundingClientRect(); if (!box.width || !box.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(box.width * dpr); cv.height = Math.round(box.height * dpr);
    const g = cv.getContext('2d'); if (!g) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, box.width, box.height);
    g.lineCap = 'round'; g.lineJoin = 'round';
    const k = Math.min(1.7, Math.max(1, box.width / 420));
    lista.forEach(r => {
      g.save();
      g.translate(r[1] * box.width, r[2] * box.height);
      g.rotate(r[4]);
      g.strokeStyle = css.getPropertyValue(r[5]).trim() || '#FCBA59';
      g.lineWidth = r[6] * Math.min(k, 1.3);
      g.beginPath(); FORMAS[r[0]](g, r[3] * k); g.stroke();
      g.restore();
    });
  });
}

/* ---------- carrossel dos prêmios ---------- */
const CORES_PREMIO = ['#FEEAD1', '#61C4E1', '#F1BFC0', '#87B9A0', '#FCBA59'];
let carrosselTimer = null, irPremio = null, pausarCarrossel = () => {};
function htmlPremios() {
  const imgs = ['p1', 'p2', 'p3', 'p4', 'p5'];
  const n = cfg.premios.length;
  return '<div class="carrossel" role="region" aria-roledescription="carrossel" aria-label="Prêmios">' +
    '<div class="trilho" id="trilho" tabindex="0">' + cfg.premios.map((p, i) => {
      const src = MIDIA[imgs[i]] || '';
      return '<article class="slide" style="background:' + (CORES_PREMIO[i] || CORES_PREMIO[0]) + '" aria-roledescription="slide" aria-label="' + (i + 1) + ' de ' + n + '">' +
        '<div class="slide-topo"><span class="slide-pos">' + (i + 1) + 'º</span><span class="slide-tag">prêmio</span></div>' +
        (src ? '<img src="' + src + '" alt="' + esc(p) + '">' : '') +
        '<h3 class="slide-nome">' + esc(p) + '</h3></article>';
    }).join('') + '</div>' +
    '<div class="carrossel-ctrl"><button type="button" class="btn peq icone" data-acao="prem-ant" aria-label="Prêmio anterior">‹</button>' +
    '<div class="pontos">' + cfg.premios.map((p, i) => '<button type="button" class="ponto" data-ponto="' + i + '" aria-label="Ver o ' + (i + 1) + 'º prêmio"></button>').join('') + '</div>' +
    '<button type="button" class="btn peq icone" data-acao="prem-prox" aria-label="Próximo prêmio">›</button></div></div>';
}
function ligarCarrossel() {
  clearInterval(carrosselTimer); irPremio = null;
  const tr = $('#trilho'); if (!tr) return;
  const slides = $$('.slide', tr), pontos = $$('.ponto');
  const reduz = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let atual = 0, pausadoAte = 0, raf = null;
  const marcar = () => pontos.forEach((p, k) => p.setAttribute('aria-current', String(k === atual)));
  irPremio = (i, suave) => {
    atual = (i + slides.length) % slides.length;
    const s = slides[atual];
    tr.scrollTo({ left: s.offsetLeft - (tr.clientWidth - s.offsetWidth) / 2, behavior: suave && !reduz ? 'smooth' : 'auto' });
    marcar();
  };
  irPremio.atual = () => atual;
  pausarCarrossel = () => { pausadoAte = Date.now() + 8000; };
  tr.addEventListener('scroll', () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const c = tr.scrollLeft + tr.clientWidth / 2; let best = 0, d = Infinity;
      slides.forEach((s, k) => { const dd = Math.abs(s.offsetLeft + s.offsetWidth / 2 - c); if (dd < d) { d = dd; best = k; } });
      if (best !== atual) { atual = best; marcar(); }
    });
  }, { passive: true });
  ['pointerdown', 'touchstart', 'wheel', 'focusin', 'mouseenter'].forEach(ev => tr.addEventListener(ev, pausarCarrossel, { passive: true }));
  marcar();
  if (reduz) return;
  carrosselTimer = setInterval(() => {
    if (!document.body.contains(tr)) { clearInterval(carrosselTimer); return; }
    if (Date.now() < pausadoAte || document.hidden || ui.folha) return;
    const b = tr.getBoundingClientRect(); if (b.bottom < 0 || b.top > innerHeight) return;
    irPremio(atual + 1, true);
  }, 3800);
}

/* ---------- página do comprador ---------- */
function tituloHTML(t) {
  const p = String(t || '').trim().split(/\s+/);
  if (p.length < 2) return esc(t);
  const ult = p.pop();
  return esc(p.join(' ')) + ' <em>' + esc(ult) + '</em>';
}
function igURL() { return 'https://www.instagram.com/' + String(cfg.instagram || '').replace(/^@/, '').trim() + '/'; }
function igLink() { return '<a class="ig" href="' + esc(igURL()) + '" target="_blank" rel="noopener">' + esc(cfg.instagram) + '</a>'; }
function prazoTexto() { const h = Number(cfg.prazoReserva) || 24; return (h >= 48 && h % 24 === 0) ? (h / 24) + ' dias' : h + ' horas'; }
function diasParaFim() { return Math.ceil((new Date(cfg.fimVendas + 'T23:59:59-03:00').getTime() - Date.now()) / 86400000); }
function renderPublico() {
  const total = UNI.length;
  const livres = UNI.filter(n => !ocupadosPub.has(n)).length;
  const encerrado = vendasEncerradas();
  const esgotado = cfg.pronto && !encerrado && total > 0 && livres === 0;
  const aberta = cfg.pronto && !encerrado && !esgotado;
  const V = esc(cfg.vendedora);
  let escolha;
  if (!cfg.pronto) {
    escolha = '<div class="aviso-breve"><h3>Os números abrem em breve</h3><p class="dica">Estou terminando de preparar esta página. Volta daqui a pouquinho!</p></div>';
  } else if (encerrado) {
    escolha = '<div class="aviso-breve"><h3>As vendas terminaram</h3><p class="dica">A venda dos números foi até ' + dataBR(cfg.fimVendas) + '. O sorteio é dia ' + dataBR(cfg.sorteio) + ', ao vivo no ' + igLink() + '. Boa sorte pra quem comprou!</p></div>';
  } else if (esgotado) {
    escolha = '<div class="esgotou"><span class="esgotou-selo">Esgotou! 🎉</span><h3>Todos os números já têm dono</h3><p>Muito obrigada a todo mundo que comprou e me ajudou! Vou ter mais rifas da formatura por aí. Quer que eu te avise quando abrir a próxima?</p>' +
      (cfg.whatsapp ? '<a class="btn primario" href="' + esc(linkWa(cfg.whatsapp, 'Oi, ' + cfg.vendedora + '! Vi que a rifa esgotou. Me avisa quando abrir a próxima? 😊')) + '" target="_blank" rel="noopener">Me avisa da próxima rifa</a>' : '') + '</div>';
  } else {
    escolha =
      '<div class="ferramentas"><form id="f-busca" class="busca" role="search"><label for="busca-num" class="sr">Procurar número</label><input id="busca-num" type="text" inputmode="numeric" autocomplete="off" placeholder="Procurar um número"><button class="btn peq" type="submit">Procurar</button></form>' +
      '<button class="btn peq" type="button" data-acao="sorte">Escolher pra mim</button></div>' +
      '<div id="area-grade"></div>' +
      '<div class="legenda"><span><i class="amostra"></i>Livre</span><span><i class="amostra sel"></i>Escolhido por você</span><span><i class="amostra ocupado"></i>Já tem dono</span></div>';
  }
  const linhaLivres = aberta
    ? '<p class="dica" id="linha-livres">' + (cfg.mostrarContador ? livres + ' de ' + total + ' números ainda livres. ' : 'Os números riscados já têm dono. ') + (atualizadoPub ? 'Atualizado em ' + fmtQuando(atualizadoPub) + '.' : '') + '</p>'
    : '';
  const dias = diasParaFim();
  const pilulaVendas = (aberta && dias > 0 && dias <= 30)
    ? '<span class="pilula coral">🚨 Faltam ' + dias + ' ' + plural(dias, 'dia', 'dias') + ' pro fim das vendas</span>'
    : '<span class="pilula contorno">Vendas até ' + dataBR(cfg.fimVendas) + '</span>';
  const P = esc(prazoTexto());

  $('#app').innerHTML =
    (ui.ehDona ? '<div class="faixa-dona"><span>Você está vendo a página como o comprador vê.</span><button class="btn peq" type="button" data-acao="painel">Voltar ao painel</button></div>' : '') +
    '<header class="hero banda"><canvas class="rabiscos" data-preset="hero" aria-hidden="true"></canvas><div class="wrap">' +
      '<span class="selo">' + esc(cfg.edicao) + ' · com a ' + V + '</span>' +
      '<h1>' + tituloHTML(cfg.titulo) + '</h1>' +
      '<p class="lede">' + esc(cfg.subtitulo) + '</p>' +
      '<div class="canhoto"><div><span class="rot">Cada número</span><div class="preco num">' + brl(cfg.preco).replace(',00', '') + '</div></div>' +
        '<div class="canhoto-tx">' + (trechos(UNI).length === 1 ? '<span class="rot">Nº</span><span class="num">' + UNI[0] + ' a ' + UNI[UNI.length - 1] + '</span>' : '<span class="rot">Números</span><span class="num">' + UNI.length + ' à venda</span>') + '</div></div>' +
      '<div class="pilulas"><span class="pilula mostarda">Sorteio ' + dataBR(cfg.sorteio) + ' · ao vivo no ' + igLink() + '</span>' + pilulaVendas + '</div>' +
      (aberta ? '<div class="hero-cta"><button class="btn primario" type="button" data-acao="ir-escolha">Escolher meus números</button><button class="btn" type="button" data-acao="compartilhar">Compartilhar</button></div>' : '') +
      (esgotado ? '<div class="hero-cta"><span class="pilula mostarda">Esgotou! Muito obrigada 💛🎓</span></div>' : '') +
    '</div></header>' +
    '<main>' +
      '<section class="wrap secao" aria-labelledby="t-premios"><div class="secao-cab"><h2 id="t-premios">Concorra a <em>5 prêmios</em></h2><p class="dica">Cada número sorteado leva um. Arraste pro lado pra ver todos os prêmios desta leva! E fica de olho, que logo vem mais por aí 😉</p></div>' + htmlPremios() + '</section>' +
      '<section class="wrap secao" id="escolha" aria-labelledby="t-escolha"><div class="secao-cab"><h2 id="t-escolha">Escolha seus <em>números</em></h2>' + linhaLivres + '</div>' + escolha + '</section>' +
      '<section class="banda banda-creme" aria-labelledby="t-como"><canvas class="rabiscos" data-preset="creme" aria-hidden="true"></canvas><div class="wrap secao"><h2 id="t-como">Como comprar</h2><ol class="cartoes">' +
        '<li><span class="bola">1</span><strong>Escolha os números</strong><span>Toque nos números livres. Pode escolher quantos quiser.</span></li>' +
        '<li><span class="bola">2</span><strong>Pague por Pix</strong><span>A chave, o código e o QR Code aparecem com o valor certinho quando você tocar em Continuar.</span></li>' +
        '<li><span class="bola">3</span><strong>Mande o pedido no WhatsApp</strong><span>A mensagem já vai pronta. Manda o comprovante na mesma conversa.</span></li>' +
        '<li><span class="bola">4</span><strong>Receba seu bilhete</strong><span>Eu confirmo o pagamento e te mando o bilhete digital de cada número.</span></li>' +
      '</ol><p class="aviso-reserva">⏳ Depois que você me manda o pedido, eu seguro os números pra você por ' + P + '. Se o pagamento não chegar nesse prazo, eles voltam a ficar livres pra outra pessoa.</p></div></section>' +
      '<section class="banda banda-rosa" aria-labelledby="t-ganhou"><canvas class="rabiscos" data-preset="rosa" aria-hidden="true"></canvas><div class="wrap secao"><div class="secao-cab"><h2 id="t-ganhou">Se o seu número sair</h2><p class="lede-g">São 5 números sorteados, um para cada prêmio.</p></div><ol class="passos-g">' +
        '<li><span class="bola">1</span><strong>Eu te aviso</strong><span>Acompanhe a live no ' + igLink() + '. Se um número seu for sorteado, eu te chamo no WhatsApp que você usou na compra.</span></li>' +
        '<li><span class="bola">2</span><strong>Fale com a Formô</strong><span>Com o aviso em mãos, você entra em contato com a Formô pra confirmar o número e combinar a retirada.</span></li>' +
        '<li><span class="bola">3</span><strong>Retire o prêmio</strong><span>A Formô tem até ' + cfg.prazoEntrega + ' dias corridos pra entregar, contados desse primeiro contato. A retirada é na sede da Formô, em Curitiba. Mora fora? O frete é combinado à parte com a Formô.</span></li>' +
      '</ol></div></section>' +
      '<section class="wrap secao" aria-labelledby="t-duvidas"><h2 id="t-duvidas">Dúvidas</h2><div class="faq">' +
        '<details><summary>Quando é o sorteio?</summary><p>' + diaSemana(cfg.sorteio).replace(/^./, c => c.toUpperCase()) + ', ' + dataBR(cfg.sorteio) + ', ao vivo no Instagram ' + igLink() + '.</p><p><strong>🚨 Atenção:</strong> as vendas vão até o dia ' + dataBR(cfg.fimVendas) + '.</p></details>' +
        '<details><summary>Posso comprar mais de um número?</summary><p>Pode sim, quantos quiser! No sorteio saem 5 números, um para cada prêmio. Cada número que você compra é mais uma chance de estar entre eles, então quanto mais números, maiores as suas chances.</p></details>' +
        '<details><summary>Escolhi meus números. Eles já são meus?</summary><p>Ainda não! Escolher na página não separa nenhum número. Quando você me manda o pedido no WhatsApp, eu reservo os números pra você por ' + P + '. Se o pagamento chegar nesse prazo, eles são seus; se não, voltam a ficar livres pra outra pessoa.</p></details>' +
        '<details><summary>Meu número está garantido no sorteio?</summary><p>Depois que eu confirmo o seu pagamento, o número é seu. Eu registro cada venda e pago o bloco à Formô na conferência, de ' + esc(cfg.conferencia) + ', e é isso que coloca os números no sorteio.</p></details>' +
        '<details><summary>Vou receber um bilhete de papel?</summary><p>Não, a rifa é 100% digital: cada número é um bilhete em imagem, que chega pelo WhatsApp. Guarde essas imagens até o sorteio. Se quiser, dá pra imprimir.</p></details>' +
        '<details><summary>Quem organiza a rifa?</summary><p>A Formô, empresa que organiza a formatura, e o sorteio é feito por ela. O valor dos números vai para a arrecadação da minha formatura.</p></details>' +
      '</div></section>' +
      '<section class="banda banda-verde" aria-labelledby="t-ajude"><canvas class="rabiscos" data-preset="verde" aria-hidden="true"></canvas><div class="wrap secao">' +
        (esgotado
          ? '<h2 id="t-ajude">Valeu <em>demais</em>!</h2><p>Os números esgotaram. Muito obrigada! 💛🎓</p>'
          : '<h2 id="t-ajude">Me ajuda a <em>vender</em>?</h2><p>Mandar o link pra família e pros amigos já ajuda muito. Muito obrigada! 💛🎓</p>' +
            '<div class="linha-botoes"><a class="btn primario" href="' + esc('https://wa.me/?text=' + encodeURIComponent(msgDivulgar(false))) + '" target="_blank" rel="noopener">Mandar no WhatsApp</a>' +
            (cfg.link ? '<button class="btn" type="button" data-copiar="' + esc(cfg.link) + '">Copiar link</button>' : '') + '</div>') +
      '</div></section>' +
    '</main>' +
    '<footer class="rodape"><div class="wrap"><p>Obrigada por passar por aqui e por torcer junto comigo pela minha formatura! 💛</p><p>Os números desta página são os que eu estou vendendo. A rifa é organizada pela Formô, que faz o sorteio ao vivo no ' + igLink() + ' em ' + dataBR(cfg.sorteio) + '.</p>' +
      '<p><a class="btn peq" href="' + esc(igURL()) + '" target="_blank" rel="noopener">Ver o Instagram da Formô</a></p></div></footer>';
  if (aberta) renderGrade(false);
  ligarCarrossel();
  requestAnimationFrame(desenharRabiscos);
}

/* ---------- cartela (compartilhada) ---------- */
function celHTML(n, admin, mapa) {
  let st, extra = '';
  if (admin) {
    const v = mapa.get(n);
    st = v ? (v.pago ? 'pago' : 'aguardando') : (ui.sel.has(n) ? 'sel' : 'livre');
    if (v) extra = ', ' + (v.pago ? 'pago' : 'aguardando pagamento') + ', ' + (v.nome || '');
  } else {
    st = ui.sel.has(n) ? 'sel' : (ocupadosPub.has(n) ? 'ocupado' : 'livre');
  }
  const rot = 'Número ' + n + (st === 'ocupado' ? ', já tem dono' : st === 'sel' ? ', escolhido' : '') + extra;
  return '<button type="button" class="cel ' + st + (ui.destaque === n ? ' pisca' : '') + '" data-n="' + n + '" aria-pressed="' + (st === 'sel') + '" aria-label="' + esc(rot) + '"' + (st === 'ocupado' ? ' aria-disabled="true"' : '') + '>' + n + '</button>';
}
function renderGrade(admin) {
  const el = $('#area-grade'); if (!el) return;
  if (!BLOCOS.length) { el.innerHTML = '<p class="dica">Nenhum número configurado ainda.</p>'; return; }
  ui.bloco = Math.max(0, Math.min(ui.bloco, BLOCOS.length - 1));
  const b = BLOCOS[ui.bloco];
  const mapa = admin ? mapaVendas() : null;
  const chips = BLOCOS.map((bl, i) => {
    const lv = bl.nums.filter(n => !ocupadosPub.has(n)).length; const info = admin ? bl.nums.filter(n => mapa.has(n)).length + ' com dono' : (lv ? lv + ' livres' : 'esgotado');
    return '<button type="button" role="tab" class="bloco" data-bloco="' + i + '" aria-selected="' + (i === ui.bloco) + '"><span class="num">' + bl.ini + '–' + bl.fim + '</span><span class="bloco-info">' + info + '</span></button>';
  }).join('');
  const sc = el.querySelector('.blocos'); const scrollAntes = sc ? sc.scrollLeft : null;
  el.innerHTML =
    '<div class="blocos" role="tablist" aria-label="Blocos de números">' + chips + '</div>' +
    '<div class="grade-cab"><button type="button" class="btn peq icone" data-acao="bloco-ant" aria-label="Bloco anterior"' + (ui.bloco === 0 ? ' disabled' : '') + '>‹</button>' +
    '<span class="grade-titulo">Bloco <span class="num">' + b.ini + '</span> a <span class="num">' + b.fim + '</span></span>' +
    '<button type="button" class="btn peq icone" data-acao="bloco-prox" aria-label="Próximo bloco"' + (ui.bloco === BLOCOS.length - 1 ? ' disabled' : '') + '>›</button></div>' +
    '<div class="cartela">' + b.nums.map(n => celHTML(n, admin, mapa)).join('') + '</div>';
  const nsc = el.querySelector('.blocos'); const at = el.querySelector('.bloco[aria-selected="true"]');
  if (nsc && at) {
    if (scrollAntes != null) nsc.scrollLeft = scrollAntes;
    const esq = at.offsetLeft - nsc.offsetLeft, dir = esq + at.offsetWidth;
    if (esq < nsc.scrollLeft || dir > nsc.scrollLeft + nsc.clientWidth) nsc.scrollLeft = esq - 8;
  }
}
function atualizarCel(n) {
  const b = $('.cel[data-n="' + n + '"]'); if (!b) return;
  const sel = ui.sel.has(n);
  b.classList.toggle('sel', sel); b.classList.toggle('livre', !sel);
  b.setAttribute('aria-pressed', String(sel));
  b.setAttribute('aria-label', 'Número ' + n + (sel ? ', escolhido' : ''));
}
function irPara(n) {
  const i = BLOCOS.findIndex(b => b.nums.includes(n));
  if (i < 0) return;
  ui.bloco = i; ui.destaque = n;
  renderGrade(ui.modo === 'admin');
  const c = $('.cel[data-n="' + n + '"]');
  if (c) c.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  setTimeout(() => { if (ui.destaque === n) { ui.destaque = null; const e = $('.cel[data-n="' + n + '"]'); if (e) e.classList.remove('pisca'); } }, 2600);
}

/* ---------- barra de seleção ---------- */
function renderBarra() {
  const el = $('#barra'); if (!el) return;
  const n = ui.sel.size;
  const mostrar = n > 0 && !ui.folha && (ui.modo === 'publico' || ui.aba === 'numeros');
  if (!mostrar) { el.hidden = true; return; }
  el.hidden = false;
  el.innerHTML = '<div class="barra-in"><div class="barra-info"><span>' + n + ' ' + plural(n, 'número', 'números') + '</span><span class="num">' + brl(n * cfg.preco) + '</span></div>' +
    '<div class="barra-acoes"><button class="btn peq fantasma" type="button" data-acao="limpar-sel">Limpar</button>' +
    '<button class="btn primario" type="button" data-acao="continuar">' + (ui.modo === 'admin' ? 'Registrar venda' : 'Continuar') + '</button></div></div>';
}

/* ---------- folhas (modais) ---------- */
function abrirFolha(tipo, html) {
  ui.folha = tipo;
  const f = $('#fundo');
  f.innerHTML = '<div class="folha" role="dialog" aria-modal="true" aria-labelledby="folha-t" tabindex="-1">' + html + '</div>';
  f.hidden = false;
  const fo = f.querySelector('.folha'); if (fo) fo.focus({ preventScroll: true });
  document.documentElement.classList.add('travado');
  renderBarra();
}
function fecharFolha() {
  ui.folha = null; ui.vendaEdit = null; ui.confirmarExclusao = false;
  const f = $('#fundo'); f.hidden = true; f.innerHTML = '';
  document.documentElement.classList.remove('travado');
  renderBarra();
}
function cabFolha(titulo) {
  return '<div class="folha-titulo"><h2 id="folha-t">' + titulo + '</h2><button class="fechar" type="button" data-acao="fechar" aria-label="Fechar">×</button></div>';
}

/* pedido do comprador */
function abrirPedido() {
  const nums = ordenar(ui.sel);
  if (!nums.length) return;
  const total = nums.length * cfg.preco;
  const cc = pixCopiaECola(total);
  const pix = cfg.pixChave ? '<li><h3>Pague por Pix</h3>' +
      '<p class="dica">Chave Pix (' + ROTULO_PIX[cfg.pixTipo] + ')' + (cfg.pixNome ? ' · em nome de ' + esc(cfg.pixNome) : '') + '</p>' +
      '<div class="copia"><code>' + esc(cfg.pixChave) + '</code><button class="btn peq" type="button" data-copiar="' + esc(cfg.pixChave) + '">Copiar chave</button></div>' +
      (cc ? '<p class="dica">Ou use o Pix copia e cola, que já vem com o valor de ' + brl(total) + ':</p><div class="copia-cc"><textarea id="pix-cc" class="cc-campo" readonly rows="4" aria-label="Código Pix copia e cola">' + esc(cc) + '</textarea><button class="btn peq" type="button" data-copiar="' + esc(cc) + '" data-alvo="pix-cc">Copiar código</button></div>' : '') +
      (cc && qrSVG(cc) ? '<div class="qr-pix">' + qrSVG(cc, 'QR Code Pix de ' + brl(total)) + '<p>Tá no computador ou no celular de outra pessoa? Escaneie com o app do banco.</p></div>' : '') +
    '</li>' : '';
  abrirFolha('pedido',
    '<div class="folha-cab">' + cabFolha('Seu pedido') +
      '<div class="chips">' + nums.map(n => '<span class="chip-num">' + n + '<button type="button" data-acao="tirar" data-num="' + n + '" aria-label="Tirar o ' + n + '">×</button></span>').join('') + '</div>' +
      '<p class="total-linha"><span>' + nums.length + ' × ' + brl(cfg.preco) + '</span><span class="num">' + brl(total) + '</span></p>' +
    '</div><div class="perfura" aria-hidden="true"></div>' +
    '<div class="folha-corpo">' +
      '<div class="campo"><label for="p-nome">Seu nome</label><input id="p-nome" type="text" autocomplete="name" placeholder="Nome e sobrenome" value="' + esc(ui.nomeComprador) + '"><p class="erro" id="p-nome-erro" hidden>Escreva seu nome pra eu saber de quem é o pedido.</p></div>' +
      '<ol class="passos">' + pix +
        '<li><h3>Me mande o pedido</h3><p>O WhatsApp abre com a mensagem pronta.' + (cfg.pixChave ? ' Manda o comprovante na mesma conversa.' : ' Lá a gente combina o pagamento.') + '</p>' +
          '<a class="btn primario largo" id="p-wa" href="' + esc(linkWa(cfg.whatsapp, msgPedido(ui.nomeComprador || '', nums))) + '" target="_blank" rel="noopener">Enviar pedido no WhatsApp</a>' +
          '<p class="dica">Se o WhatsApp não abrir, mande a mensagem pro número <span class="num">' + esc(foneBonito(cfg.whatsapp)) + '</span> · <button class="link" type="button" data-copiar="' + esc(soDigitos(cfg.whatsapp)) + '">copiar número</button></p></li>' +
      '</ol>' +
      '<p class="nota">⏳ Depois que você me manda o pedido, eu seguro esses números pra você por ' + esc(prazoTexto()) + '. Eles ficam seus quando eu confirmar o pagamento, e aí eu te mando o bilhete digital de cada número pelo WhatsApp. Se o pagamento não chegar nesse prazo, os números voltam a ficar livres.</p>' +
    '</div>');
  const nome = $('#p-nome');
  nome.addEventListener('input', () => {
    ui.nomeComprador = nome.value;
    $('#p-wa').href = linkWa(cfg.whatsapp, msgPedido(nome.value.trim(), ordenar(ui.sel)));
    if (nome.value.trim()) $('#p-nome-erro').hidden = true;
  });
}

/* compartilhar */
function abrirCompartilhar() {
  const daDona = ui.ehDona;
  const texto = msgDivulgar(daDona);
  abrirFolha('compartilhar',
    '<div class="folha-cab">' + cabFolha(daDona ? 'Divulgar a rifa' : 'Compartilhar') + '</div>' +
    '<div class="folha-corpo">' +
      (cfg.link
        ? '<div class="campo"><span class="rotulo">Link da página</span><div class="copia"><code>' + esc(cfg.link) + '</code><button class="btn peq" type="button" data-copiar="' + esc(cfg.link) + '">Copiar</button></div></div>'
        : '<p class="dica">O link aparece aqui assim que a página estiver publicada.</p>') +
      '<div class="campo"><span class="rotulo">Mensagem pronta</span><p class="nota">' + esc(texto).replace(/\n/g, '<br>') + '</p></div>' +
      '<div class="linha-botoes"><a class="btn primario" href="' + esc('https://wa.me/?text=' + encodeURIComponent(texto)) + '" target="_blank" rel="noopener">Mandar no WhatsApp</a><button class="btn" type="button" data-copiar="' + esc(texto) + '">Copiar mensagem</button></div>' +
      (daDona && !TEM_SB ? '<p class="dica">Pra quem não tem conta no Claude conseguir abrir, deixe a página compartilhada por link público (menu Compartilhar do artifact).</p>' : '') +
    '</div>');
}

/* ---------- painel da vendedora ---------- */
function renderAdmin() {
  $('#app').innerHTML =
    '<div class="wrap adm">' +
      '<header class="adm-cab"><div><p class="rot">Painel da vendedora · só você vê</p><h1>' + esc(cfg.titulo) + '</h1></div>' +
      '<div class="adm-acoes"><button class="btn peq" type="button" data-acao="ver-pub">Ver como comprador</button><button class="btn peq" type="button" data-acao="compartilhar">Divulgar</button>' + (SB ? '<button class="btn peq fantasma" type="button" data-acao="sair">Sair</button>' : '') + '</div></header>' +
      '<div id="avisos"></div>' +
      '<section id="resumo" class="resumo" aria-label="Resumo das vendas"></section>' +
      '<details class="prazos"><summary>Prazos da Formô</summary><ul>' +
        '<li><strong>Até ' + dataBR(cfg.fimVendas) + ':</strong> último dia de vendas, e a comissão manda o controle dos blocos pra Formô.</li>' +
        '<li><strong>' + esc(cfg.conferencia) + ':</strong> o boleto dos blocos aparece na lojinha do app da Formô e <strong>vence em 1 dia</strong>. Você paga o bloco inteiro, vendido ou não.</li>' +
        '<li><strong>' + dataBR(cfg.sorteio) + ':</strong> sorteio ao vivo no ' + esc(cfg.instagram) + '. Se um número seu sair, é você quem avisa o comprador.</li>' +
        '<li>Boleto em aberto ou parcelas da formatura atrasadas tiram seus números do sorteio, e quem comprou de você perde a chance.</li>' +
      '</ul></details>' +
      '<nav class="abas" role="tablist" aria-label="Seções do painel">' +
        [['vendas', 'Vendas'], ['numeros', 'Números'], ['mensagens', 'Mensagens'], ['ajustes', 'Ajustes']].map(a => '<button type="button" role="tab" class="aba" data-aba="' + a[0] + '" aria-selected="' + (ui.aba === a[0]) + '">' + a[1] + '</button>').join('') +
      '</nav>' +
      '<section id="aba-corpo"></section>' +
    '</div>';
  renderAvisos(); renderResumo(); renderAba();
}
function renderAvisos() {
  const el = $('#avisos'); if (!el) return;
  let h = '';
  if (!cfg.pronto) h += '<div class="aviso alerta"><div><strong>Falta pouco pra abrir as vendas.</strong><p>Preencha seu WhatsApp e o Pix em Ajustes, confira seus números e salve. Até lá, quem abre o link vê os prêmios e um aviso de “em breve”.</p></div></div>';
  if (erroVendas) h += '<div class="aviso alerta"><p>' + esc(erroVendas) + '</p></div>';
  const nVenc = vendasCarregadas ? vendas.filter(vencida).length : 0;
  if (nVenc) h += '<div class="aviso alerta"><div><strong>' + nVenc + ' ' + plural(nVenc, 'reserva passou', 'reservas passaram') + ' do prazo de ' + esc(prazoTexto()) + ' sem pagamento.</strong><p>Cobre de novo ou libere os números pra outras pessoas.</p></div><button class="btn peq" type="button" data-acao="ver-vencidas">Ver ' + plural(nVenc, 'reserva', 'reservas') + '</button></div>';
  const p = pendentes();
  if (p > 0 && cfg.pronto) {
    h += '<div class="aviso"><div><strong>' + p + ' ' + plural(p, 'número mudou', 'números mudaram') + ' desde a última atualização da página dos compradores.</strong>' +
      '<p>' + (mudouNestaSessao ? 'Ela se atualiza sozinha quando você para de mexer uns segundos.' : 'Toque em Atualizar pra os compradores verem.') + '</p></div>' +
      '<button class="btn peq primario" type="button" data-acao="publicar-agora"' + (ui.publicando ? ' disabled' : '') + '>' + (ui.publicando ? 'Atualizando…' : 'Atualizar agora') + '</button></div>';
  }
  el.innerHTML = h;
}
function contas() {
  const mapa = mapaVendas(); let pagos = 0, aguard = 0;
  mapa.forEach((v, n) => { if (!UNI_SET.has(n)) return; if (v.pago) pagos++; else aguard++; });
  const recebido = vendas.filter(v => v.pago).reduce((s, v) => s + (v.numeros || []).length, 0) * cfg.preco;
  const areceber = vendas.filter(v => !v.pago).reduce((s, v) => s + (v.numeros || []).length, 0) * cfg.preco;
  const bilhetes = vendas.filter(v => v.pago && !v.bilhete).length;
  return { pagos, aguard, livres: UNI.length - pagos - aguard, recebido, areceber, bilhetes };
}
function renderResumo() {
  const el = $('#resumo'); if (!el) return;
  if (!vendasCarregadas && !erroVendas) { el.innerHTML = '<p>Carregando suas vendas…</p>'; return; }
  const c = contas(); const t = UNI.length || 1;
  el.innerHTML =
    '<div class="placar"><span class="placar-n num">' + (c.pagos + c.aguard) + '</span><span>de <span class="num">' + UNI.length + '</span> números com dono</span></div>' +
    '<div class="prog" role="img" aria-label="' + c.pagos + ' pagos, ' + c.aguard + ' aguardando pagamento, ' + c.livres + ' livres"><span class="p" style="width:' + (c.pagos / t * 100).toFixed(2) + '%"></span><span class="a" style="width:' + (c.aguard / t * 100).toFixed(2) + '%"></span></div>' +
    '<div class="legenda-prog"><span><i class="p"></i>' + c.pagos + ' pagos</span><span><i class="a"></i>' + c.aguard + ' aguardando</span><span><i class="l"></i>' + c.livres + ' livres</span></div>' +
    '<dl class="metricas"><div><dt>Recebido</dt><dd class="num">' + brl(c.recebido) + '</dd></div><div><dt>A receber</dt><dd class="num">' + brl(c.areceber) + '</dd></div><div><dt>Bilhetes a enviar</dt><dd class="num">' + c.bilhetes + '</dd></div></dl>';
}
function renderAba() {
  $$('.aba').forEach(b => b.setAttribute('aria-selected', String(b.dataset.aba === ui.aba)));
  const el = $('#aba-corpo'); if (!el) return;
  if (ui.aba === 'vendas') {
    el.innerHTML =
      '<div class="lista-topo"><button class="btn primario" type="button" data-acao="nova-venda">Nova venda</button>' +
      '<div class="busca-v"><label for="busca-venda" class="sr">Buscar venda</label><input id="busca-venda" type="search" placeholder="Buscar por nome ou número" value="' + esc(ui.busca) + '"></div></div>' +
      '<div class="filtros" id="filtros"></div><div id="lista" class="lista"></div>' +
      '<div class="export"><button class="btn peq" type="button" data-acao="csv">Baixar cópia da planilha (.csv)</button><p class="dica">Uma linha por número, como a lista de controle da Formô. Abre no Excel e no Google Planilhas.</p></div>';
    $('#busca-venda').addEventListener('input', e => { ui.busca = e.target.value; renderLista(); });
    renderLista();
  } else if (ui.aba === 'numeros') {
    el.innerHTML = '<p class="dica">Toque nos números livres pra registrar uma venda feita pessoalmente. Toque num número com dono pra ver de quem é.</p><div id="area-grade"></div>' +
      '<div class="legenda"><span><i class="amostra"></i>Livre</span><span><i class="amostra sel"></i>Selecionado</span><span><i class="amostra aguardando"></i>Aguardando pagamento</span><span><i class="amostra pago"></i>Pago</span></div>';
    renderGrade(true);
  } else if (ui.aba === 'mensagens') {
    el.innerHTML = htmlMensagens();
    ligarMensagens();
  } else {
    el.innerHTML = htmlAjustes();
    ligarAjustes();
  }
  renderBarra();
}
function renderLista() {
  const el = $('#lista'); if (!el) return;
  const fl = $('#filtros');
  const aReceber = vendas.filter(v => !v.pago).length, semBilhete = vendas.filter(v => v.pago && !v.bilhete).length, nVenc = vendas.filter(vencida).length;
  if (fl) fl.innerHTML = [['todas', 'Todas', vendas.length], ['receber', 'A receber', aReceber], ['vencidas', 'Reserva vencida', nVenc], ['bilhete', 'Bilhete a enviar', semBilhete]].filter(f => f[0] !== 'vencidas' || f[2] || ui.filtro === 'vencidas')
    .map(f => '<button type="button" class="filtro" data-filtro="' + f[0] + '" aria-pressed="' + (ui.filtro === f[0]) + '">' + f[1] + ' (' + f[2] + ')</button>').join('');
  if (!vendasCarregadas) { el.innerHTML = erroVendas ? '' : '<p class="dica">Carregando…</p>'; return; }
  if (!vendas.length) {
    el.innerHTML = '<div class="vazio"><strong>Nenhuma venda ainda.</strong><p class="dica">Quando um pedido chegar no WhatsApp, toque em Nova venda e cole a mensagem: o nome e os números são preenchidos sozinhos.</p></div>';
    return;
  }
  const q = ui.busca.trim().toLowerCase();
  const arr = vendas.slice()
    .filter(v => ui.filtro === 'todas' || (ui.filtro === 'receber' ? !v.pago : ui.filtro === 'vencidas' ? vencida(v) : (v.pago && !v.bilhete)))
    .filter(v => !q || String(v.nome || '').toLowerCase().includes(q) || (v.numeros || []).some(n => String(n).includes(q)) || soDigitos(v.telefone).includes(soDigitos(q) || '§'))
    .sort((a, b) => String(b.criadoEm || '').localeCompare(String(a.criadoEm || '')));
  el.innerHTML = arr.length ? arr.map(cardVenda).join('') : '<p class="dica">Nenhuma venda encontrada.</p>';
}
function cardVenda(v) {
  const nums = ordenar(v.numeros || []);
  let acoes = '';
  const venc = vencida(v);
  if (!v.pago) {
    acoes += '<button class="btn peq ok" type="button" data-acao="marcar-pago" data-venda="' + esc(v.id) + '">Marcar como pago</button>' +
      (venc ? '<button class="btn peq perigo" type="button" data-acao="liberar" data-venda="' + esc(v.id) + '">Liberar números</button>' : '') +
      '<a class="btn peq" href="' + esc(linkWa(v.telefone, msgCobranca(v))) + '" target="_blank" rel="noopener">Cobrar no WhatsApp</a>' +
      (pixCopiaECola(nums.length * cfg.preco) ? '<button class="btn peq" type="button" data-copiar="' + esc(pixCopiaECola(nums.length * cfg.preco)) + '">Copiar Pix desta venda</button>' : '');
  } else if (!v.bilhete) {
    acoes += '<a class="btn peq primario" href="' + esc(linkWa(v.telefone, msgBilhete(v))) + '" target="_blank" rel="noopener" data-acao="abriu-bilhete">Mandar bilhete no WhatsApp</a>' +
      '<button class="btn peq" type="button" data-acao="marcar-bilhete" data-venda="' + esc(v.id) + '">Já mandei o bilhete</button>';
  }
  acoes += '<button class="btn peq fantasma" type="button" data-acao="editar-venda" data-venda="' + esc(v.id) + '">Editar</button>';
  return '<article class="venda">' +
    '<div class="venda-topo"><span class="pill ' + (v.pago ? 'pago' : (venc ? 'vencida' : 'aguardando')) + '">' + (v.pago ? 'Pago' : (venc ? 'Reserva vencida' : 'Aguardando pagamento')) + '</span><span class="num">' + brl(nums.length * cfg.preco) + '</span></div>' +
    '<div><h3 class="venda-nome">' + esc(v.nome || 'Sem nome') + '</h3>' + (v.telefone ? '<span class="dica">' + esc(foneBonito(v.telefone)) + '</span>' : '') + '</div>' +
    '<div class="chips">' + nums.map(n => '<span class="chip-num">' + n + '</span>').join('') + '</div>' +
    (v.pago ? '<p class="dica">' + (v.bilhete ? 'Bilhete enviado' : 'Bilhete ainda não enviado') + '</p>' : '<p class="dica' + (venc ? ' erro' : '') + '">Reservado em ' + fmtQuando(v.criadoEm) + ' · ' + (venc ? 'o prazo acabou em ' : 'pagar até ') + fmtQuando(prazoDe(v).toISOString()) + '</p>') +
    (v.obs ? '<p class="dica">' + esc(v.obs) + '</p>' : '') +
    '<div class="venda-acoes">' + acoes + '</div></article>';
}

/* venda: nova / editar */
function lerNumeros(txt, soDoUniverso) {
  const achados = []; const re = /(\d{3,7})(?:\s*(?:-|–|a|até)\s*(\d{3,7}))?/g; let m;
  while ((m = re.exec(String(txt || '')))) {
    const a = Number(m[1]), b = m[2] ? Number(m[2]) : null;
    if (b != null && b > a && b - a <= 100 && UNI_SET.has(a) && UNI_SET.has(b)) { for (let n = a; n <= b; n++) achados.push(n); }
    else { achados.push(a); if (b != null) achados.push(b); }
  }
  let lista = Array.from(new Set(achados));
  if (soDoUniverso) lista = lista.filter(n => UNI_SET.has(n));
  return ordenar(lista);
}
function lerPedido(txt) {
  const nome = (String(txt).match(/nome\s*:\s*(.+)/i) || [])[1];
  return { nome: nome ? nome.trim() : '', numeros: lerNumeros(txt, true) };
}
function analisarNumeros(nums, idAtual) {
  const mapa = mapaVendas(); const fora = [], deOutro = [];
  nums.forEach(n => {
    if (!UNI_SET.has(n)) fora.push(n);
    else { const v = mapa.get(n); if (v && v.id !== idAtual) deOutro.push({ n, v }); }
  });
  return { fora, deOutro };
}
function abrirVenda(v, numsIniciais) {
  ui.vendaEdit = v ? v.id : null; ui.confirmarExclusao = false;
  const nums = v ? ordenar(v.numeros || []) : ordenar(numsIniciais || []);
  abrirFolha('venda',
    '<div class="folha-cab">' + cabFolha(v ? 'Editar venda' : 'Nova venda') + '</div>' +
    '<form id="f-venda" class="folha-corpo" novalidate>' +
      (v ? '' : '<details class="colar"' + (nums.length ? '' : ' open') + '><summary>Colar pedido do WhatsApp</summary><div class="campo"><label for="v-colar">Cole a mensagem que o comprador mandou</label><textarea id="v-colar" placeholder="Oi, ' + esc(cfg.vendedora) + '! Quero comprar a rifa…"></textarea><p class="dica">O nome e os números são preenchidos sozinhos.</p></div></details>') +
      '<div class="campo"><label for="v-numeros">Números</label><input id="v-numeros" type="text" inputmode="numeric" autocomplete="off" placeholder="Ex.: 19203, 19245" value="' + nums.join(', ') + '"><div id="v-numeros-info" class="dica"></div></div>' +
      '<div class="campo"><label for="v-nome">Nome do comprador</label><input id="v-nome" type="text" autocomplete="off" value="' + esc(v ? v.nome : '') + '"></div>' +
      '<div class="campo"><label for="v-tel">WhatsApp do comprador</label><input id="v-tel" type="tel" inputmode="tel" autocomplete="off" placeholder="(DDD) 99999-0000" value="' + esc(v && v.telefone ? foneBonito(v.telefone) : '') + '"><p class="dica">Opcional. Com ele, cobrar e mandar o bilhete já abrem a conversa certa.</p></div>' +
      '<label class="opcao" for="v-pago"><input id="v-pago" type="checkbox"' + (v && v.pago ? ' checked' : '') + '><span>Pagamento recebido</span></label>' +
      '<label class="opcao" for="v-bilhete"><input id="v-bilhete" type="checkbox"' + (v && v.bilhete ? ' checked' : '') + '><span>Bilhete enviado</span></label>' +
      '<div class="campo"><label for="v-obs">Observação</label><input id="v-obs" type="text" autocomplete="off" placeholder="Ex.: paga sexta, em dinheiro" value="' + esc(v ? v.obs : '') + '"></div>' +
      '<p class="erro" id="v-erro" hidden></p>' +
      '<div class="folha-rodape"><span class="num" id="v-total"></span><button class="btn primario" type="submit" id="v-salvar">Salvar venda</button></div>' +
      (v ? '<div class="zona-excluir" id="zona-excluir"></div>' : '') +
    '</form>');
  const inNum = $('#v-numeros');
  const atualizarInfo = () => {
    const ns = lerNumeros(inNum.value, false);
    const a = analisarNumeros(ns, ui.vendaEdit);
    let h = ns.length ? ns.length + ' ' + plural(ns.length, 'número', 'números') : 'Nenhum número ainda.';
    if (a.fora.length) h += '<br><span class="erro">' + listaNums(a.fora) + plural(a.fora.length, ' não está', ' não estão') + ' nos seus blocos.</span>';
    a.deOutro.forEach(o => { h += '<br><span class="erro">' + o.n + ' já é de ' + esc(o.v.nome || 'outra pessoa') + '.</span>'; });
    $('#v-numeros-info').innerHTML = h;
    $('#v-total').textContent = brl(ns.length * cfg.preco);
  };
  inNum.addEventListener('input', atualizarInfo);
  atualizarInfo();
  const colar = $('#v-colar');
  if (colar) colar.addEventListener('input', () => {
    const p = lerPedido(colar.value);
    if (p.numeros.length) inNum.value = p.numeros.join(', ');
    if (p.nome) $('#v-nome').value = p.nome;
    atualizarInfo();
  });
  renderZonaExcluir();
  $('#f-venda').addEventListener('submit', e => { e.preventDefault(); salvarVenda(); });
}
function renderZonaExcluir() {
  const z = $('#zona-excluir'); if (!z) return;
  const v = vendas.find(x => x.id === ui.vendaEdit); if (!v) return;
  z.innerHTML = ui.confirmarExclusao
    ? '<p><strong>Excluir a venda de ' + esc(v.nome || 'sem nome') + '?</strong> ' + plural((v.numeros || []).length, 'O número ', 'Os números ') + listaNums(v.numeros || []) + plural((v.numeros || []).length, ' volta', ' voltam') + ' a ficar livre' + plural((v.numeros || []).length, '', 's') + '.</p><div class="linha-botoes"><button class="btn peq" type="button" data-acao="cancelar-exclusao">Manter</button><button class="btn peq perigo" type="button" data-acao="confirmar-exclusao">Excluir venda</button></div>'
    : '<button class="btn peq fantasma perigo" type="button" data-acao="excluir-venda">Excluir venda e liberar os números</button>';
}
let salvando = false;
async function salvarVenda() {
  if (salvando) return;
  const erro = $('#v-erro');
  const mostrar = m => { erro.textContent = m; erro.hidden = false; };
  if (!caps.db || !vendasCarregadas) return mostrar('Suas vendas ainda não carregaram. Espere um pouco e tente de novo.');
  const nums = lerNumeros($('#v-numeros').value, false);
  const nome = $('#v-nome').value.trim();
  const a = analisarNumeros(nums, ui.vendaEdit);
  if (!nums.length) return mostrar('Coloque pelo menos um número.');
  if (a.fora.length) return mostrar(listaNums(a.fora) + plural(a.fora.length, ' não está', ' não estão') + ' nos seus blocos. Confira o número.');
  if (a.deOutro.length) return mostrar(a.deOutro.map(o => o.n + ' já é de ' + (o.v.nome || 'outra pessoa')).join('; ') + '. Escolha outro.');
  if (!nome) return mostrar('Escreva o nome do comprador.');
  const antiga = vendas.find(x => x.id === ui.vendaEdit);
  const agora = new Date().toISOString();
  const pago = $('#v-pago').checked;
  const doc = {
    nome, numeros: nums, telefone: soDigitos($('#v-tel').value), pago, bilhete: $('#v-bilhete').checked,
    obs: $('#v-obs').value.trim(), criadoEm: antiga ? (antiga.criadoEm || agora) : agora, atualizadoEm: agora,
    pagoEm: pago ? ((antiga && antiga.pagoEm) || agora) : null
  };
  salvando = true; $('#v-salvar').disabled = true;
  try {
    const col = caps.db.collection('vendas');
    const ref = antiga ? col.doc(antiga.id) : col.doc();
    await ref.set(doc);
    const mudouNumeros = !antiga || listaNums(antiga.numeros || []) !== listaNums(nums);
    fecharFolha();
    ui.sel.clear();
    if (ui.aba === 'numeros') renderGrade(true);
    renderBarra();
    toast(antiga ? 'Venda atualizada' : 'Venda de ' + primeiroNome(nome) + ' salva');
    if (mudouNumeros) agendarPublicacao();
  } catch (e) {
    mostrar(msgErro(e, 'Não consegui salvar agora. Confira a internet e tente de novo.'));
  } finally { salvando = false; const b = $('#v-salvar'); if (b) b.disabled = false; }
}
async function excluirVenda() {
  const v = vendas.find(x => x.id === ui.vendaEdit);
  if (!v || !caps.db) return;
  try { await caps.db.collection('vendas').doc(v.id).delete(); fecharFolha(); toast('Venda excluída. Os números ficaram livres.'); agendarPublicacao(); }
  catch (e) { toast(msgErro(e, 'Não consegui excluir agora. Tente de novo.')); }
}
const ocupadoDoc = new Set();
async function atualizarVenda(id, campos, msg) {
  if (!caps.db || ocupadoDoc.has(id)) return;
  ocupadoDoc.add(id);
  try { await caps.db.collection('vendas').doc(id).update(Object.assign({ atualizadoEm: new Date().toISOString() }, campos)); toast(msg); }
  catch (e) { toast(msgErro(e, 'Não consegui salvar agora. Tente de novo.')); }
  finally { ocupadoDoc.delete(id); }
}

/* ajustes */
function htmlAjustes() {
  const tipos = [['celular', 'Celular'], ['email', 'E-mail'], ['cpf', 'CPF ou CNPJ'], ['aleatoria', 'Chave aleatória']];
  return '<form id="f-ajustes" class="ajustes" novalidate>' +
    '<fieldset><legend>Seus dados</legend>' +
      '<div class="campo"><label for="a-vendedora">Seu nome (como os compradores te chamam)</label><input id="a-vendedora" type="text" value="' + esc(cfg.vendedora) + '"></div>' +
      '<div class="campo"><label for="a-whatsapp">Seu WhatsApp, com DDD</label><input id="a-whatsapp" type="tel" inputmode="tel" placeholder="(DDD) 99999-0000" value="' + esc(cfg.whatsapp ? foneBonito(cfg.whatsapp) : '') + '"><p class="dica">Os pedidos chegam nesse número.</p></div>' +
    '</fieldset>' +
    '<fieldset><legend>Pix</legend>' +
      '<div class="campo"><label for="a-pix-tipo">Tipo de chave</label><select id="a-pix-tipo">' + tipos.map(t => '<option value="' + t[0] + '"' + (cfg.pixTipo === t[0] ? ' selected' : '') + '>' + t[1] + '</option>').join('') + '</select></div>' +
      '<div class="campo"><label for="a-pix-chave">Chave Pix</label><input id="a-pix-chave" type="text" autocomplete="off" value="' + esc(cfg.pixChave) + '"><p class="dica">A chave aparece pra quem abrir a página. Se puder, use celular, e-mail ou chave aleatória em vez de CPF.</p></div>' +
      '<div class="campo"><label for="a-pix-nome">Nome do recebedor</label><input id="a-pix-nome" type="text" autocomplete="off" placeholder="Como aparece no seu banco" value="' + esc(cfg.pixNome) + '"></div>' +
      '<div class="campo"><label for="a-pix-cidade">Sua cidade</label><input id="a-pix-cidade" type="text" autocomplete="off" value="' + esc(cfg.pixCidade) + '"></div>' +
      '<div class="campo" id="a-pix-teste"></div>' +
    '</fieldset>' +
    '<fieldset><legend>Rifa</legend>' +
      '<div class="campo"><label for="a-preco">Valor de cada número (R$)</label><input id="a-preco" type="text" inputmode="decimal" value="' + String(cfg.preco).replace('.', ',') + '"></div>' +
      '<div class="campo"><label for="a-faixas">Seus números</label><input id="a-faixas" type="text" autocomplete="off" value="' + esc(cfg.faixas) + '"><p class="dica">Escreva o primeiro e o último número de cada sequência, separados por vírgula. Ex.: 19201-19300, 19351-19500. Confira na lista de blocos do PDF da Formô.</p><p class="blocos-prev" id="a-faixas-info"></p></div>' +
      '<div class="campo"><label for="a-titulo">Título da página</label><input id="a-titulo" type="text" value="' + esc(cfg.titulo) + '"></div>' +
      '<div class="campo"><label for="a-link">Link pra divulgar</label><input id="a-link" type="text" inputmode="url" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="https://tinyurl.com/..." value="' + esc(cfg.link) + '"><p class="dica">É o link do botão “Copiar link” e das mensagens de divulgação.</p></div>' +
      '<div class="campo"><label for="a-prazo">Prazo pra pagar uma reserva</label><select id="a-prazo">' + [12, 24, 48, 72].map(h => '<option value="' + h + '"' + (Number(cfg.prazoReserva || 24) === h ? ' selected' : '') + '>' + (h >= 48 ? (h / 24) + ' dias' : h + ' horas') + '</option>').join('') + '</select><p class="dica">Depois desse prazo sem pagamento, a venda aparece como “Reserva vencida” pra você cobrar ou liberar os números.</p></div>' +
      '<label class="opcao" for="a-contador"><input id="a-contador" type="checkbox"' + (cfg.mostrarContador ? ' checked' : '') + '><span>Mostrar quantos números ainda estão livres</span></label>' +
    '</fieldset>' +
    '<p class="erro" id="a-erro" hidden></p>' +
    '<button class="btn primario largo" type="submit" id="a-salvar">' + (cfg.pronto ? 'Salvar e atualizar a página' : 'Salvar e abrir as vendas') + '</button>' +
  '</form>';
}
function lerPreco(s) { const v = Number(String(s || '').replace(/[^\d,\.]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')); return isFinite(v) ? Math.round(v * 100) / 100 : 0; }
function ligarAjustes() {
  const info = () => {
    const r = lerFaixas($('#a-faixas').value);
    const bl = montarBlocos(r.nums);
    $('#a-faixas-info').innerHTML = r.erros.length
      ? '<span class="erro">Não entendi: ' + esc(r.erros.join(', ')) + '</span>'
      : r.nums.length + ' números em ' + bl.length + ' ' + plural(bl.length, 'bloco', 'blocos') + ': ' + bl.map(b => b.ini + '–' + b.fim).join(', ');
  };
  const teste = () => {
    const tmp = Object.assign({}, cfg); const preco = lerPreco($('#a-preco').value) || cfg.preco;
    cfg = Object.assign(cfg, { pixTipo: $('#a-pix-tipo').value, pixChave: $('#a-pix-chave').value.trim(), pixNome: $('#a-pix-nome').value.trim(), pixCidade: $('#a-pix-cidade').value.trim(), vendedora: $('#a-vendedora').value.trim() || tmp.vendedora });
    const cc = pixCopiaECola(preco);
    cfg = tmp;
    $('#a-pix-teste').innerHTML = cc
      ? '<span class="rotulo">Teste o seu Pix</span><div class="copia-cc"><textarea id="pix-cc-teste" class="cc-campo" readonly rows="4" aria-label="Código Pix de teste">' + esc(cc) + '</textarea><button class="btn peq" type="button" data-copiar="' + esc(cc) + '" data-alvo="pix-cc-teste">Copiar código</button></div>' + (qrSVG(cc) ? '<div class="qr-pix">' + qrSVG(cc, 'QR Code Pix de teste') + '<p>Dá pra testar escaneando com o celular de outra pessoa.</p></div>' : '') + '<p class="dica">Peça pra alguém colar esse código em “Pix copia e cola” no app do banco dela: tem que aparecer seu nome e ' + brl(preco) + '. Não precisa pagar, é só conferir e cancelar. No app da mesma conta da chave, o banco pode recusar, porque não dá pra fazer Pix pra você mesma.</p>'
      : '';
  };
  $('#a-faixas').addEventListener('input', info);
  ['#a-pix-tipo', '#a-pix-chave', '#a-pix-nome', '#a-pix-cidade', '#a-preco', '#a-vendedora'].forEach(s => $(s).addEventListener('input', teste));
  info(); teste();
  $('#f-ajustes').addEventListener('submit', e => { e.preventDefault(); salvarAjustes(); });
}
async function salvarAjustes() {
  const erro = $('#a-erro');
  const mostrar = m => { erro.textContent = m; erro.hidden = false; erro.scrollIntoView({ block: 'center' }); };
  const novo = Object.assign({}, cfg, {
    vendedora: $('#a-vendedora').value.trim(), whatsapp: soDigitos($('#a-whatsapp').value),
    pixTipo: $('#a-pix-tipo').value, pixChave: $('#a-pix-chave').value.trim(), pixNome: $('#a-pix-nome').value.trim(), pixCidade: $('#a-pix-cidade').value.trim(),
    preco: lerPreco($('#a-preco').value), faixas: $('#a-faixas').value.trim(),
    titulo: $('#a-titulo').value.trim() || CFG_PADRAO.titulo,
    link: (() => { const l = (($('#a-link') || {}).value || '').trim().replace(/\s+/g, ''); return l && !/^https?:\/\//i.test(l) ? 'https://' + l : l; })(),
    mostrarContador: $('#a-contador').checked, prazoReserva: Number($('#a-prazo').value) || 24, pronto: true
  });
  if (!novo.vendedora) return mostrar('Escreva seu nome.');
  if (novo.link && !/^https?:\/\/[^\s.]+\.[^\s]+$/i.test(novo.link)) return mostrar('Confira o link pra divulgar. Ex.: https://tinyurl.com/rifadageo');
  const wd = soDigitos(novo.whatsapp);
  if (wd.length < 10 || wd.length > 13) return mostrar('Confira seu WhatsApp: coloque o DDD e o número.');
  if (!(novo.preco > 0)) return mostrar('Coloque o valor de cada número.');
  const r = lerFaixas(novo.faixas);
  if (r.erros.length || !r.nums.length) return mostrar('Confira seus números: escreva as faixas como 19201-19500.');
  if (!vendasCarregadas && caps.db) return mostrar('Suas vendas ainda estão carregando. Tente de novo em alguns segundos.');
  const novoSet = new Set(r.nums);
  const perdidos = Array.from(ocupadosAtuais()).filter(n => !novoSet.has(n));
  if (perdidos.length) return mostrar(plural(perdidos.length, 'O número ', 'Os números ') + listaNums(perdidos).slice(0, 80) + plural(perdidos.length, ' já foi vendido e ficaria', ' já foram vendidos e ficariam') + ' de fora. Exclua essas vendas antes ou inclua esses números.');
  $('#a-salvar').disabled = true;
  const ok = await publicar(novo, 'Ajustes salvos. A página dos compradores já foi atualizada.');
  if (!ok) { const b = $('#a-salvar'); if (b) b.disabled = false; }
}

/* ---------- publicação da página ---------- */
function montarDocumento(est) {
  const json = JSON.stringify(est).replace(/</g, '\\u003c').split(String.fromCharCode(0x2028)).join('\\u2028').split(String.fromCharCode(0x2029)).join('\\u2029');
  return PREFIXO + '\n' + CABECA +
    '<style id="css">' + $('#css').textContent + '</style><div id="app"></div>' +
    '<script id="midia" type="application/json">' + $('#midia').textContent + '<\/script>' +
    '<script id="estado" type="application/json">' + json + '<\/script>' +
    '<script id="programa">' + $('#programa').textContent + '<\/script>\n\n</body></html>';
}
async function publicar(cfgNovo, msg) {
  if (TEM_SB) return salvarConfigSB(cfgNovo, msg);
  if (!caps.artifact) { toast('Não consegui atualizar a página nesta tela. Abra pelo app do Claude, na sua conta.'); return false; }
  if (ui.publicando) return false;
  const c = cfgNovo || cfg;
  const uni = new Set(lerFaixas(c.faixas).nums);
  const base = (caps.db && vendasCarregadas) ? ocupadosAtuais() : new Set(ocupadosPub);
  const est = { v: 1, cfg: c, ocupados: ordenar(base).filter(n => uni.has(n)), atualizado: new Date().toISOString() };
  ui.publicando = true; clearTimeout(timerPub); renderAvisos();
  try { sessionStorage.setItem('rifa-toast', msg || 'Página dos compradores atualizada'); sessionStorage.setItem('rifa-aba', ui.aba); } catch (e) { /* sem armazenamento */ }
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    try { await caps.artifact.publish(montarDocumento(est)); return true; }
    catch (e) {
      const code = e && e.code;
      if (code === 'upstream_error' && tentativa === 0) { await new Promise(r => setTimeout(r, 800 + Math.random() * 1200)); continue; }
      ui.publicando = false;
      try { sessionStorage.removeItem('rifa-toast'); } catch (e2) { /* nada */ }
      if (code === 'conflict') return false;
      if (code === 'rate_limited') toast('Muitas atualizações seguidas. Tente de novo daqui a um minuto.');
      else if (code === 'not_writer' || code === 'not_granted' || code === 'consent_required' || code === 'capability_disabled' || code === 'not_declared') toast('Esta tela não pode atualizar a página. Abra pelo app do Claude, na sua conta.');
      else toast('Não consegui atualizar a página agora. Tente de novo.');
      renderAvisos();
      return false;
    }
  }
  return false;
}
function agendarPublicacao() {
  mudouNestaSessao = true;
  clearTimeout(timerPub);
  timerPub = setTimeout(autoPublicar, 15000);
  renderAvisos();
}
function autoPublicar() {
  if (ui.folha || document.hidden || ui.publicando) { timerPub = setTimeout(autoPublicar, 8000); return; }
  if (pendentes() > 0) publicar(null, 'Página dos compradores atualizada');
}
document.addEventListener('pointerdown', () => { if (timerPub && mudouNestaSessao && !ui.publicando) { clearTimeout(timerPub); timerPub = setTimeout(autoPublicar, 15000); } }, true);

/* ---------- planilha ---------- */
async function baixarCSV() {
  if (!caps.downloads) { toast('Não dá pra baixar arquivos nesta tela.'); return; }
  const mapa = mapaVendas();
  const cel = s => { let t = String(s == null ? '' : s); if (/^[=+\-@]/.test(t)) t = "'" + t; return /[";\r\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; };
  const linhas = [['Número', 'Bloco', 'Comprador', 'Telefone', 'Situação', 'Bilhete enviado', 'Observação']];
  BLOCOS.forEach(b => b.nums.forEach(n => {
    const v = mapa.get(n);
    linhas.push([n, b.ini + ' a ' + b.fim, v ? v.nome : '', v && v.telefone ? foneBonito(v.telefone) : '', v ? (v.pago ? 'Pago' : 'Aguardando pagamento') : 'Livre', v ? (v.bilhete ? 'Sim' : 'Não') : '', v ? v.obs : '']);
  }));
  const csv = '﻿' + linhas.map(l => l.map(cel).join(';')).join('\r\n');
  const hoje = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }).split('/').reverse().join('-');
  try { const r = await caps.downloads.save({ filename: 'rifa-controle-' + hoje + '.csv', data: csv }); if (r && r.status === 'saved') toast('Planilha salva'); }
  catch (e) { if (!e || e.code !== 'declined') toast('Não consegui gerar a planilha agora.'); }
}

/* ---------- cliques ---------- */
document.addEventListener('click', e => {
  if (e.target.id === 'fundo') { fecharFolha(); return; }
  const t = e.target.closest('[data-n],[data-bloco],[data-acao],[data-copiar],[data-aba],[data-filtro],[data-ponto],[data-inserir]');
  if (!t) return;
  if (t.dataset.copiar != null) { copiar(t.dataset.copiar, t.dataset.alvo); return; }
  if (t.dataset.inserir) {
    const ta = document.getElementById(t.dataset.alvo); if (!ta) return;
    const usou = ta.dataset.mexeu === '1';
    const i0 = usou && ta.selectionStart != null ? ta.selectionStart : ta.value.length, i1 = usou && ta.selectionEnd != null ? ta.selectionEnd : i0;
    ta.value = ta.value.slice(0, i0) + t.dataset.inserir + ta.value.slice(i1);
    ta.focus(); ta.setSelectionRange(i0 + t.dataset.inserir.length, i0 + t.dataset.inserir.length);
    ta.dispatchEvent(new Event('input')); return;
  }
  if (t.dataset.n) { tocarNumero(Number(t.dataset.n)); return; }
  if (t.dataset.bloco) { ui.bloco = Number(t.dataset.bloco); renderGrade(ui.modo === 'admin'); return; }
  if (t.dataset.aba) { ui.aba = t.dataset.aba; try { sessionStorage.setItem('rifa-aba', ui.aba); } catch (e2) { /* nada */ } if (ui.aba !== 'numeros') ui.sel.clear(); renderAba(); return; }
  if (t.dataset.filtro) { ui.filtro = t.dataset.filtro; renderLista(); return; }
  if (t.dataset.ponto) { if (irPremio) { pausarCarrossel(); irPremio(Number(t.dataset.ponto), true); } return; }
  const id = t.dataset.venda;
  switch (t.dataset.acao) {
    case 'bloco-ant': ui.bloco--; renderGrade(ui.modo === 'admin'); break;
    case 'bloco-prox': ui.bloco++; renderGrade(ui.modo === 'admin'); break;
    case 'sorte': escolherPraMim(); break;
    case 'prem-ant': if (irPremio) { pausarCarrossel(); irPremio(irPremio.atual() - 1, true); } break;
    case 'prem-prox': if (irPremio) { pausarCarrossel(); irPremio(irPremio.atual() + 1, true); } break;
    case 'ir-escolha': { const s = $('#escolha'); if (s) s.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); break; }
    case 'limpar-sel': { const ant = Array.from(ui.sel); ui.sel.clear(); ant.forEach(atualizarCel); renderBarra(); break; }
    case 'continuar': if (ui.modo === 'admin') abrirVenda(null, Array.from(ui.sel)); else abrirPedido(); break;
    case 'tirar': ui.sel.delete(Number(t.dataset.num)); atualizarCel(Number(t.dataset.num)); if (ui.sel.size) abrirPedido(); else fecharFolha(); break;
    case 'fechar': fecharFolha(); break;
    case 'compartilhar': abrirCompartilhar(); break;
    case 'ver-pub': ui.modo = 'publico'; ui.sel.clear(); window.scrollTo(0, 0); render(); break;
    case 'painel': ui.modo = 'admin'; ui.sel.clear(); window.scrollTo(0, 0); render(); break;
    case 'nova-venda': abrirVenda(null, []); break;
    case 'editar-venda': { const v = vendas.find(x => x.id === id); if (v) abrirVenda(v); break; }
    case 'marcar-pago': atualizarVenda(id, { pago: true, pagoEm: new Date().toISOString() }, 'Marcado como pago'); break;
    case 'marcar-bilhete': atualizarVenda(id, { bilhete: true }, 'Bilhete marcado como enviado'); break;
    case 'abriu-bilhete': toast('Depois de mandar as imagens, toque em “Já mandei o bilhete”.'); break;
    case 'excluir-venda': ui.confirmarExclusao = true; renderZonaExcluir(); break;
    case 'cancelar-exclusao': ui.confirmarExclusao = false; renderZonaExcluir(); break;
    case 'confirmar-exclusao': excluirVenda(); break;
    case 'publicar-agora':
      if (!vendasCarregadas) { toast('Espere suas vendas carregarem.'); break; }
      publicar(null, 'Página dos compradores atualizada'); break;
    case 'csv': baixarCSV(); break;
    case 'sair': sair(); break;
    case 'recarregar': location.reload(); break;
    case 'liberar': { const v = vendas.find(x => x.id === id); if (v) { abrirVenda(v); ui.confirmarExclusao = true; renderZonaExcluir(); const z = $('#zona-excluir'); if (z) z.scrollIntoView({ block: 'center' }); } break; }
    case 'ver-vencidas': ui.aba = 'vendas'; ui.filtro = 'vencidas'; renderAba(); { const l = $('#lista'); if (l) l.scrollIntoView({ block: 'start' }); } break;
    case 'msg-original': { const k = t.dataset.msg, ta = $('#m-' + k); if (ta) { ta.value = MSGS_PADRAO[k]; previaMsg(k); toast('Texto original de volta. Toque em Salvar mensagens pra valer.'); } break; }
  }
});
document.addEventListener('click', e => {
  const a = e.target.closest('#p-wa');
  if (!a) return;
  const nome = $('#p-nome');
  if (nome && !nome.value.trim()) { e.preventDefault(); $('#p-nome-erro').hidden = false; nome.focus(); }
});
document.addEventListener('submit', e => {
  if (e.target.id !== 'f-busca') return;
  e.preventDefault();
  const v = Number(soDigitos($('#busca-num').value));
  if (!v) return;
  if (!UNI_SET.has(v)) { toast('O ' + v + ' não está entre os meus números. Os meus são: ' + faixasTexto() + '.'); return; }
  irPara(v);
  if (ocupadosPub.has(v)) toast('O ' + v + ' já tem dono. Escolha outro.');
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && ui.folha) fecharFolha(); });

function tocarNumero(n) {
  if (ui.modo === 'admin') {
    const v = mapaVendas().get(n);
    if (v) { abrirVenda(v); return; }
  } else {
    if (ocupadosPub.has(n)) { toast('O ' + n + ' já tem dono. Escolha outro.'); return; }
    if (!cfg.pronto || vendasEncerradas()) return;
  }
  if (ui.sel.has(n)) ui.sel.delete(n); else ui.sel.add(n);
  atualizarCel(n); renderBarra();
}
function escolherPraMim() {
  const livres = UNI.filter(n => !estaOcupado(n) && !ui.sel.has(n));
  if (!livres.length) { toast('Não sobrou número livre.'); return; }
  const n = livres[Math.floor(Math.random() * livres.length)];
  ui.sel.add(n); irPara(n); renderBarra();
  toast('Separei o ' + n + ' pra você!');
}

/* ---------- vendas ao vivo ---------- */
setInterval(() => { if (ui.modo === 'admin' && !ui.folha && vendasCarregadas) { renderAvisos(); if (ui.aba === 'vendas') renderLista(); } }, 120000);
function aoMudarVendas() {
  if (SB && PAGINA === 'admin') sincronizarPublico();
  if (ui.modo !== 'admin') return;
  renderAvisos(); renderResumo();
  if (ui.aba === 'vendas') renderLista();
  else if (ui.aba === 'numeros') renderGrade(true);
  if (ui.folha === 'venda') { const i = $('#v-numeros'); if (i) i.dispatchEvent(new Event('input')); renderZonaExcluir(); }
}
function render() {
  if (ui.modo === 'admin') renderAdmin(); else renderPublico();
  renderBarra();
}
async function conectar() {
  if (PAGINA === 'admin') { await conectarSB(); return; }
  if (!window.claude || typeof window.claude.use !== 'function') return;
  try {
    const user = await window.claude.use('user');
    const dona = user ? await user.isOwner() : false;
    if (!dona) return;
    ui.ehDona = true;
    const res = await Promise.all([window.claude.use('db'), window.claude.use('artifact'), window.claude.use('downloads')]);
    caps = { db: res[0], artifact: res[1], downloads: res[2] };
    let aba = null; try { aba = sessionStorage.getItem('rifa-aba'); sessionStorage.removeItem('rifa-aba'); } catch (e) { /* nada */ }
    ui.aba = !cfg.pronto ? 'ajustes' : (aba || ui.aba);
    ui.modo = 'admin'; ui.sel.clear();
    render();
    if (caps.db) {
      caps.db.collection('vendas').onSnapshot(snap => {
        vendas = snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
        if (!snap.metadata.fromCache) vendasCarregadas = true;
        erroVendas = '';
        aoMudarVendas();
      }, () => { erroVendas = 'Não consegui carregar suas vendas agora. Recarregue a página.'; renderAvisos(); renderResumo(); });
    } else {
      erroVendas = 'Seu caderno de vendas não abriu nesta tela. Abra a página pelo app do Claude, na sua conta.';
      renderAvisos(); renderResumo();
    }
  } catch (e) { /* segue como comprador */ }
}

/* ---------- versão publicada fora do Claude (GitHub Pages): busca o estado mais recente ---------- */
async function buscarEstadoExterno() {
  if (!/^https?:$/.test(location.protocol) || window.claude || PAGINA === 'admin') return;
  if (TEM_SB && await buscarEstadoSB()) return;
  try {
    const r = await fetch(RAIZ + 'estado.json?t=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) return;
    const e = await r.json();
    if (!e || !e.cfg) return;
    aplicarEstado(e);
  } catch (err) { /* segue com o estado embutido */ }
}
if (TEM_SB && PAGINA !== 'admin') {
  setInterval(() => { if (!document.hidden) buscarEstadoSB(); }, 45000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) buscarEstadoSB(); });
}

/* =====================================================================
   Versão do site (GitHub Pages) com banco de dados no Supabase
   ===================================================================== */
const SB_TABELA = 'vendas';
const CAMPOS_VENDA = { nome: 'nome', telefone: 'telefone', numeros: 'numeros', pago: 'pago', bilhete: 'bilhete', obs: 'obs', criadoEm: 'criado_em', atualizadoEm: 'atualizado_em', pagoEm: 'pago_em' };
function paraLinha(d) {
  const r = {};
  Object.keys(CAMPOS_VENDA).forEach(k => { if (k in d) r[CAMPOS_VENDA[k]] = d[k]; });
  if (r.numeros) r.numeros = r.numeros.map(Number);
  return r;
}
function daLinha(r) {
  const d = {};
  Object.keys(CAMPOS_VENDA).forEach(k => { d[k] = r[CAMPOS_VENDA[k]]; });
  d.numeros = (d.numeros || []).map(Number); d.obs = d.obs || ''; d.telefone = d.telefone || '';
  return d;
}
function falhaSB(error) {
  const e = new Error((error && error.message) || 'erro');
  const m = String((error && error.message) || '');
  e.code = (error && (error.code === 'PGRST301' || error.code === 'PGRST303' || /jwt|token|not authenticated/i.test(m))) ? 'sessao' : (error && error.code) || 'erro';
  return e;
}
function msgErro(e, padrao) {
  const t = String((e && (e.message || e.code)) || '');
  if (e && e.code === 'quota_exceeded') return 'O caderno de vendas encheu. Me chama no Claude que eu resolvo.';
  if (t.includes('numero_ocupado')) return 'Um desses números acabou de ser registrado em outra venda. Confira e escolha outro.';
  if (e && e.code === 'sessao') return 'Sua sessão expirou. Saia e entre de novo no painel.';
  return padrao;
}
function novoId() {
  if (window.crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); });
}

/* caderno de vendas no Supabase, com a mesma "cara" do banco do Claude (collection/doc/onSnapshot) */
function dbSupabase() {
  const ouvintes = [];
  let carregando = false, deNovo = false, canal = null;
  async function carregar() {
    if (carregando) { deNovo = true; return; }
    carregando = true;
    try {
      do {
        deNovo = false;
        const { data, error } = await SB.from(SB_TABELA).select('*').order('criado_em', { ascending: false });
        if (error) throw falhaSB(error);
        const snap = { docs: (data || []).map(r => ({ id: r.id, data: () => daLinha(r) })), metadata: { fromCache: false } };
        ouvintes.forEach(o => { try { o.ok(snap); } catch (e) { /* nada */ } });
      } while (deNovo);
    } catch (e) {
      ouvintes.forEach(o => { if (o.erro) o.erro(e); });
    } finally { carregando = false; }
  }
  const col = {
    doc(id) {
      const docId = id || novoId();
      return {
        id: docId,
        async set(d) { const { error } = await SB.from(SB_TABELA).upsert(Object.assign({ id: docId }, paraLinha(d))); if (error) throw falhaSB(error); carregar(); },
        async update(c) { const { error } = await SB.from(SB_TABELA).update(paraLinha(c)).eq('id', docId); if (error) throw falhaSB(error); carregar(); },
        async delete() { const { error } = await SB.from(SB_TABELA).delete().eq('id', docId); if (error) throw falhaSB(error); carregar(); }
      };
    },
    onSnapshot(ok, erro) {
      ouvintes.push({ ok, erro });
      carregar();
      if (!canal) {
        try { canal = SB.channel('vendas-painel').on('postgres_changes', { event: '*', schema: 'public', table: SB_TABELA }, () => carregar()).subscribe(); } catch (e) { /* segue com a checagem periódica */ }
        setInterval(() => { if (!document.hidden) carregar(); }, 60000);
        document.addEventListener('visibilitychange', () => { if (!document.hidden) carregar(); });
      }
      return () => {};
    }
  };
  return { collection() { return col; } };
}

/* baixar arquivos direto no navegador (planilha .csv) */
function downloadsNavegador() {
  return {
    async save(o) {
      const blob = new Blob([o.data], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = o.filename; a.rel = 'noopener';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      return { status: 'saved' };
    }
  };
}

/* página pública e painel usam a mesma lista de números ocupados */
function sincronizarPublico() {
  if (!vendasCarregadas) return;
  ocupadosPub.clear(); ocupadosAtuais().forEach(n => ocupadosPub.add(n));
  atualizadoPub = new Date().toISOString();
}

/* salvar ajustes e mensagens (no lugar de republicar a página) */
async function salvarConfigSB(cfgNovo, msg) {
  if (!SB) { toast('O painel não está conectado ao banco de dados.'); return false; }
  if (ui.publicando) return false;
  const c = Object.assign({}, cfgNovo || cfg);
  ui.publicando = true;
  try {
    const { error } = await SB.from('config').upsert({ id: 1, dados: c });
    if (error) throw falhaSB(error);
    cfg = Object.assign({}, CFG_PADRAO, c);
    definirUniverso();
    sincronizarPublico();
    ui.publicando = false;
    const y = window.scrollY;
    render();
    window.scrollTo(0, y);
    toast(msg || 'Salvo');
    return true;
  } catch (e) {
    ui.publicando = false;
    toast(msgErro(e, 'Não consegui salvar agora. Confira a internet e tente de novo.'));
    return false;
  }
}

/* telas do painel antes de abrir (carregando, sem acesso, erro) */
function telaPainel(tipo, extra) {
  const T = {
    carregando: ['Abrindo seu painel…', ''],
    'sem-acesso': ['Este login não tem acesso ao painel', 'Você entrou como ' + esc(extra || '') + ', mas esse e-mail não está autorizado a ver as vendas.'],
    erro: ['Não consegui abrir o painel', 'Confira a internet e tente de novo. Se continuar, o banco de dados pode estar pausado: entre em supabase.com, abra o projeto e toque em Restore.'],
    'sem-config': ['O painel ainda não foi ligado ao banco de dados', 'Falta colocar o endereço e a chave do Supabase no arquivo config.js.']
  };
  const t = T[tipo] || T.erro;
  $('#app').innerHTML = '<div class="wrap adm"><header class="adm-cab"><div><p class="rot">Painel da vendedora</p><h1>' + esc(cfg.titulo || 'Rifa da formatura') + '</h1></div></header>' +
    '<div class="vazio" role="status"><strong>' + t[0] + '</strong>' + (t[1] ? '<p class="dica">' + t[1] + '</p>' : '') +
    (tipo === 'carregando' ? '' : '<div class="linha-botoes">' + (tipo === 'sem-config' ? '' : '<button class="btn peq" type="button" data-acao="recarregar">Tentar de novo</button>') + '<button class="btn peq fantasma" type="button" data-acao="sair">Sair</button></div>') +
    '</div></div>';
}
function irParaLogin() { location.replace(RAIZ + 'login/'); }
async function sair() {
  try { if (SB) await SB.auth.signOut(); } catch (e) { /* nada */ }
  irParaLogin();
}

/* entrada do painel: confere o login, carrega ajustes e vendas */
async function conectarSB() {
  if (!SB) { telaPainel('sem-config'); return; }
  telaPainel('carregando');
  let sessao = null;
  try { const r = await SB.auth.getSession(); sessao = r && r.data && r.data.session; } catch (e) { sessao = null; }
  if (!sessao) { irParaLogin(); return; }
  SB.auth.onAuthStateChange((ev, s) => { if (ev === 'SIGNED_OUT' || (!s && ev !== 'INITIAL_SESSION')) irParaLogin(); });
  try {
    const adm = await SB.rpc('eh_admin');
    if (adm.error) throw adm.error;
    if (!adm.data) { telaPainel('sem-acesso', sessao.user && sessao.user.email); return; }
    let { data: linha, error } = await SB.from('config').select('dados, atualizado_em').eq('id', 1).maybeSingle();
    if (error) throw error;
    if (!linha || !linha.dados || !Object.keys(linha.dados).length) {
      /* primeira vez: traz a configuração que já está no site */
      let base = estadoPub.cfg || null;
      if (!base) {
        try { const r = await fetch(RAIZ + 'estado.json?t=' + Date.now(), { cache: 'no-store' }); if (r.ok) { const e = await r.json(); base = e && e.cfg; } } catch (e) { /* segue com o padrão */ }
      }
      const dados = Object.assign({}, CFG_PADRAO, base || {});
      const up = await SB.from('config').upsert({ id: 1, dados });
      if (up.error) throw up.error;
      linha = { dados, atualizado_em: new Date().toISOString() };
    }
    cfg = Object.assign({}, CFG_PADRAO, linha.dados);
    atualizadoPub = linha.atualizado_em || '';
    definirUniverso();
  } catch (e) {
    const err = falhaSB(e);
    if (err.code === 'sessao') { irParaLogin(); return; }
    telaPainel('erro');
    return;
  }
  ui.ehDona = true;
  caps = { db: dbSupabase(), artifact: null, downloads: downloadsNavegador() };
  let aba = null; try { aba = sessionStorage.getItem('rifa-aba'); } catch (e) { /* nada */ }
  ui.aba = !cfg.pronto ? 'ajustes' : (aba || 'vendas');
  ui.modo = 'admin'; ui.sel.clear();
  render();
  caps.db.collection('vendas').onSnapshot(snap => {
    vendas = snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
    vendasCarregadas = true;
    erroVendas = '';
    aoMudarVendas();
  }, e => {
    if (e && e.code === 'sessao') { irParaLogin(); return; }
    if (!vendasCarregadas) erroVendas = 'Não consegui carregar suas vendas agora. Recarregue a página.';
    renderAvisos(); renderResumo();
  });
}

/* página pública: lê os números ocupados direto do banco, sem nomes nem telefones */
async function buscarEstadoSB() {
  if (!TEM_SB) return false;
  try {
    const r = await fetch(SB_CFG.url.replace(/\/+$/, '') + '/rest/v1/rpc/estado_publico', {
      method: 'POST', cache: 'no-store',
      headers: { apikey: SB_CFG.chave, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: '{}'
    });
    if (!r.ok) return false;
    const e = await r.json();
    if (!e || !e.cfg) return false;
    aplicarEstado(e);
    return true;
  } catch (err) { return false; }
}
function textoLivres() {
  const livres = UNI.filter(n => !ocupadosPub.has(n)).length;
  return (cfg.mostrarContador ? livres + ' de ' + UNI.length + ' números ainda livres. ' : 'Os números riscados já têm dono. ') + (atualizadoPub ? 'Atualizado em ' + fmtQuando(atualizadoPub) + '.' : '');
}
function aplicarEstado(e) {
  const cfgNovo = Object.assign({}, CFG_PADRAO, e.cfg);
  const mudouCfg = JSON.stringify(cfgNovo) !== JSON.stringify(cfg);
  const novos = new Set((e.ocupados || []).map(Number));
  const mudouOcup = novos.size !== ocupadosPub.size || Array.from(novos).some(n => !ocupadosPub.has(n));
  const linha = $('#linha-livres');
  if (!mudouCfg && !mudouOcup) { if (e.atualizado) atualizadoPub = e.atualizado; if (linha) linha.textContent = textoLivres(); return; }
  const sobraLivre = lerFaixas(cfgNovo.faixas).nums.some(n => !novos.has(n));
  const telaToda = mudouCfg || !sobraLivre || !$('#area-grade');
  if (telaToda && ui.folha && ui.modo === 'publico') return; /* não mexe na tela com uma janela aberta; tenta na próxima */
  if (e.atualizado) atualizadoPub = e.atualizado;
  cfg = cfgNovo;
  ocupadosPub.clear(); novos.forEach(n => ocupadosPub.add(n));
  const perdidos = Array.from(ui.sel).filter(n => ocupadosPub.has(n));
  perdidos.forEach(n => ui.sel.delete(n));
  definirUniverso();
  if (ui.modo !== 'publico') return;
  if (telaToda) {
    const y = window.scrollY; render(); window.scrollTo(0, y);
  } else {
    renderGrade(false);
    if (linha) linha.textContent = textoLivres();
    renderBarra();
  }
  if (perdidos.length) {
    toast(plural(perdidos.length, 'O ', 'Os ') + listaNums(perdidos) + plural(perdidos.length, ' acabou de ser vendido. Escolha outro.', ' acabaram de ser vendidos. Escolha outros.'));
    if (ui.folha === 'pedido') { if (ui.sel.size) abrirPedido(); else fecharFolha(); }
  }
}

/* ---------- início ---------- */
criarCamadas();
if (PAGINA === 'admin') telaPainel('carregando'); else render();
try { const m = sessionStorage.getItem('rifa-toast'); if (m) { sessionStorage.removeItem('rifa-toast'); setTimeout(() => toast(m), 400); } } catch (e) { /* nada */ }
let rz = null, larguraAntes = window.innerWidth; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (window.innerWidth !== larguraAntes) { larguraAntes = window.innerWidth; desenharRabiscos(); } }, 150); });
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (ui.modo === 'publico') desenharRabiscos(); });
conectar();
buscarEstadoExterno();
})();
