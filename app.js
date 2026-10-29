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
function liberada(v) { return !!v.liberadaEm && !(v.numeros || []).length; }
function vencida(v) { return !v.pago && !v.semPrazo && !liberada(v) && Date.now() > prazoDe(v).getTime(); }
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
  pedido: 'Oi, {vendedora}! Fiz um pedido na página da rifa 🎉\nPedido: {pedido}\nNome: {nome}\nNúmeros: {numeros}\nTotal: {total}\nSegue o comprovante do Pix.',
  ganhador: 'Oi, {nome}! 🎉 Seu número {numero} foi sorteado na rifa da formatura e você ganhou: {premio}! Já te passo os próximos passos pra retirar o prêmio com a Formô.',
  bilhete: 'Oi, {nome}! Pagamento confirmado, muito obrigada pela ajuda 💛\nSeus números da rifa: {numeros}\nJá vou te mandar os bilhetes digitais aqui. Guarda eles até o sorteio, tá?\nO sorteio é dia {sorteio}, ao vivo no {instagram}. Boa sorte!',
  cobranca: 'Oi, {nome}! Tudo bem? Separei pra você os números {numeros} da rifa da formatura 😊\nO total ficou {total}. Minha chave Pix é {chave}.\nPra garantir seus números, o pagamento precisa chegar até {prazo}, tá? Depois disso eles voltam a ficar livres.\nQuando pagar, me manda o comprovante aqui. Obrigada!',
  divulgar: 'Gente, tô vendendo a rifa da minha formatura! 🎓\nSão 5 prêmios: {premios}. Cada número custa {preco} e o sorteio é dia {sorteio}.\nEscolhe os seus aqui: {link}\nCada número me ajuda muito, obrigada!',
  divulgarAmigos: 'Tô ajudando a {vendedora} com a rifa da formatura dela! 🎓 São 5 prêmios, incluindo um {premio1}, e cada número custa {preco}.\nEscolhe os seus aqui: {link}'
};
const MSGS_INFO = [
  ['pedido', 'Pedido do comprador', 'O comprador manda pra você junto com o comprovante, quando toca em “Já paguei: mandar comprovante”.', ['vendedora', 'pedido', 'nome', 'numeros', 'total']],
  ['bilhete', 'Envio do bilhete', 'Você manda depois de confirmar o pagamento, junto com as imagens dos bilhetes.', ['nome', 'numeros', 'total', 'sorteio', 'instagram']],
  ['cobranca', 'Cobrança', 'Você manda pra quem reservou e ainda não pagou.', ['nome', 'numeros', 'total', 'chave', 'prazo', 'pix']],
  ['divulgar', 'Divulgação (sua)', 'O texto que vai quando você toca em Divulgar.', ['premios', 'premio1', 'preco', 'sorteio', 'link']],
  ['ganhador', 'Aviso pro ganhador', 'Você manda pra quem tiver um número sorteado (aparece no painel depois que você coloca o resultado em Ajustes).', ['nome', 'numero', 'premio']],
  ['divulgarAmigos', 'Divulgação (dos amigos)', 'O texto que vai quando um comprador toca em “Mandar no WhatsApp” pra te ajudar.', ['vendedora', 'premios', 'premio1', 'preco', 'sorteio', 'link']]
];
const VAR_DESC = { pedido: 'código do pedido', numero: 'número sorteado', premio: 'prêmio que a pessoa ganhou', vendedora: 'seu nome', nome: 'nome do comprador', numeros: 'números escolhidos', total: 'valor total', sorteio: 'data do sorteio', instagram: 'Instagram do sorteio', chave: 'sua chave Pix', pix: 'código Pix copia e cola com o valor', prazo: 'até quando a reserva vale', premios: 'os 5 prêmios', premio1: '1º prêmio', preco: 'preço por número', link: 'link da página' };
function msgModelo(k) { const m = (cfg.msgs || {})[k]; if (k === 'pedido' && m === PEDIDO_ANTIGO) return MSGS_PADRAO.pedido; return (typeof m === 'string' && m.trim()) ? m : MSGS_PADRAO[k]; }
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
function msgPedido(nome, nums, codigo) {
  let tpl = msgModelo('pedido');
  if (!codigo) tpl = tpl.split('\n').filter(l => !l.includes('{pedido}')).join('\n');
  else if (!tpl.includes('{pedido}')) { const ls = tpl.split('\n'); ls.splice(1, 0, 'Pedido: {pedido}'); tpl = ls.join('\n'); }
  return preencher(tpl, Object.assign(varsVenda(nome, nums, true), { pedido: codigo || '' }));
}
function msgBilhete(v) { return preencher(msgModelo('bilhete'), varsVenda(v.nome, ordenar(v.numeros || []), false)); }
function msgCobranca(v) { return preencher(msgModelo('cobranca'), Object.assign(varsVenda(v.nome, ordenar(v.numeros || []), false), { prazo: fmtQuando(prazoDe(v).toISOString()) })); }
function semLinkSeVazio(tpl) { return cfg.link ? tpl : String(tpl).split('\n').filter(l => !l.includes('{link}')).join('\n'); }
function msgDivulgar(daDona) { return preencher(semLinkSeVazio(msgModelo(daDona ? 'divulgar' : 'divulgarAmigos')), varsBase()); }

/* aba Mensagens do painel */
function exemploVars(k) {
  const v = varsVenda('Ana Souza', [19203, 19245], k === 'pedido');
  v.prazo = fmtQuando(new Date(Date.now() + (Number(cfg.prazoReserva) || 24) * 3600000).toISOString());
  v.pedido = 'K7P2'; v.numero = 19203; v.premio = cfg.premios[0];
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
function desenharRabiscosPorFaixa() {
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
      return '<article class="slide" style="--cor:' + (CORES_PREMIO[i] || CORES_PREMIO[0]) + '" aria-roledescription="slide" aria-label="' + (i + 1) + ' de ' + n + '">' +
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
  let atual = 0, pausadoAte = 0, raf = null, travaAte = 0;
  const marcar = () => { pontos.forEach((p, k) => p.setAttribute('aria-current', String(k === atual))); slides.forEach((s, k) => s.classList.toggle('ativo', k === atual)); };
  irPremio = (i, suave) => {
    atual = (i + slides.length) % slides.length;
    travaAte = Date.now() + 1100;
    const s = slides[atual];
    tr.scrollTo({ left: s.offsetLeft - (tr.clientWidth - s.offsetWidth) / 2, behavior: suave && !reduz ? 'smooth' : 'auto' });
    marcar();
  };
  irPremio.atual = () => atual;
  pausarCarrossel = () => { pausadoAte = Date.now() + 8000; };
  tr.addEventListener('scroll', () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      if (Date.now() < travaAte) return;
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
  }, 2600);
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
  const pausado = cfg.pronto && !encerrado && !!cfg.pausado;
  const aberta = cfg.pronto && !encerrado && !esgotado && !pausado;
  const V = esc(cfg.vendedora);
  let escolha;
  if (!cfg.pronto) {
    escolha = '<div class="aviso-breve"><h3>Os números abrem em breve</h3><p class="dica">Estou terminando de preparar esta página. Volta daqui a pouquinho!</p></div>';
  } else if (encerrado) {
    escolha = '<div class="aviso-breve"><h3>As vendas terminaram</h3><p class="dica">A venda dos números foi até ' + dataBR(cfg.fimVendas) + '. O sorteio é dia ' + dataBR(cfg.sorteio) + ', ao vivo no ' + igLink() + '. Boa sorte pra quem comprou!</p></div>';
  } else if (pausado) {
    escolha = htmlPausada();
  } else if (esgotado) {
    escolha = '<div class="esgotou"><span class="esgotou-selo">Esgotou! 🎉</span><h3>Todos os números já têm dono</h3><p>Muito obrigada a todo mundo que comprou e me ajudou! Vou ter mais rifas da formatura por aí. Quer que eu te avise quando abrir a próxima?</p>' +
      (cfg.whatsapp ? '<a class="btn primario" href="' + esc(linkWa(cfg.whatsapp, 'Oi, ' + cfg.vendedora + '! Vi que a rifa esgotou. Me avisa quando abrir a próxima? 😊')) + '" target="_blank" rel="noopener">Me avisa da próxima rifa</a>' : '') + '</div>';
  } else {
    escolha =
      '<div class="ferramentas"><form id="f-busca" class="busca" role="search"><label for="busca-num" class="sr">Procurar número</label><input id="busca-num" type="text" inputmode="numeric" autocomplete="off" placeholder="Procurar um número"><button class="btn peq" type="submit">Procurar</button></form>' +
      '<button class="btn peq" type="button" data-acao="sorte">Escolher pra mim</button></div>' +
      '<div id="area-grade"></div>' +
      '<div class="legenda"><span><i class="amostra"></i>Livre</span><span><i class="amostra sel"></i>Escolhido por você</span>' + (TEM_SB && pedidosAtivos().length ? '<span><i class="amostra meu"></i>Reservado pra você</span>' : '') + '<span><i class="amostra ocupado"></i>Já tem dono</span></div>';
  }
  const linhaLivres = aberta
    ? '<p class="dica" id="linha-livres">' + (cfg.mostrarContador ? livres + ' de ' + total + ' números ainda livres. ' : 'Os números riscados já têm dono. ') + (atualizadoPub ? 'Atualizado em ' + fmtQuando(atualizadoPub) + '.' : '') + '</p>'
    : '';
  const dias = diasParaFim();
  const pilulaVendas = pausado ? '<span class="pilula coral">⏸️ Vendas pausadas no momento</span>' : (aberta && dias > 0 && dias <= 30)
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
      '<div class="pilulas">' + (temResultado() ? '<a class="pilula mostarda" href="#t-res">🎉 Veja o resultado do sorteio</a>' : '<span class="pilula mostarda">Sorteio ' + dataBR(cfg.sorteio) + ' · ao vivo no ' + igLink() + '</span>' + pilulaVendas) + '</div>' +
      '<div id="progresso-pub">' + htmlProgresso() + '</div>' +
      (aberta ? '<div class="hero-cta"><button class="btn primario" type="button" data-acao="ir-escolha">Escolher meus números</button><button class="btn" type="button" data-acao="compartilhar">Compartilhar</button></div>' : '') +
      (esgotado ? '<div class="hero-cta"><span class="pilula mostarda">Esgotou! Muito obrigada 💛🎓</span></div>' : '') +
    '</div></header>' +
    '<main>' + htmlResultado() +
      '<section class="wrap secao" aria-labelledby="t-premios"><div class="secao-cab"><h2 id="t-premios">Concorra a <em>5 prêmios</em></h2><p class="dica">Cada número sorteado leva um. Arraste pro lado pra ver todos os prêmios desta leva! E fica de olho, que logo vem mais por aí 😉</p></div>' + htmlPremios() + '</section>' +
      '<section class="wrap secao" id="escolha" aria-labelledby="t-escolha"><div class="secao-cab"><h2 id="t-escolha">Escolha seus <em>números</em></h2>' + linhaLivres + '</div><div id="meus-pedidos">' + htmlMeusPedidos() + '</div>' + escolha + '</section>' +
      '<section class="banda banda-creme" aria-labelledby="t-como"><canvas class="rabiscos" data-preset="creme" aria-hidden="true"></canvas><div class="wrap secao"><h2 id="t-como">Como comprar</h2><ol class="cartoes">' +
        (TEM_SB
          ? '<li><span class="bola">1</span><strong>Escolha os números</strong><span>Toque nos números livres. Pode escolher até ' + MAX_POR_PEDIDO + ' por pedido.</span></li>' +
            '<li><span class="bola">2</span><strong>Gere o Pix</strong><span>Coloque seu nome e WhatsApp e toque em Gerar Pix: os números ficam reservados pra você.</span></li>' +
            '<li><span class="bola">3</span><strong>Pague e mande o comprovante</strong><span>Depois de pagar, toque em “Já paguei”: o WhatsApp abre com o seu pedido pronto.</span></li>'
          : '<li><span class="bola">1</span><strong>Escolha os números</strong><span>Toque nos números livres. Pode escolher quantos quiser.</span></li>' +
            '<li><span class="bola">2</span><strong>Pague por Pix</strong><span>A chave, o código e o QR Code aparecem com o valor certinho quando você tocar em Continuar.</span></li>' +
            '<li><span class="bola">3</span><strong>Mande o pedido no WhatsApp</strong><span>A mensagem já vai pronta. Manda o comprovante na mesma conversa.</span></li>') +
        '<li><span class="bola">4</span><strong>Receba seu bilhete</strong><span>Eu confirmo o pagamento e te mando o bilhete digital de cada número.</span></li>' +
      '</ol><p class="aviso-reserva">⏳ ' + (TEM_SB ? 'Quando você gera o Pix, os números ficam reservados pra você por ' : 'Depois que você me manda o pedido, eu seguro os números pra você por ') + P + '. Se o pagamento não chegar nesse prazo, eles voltam a ficar livres pra outra pessoa.</p></div></section>' +
      '<section class="banda banda-rosa" aria-labelledby="t-ganhou"><canvas class="rabiscos" data-preset="rosa" aria-hidden="true"></canvas><div class="wrap secao"><div class="secao-cab"><h2 id="t-ganhou">Se o seu número sair</h2><p class="lede-g">São 5 números sorteados, um para cada prêmio.</p></div><ol class="passos-g">' +
        '<li><span class="bola">1</span><strong>Eu te aviso</strong><span>Acompanhe a live no ' + igLink() + '. Se um número seu for sorteado, eu te chamo no WhatsApp que você usou na compra.</span></li>' +
        '<li><span class="bola">2</span><strong>Fale com a Formô</strong><span>Com o aviso em mãos, você entra em contato com a Formô pra confirmar o número e combinar a retirada.</span></li>' +
        '<li><span class="bola">3</span><strong>Retire o prêmio</strong><span>A Formô tem até ' + cfg.prazoEntrega + ' dias corridos pra entregar, contados desse primeiro contato. A retirada é na sede da Formô, em Curitiba. Mora fora? O frete é combinado à parte com a Formô.</span></li>' +
      '</ol></div></section>' +
      '<section class="wrap secao" aria-labelledby="t-duvidas"><h2 id="t-duvidas">Dúvidas</h2><div class="faq">' +
        '<details><summary>Quando é o sorteio?</summary><p>' + diaSemana(cfg.sorteio).replace(/^./, c => c.toUpperCase()) + ', ' + dataBR(cfg.sorteio) + ', ao vivo no Instagram ' + igLink() + '.</p><p><strong>🚨 Atenção:</strong> as vendas vão até o dia ' + dataBR(cfg.fimVendas) + '.</p></details>' +
        '<details><summary>Posso comprar mais de um número?</summary><p>Pode sim, quantos quiser!' + (TEM_SB ? ' Cada pedido vai até ' + MAX_POR_PEDIDO + ' números; se quiser mais, é só fazer outro pedido.' : '') + ' No sorteio saem 5 números, um para cada prêmio. Cada número que você compra é mais uma chance de estar entre eles, então quanto mais números, maiores as suas chances.</p></details>' +
        '<details><summary>Escolhi meus números. Eles já são meus?</summary><p>Ainda não! Escolher na página não separa nenhum número. ' + (TEM_SB ? 'Quando você coloca seu nome e WhatsApp e gera o Pix, os números ficam reservados pra você por ' : 'Quando você me manda o pedido no WhatsApp, eu reservo os números pra você por ') + P + '. Se o pagamento chegar nesse prazo, eles são seus; se não, voltam a ficar livres pra outra pessoa.</p></details>' +
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
    st = ui.sel.has(n) ? 'sel' : (ocupadosPub.has(n) ? ((TEM_SB && pedidoDoNumero(n)) ? 'meu' : 'ocupado') : 'livre');
  }
  const rot = 'Número ' + n + (st === 'ocupado' ? ', já tem dono' : st === 'meu' ? ', reservado pra você' : st === 'sel' ? ', escolhido' : '') + extra;
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
  atualizarBotaoDuvidas();
  const el = $('#barra'); if (!el) return;
  const n = ui.sel.size;
  const mostrar = n > 0 && !ui.folha && (ui.modo === 'publico' || ui.aba === 'numeros');
  if (!mostrar) { el.hidden = true; return; }
  el.hidden = false;
  el.innerHTML = '<div class="barra-in">' + (ui.modo === 'admin' ? '' : htmlCarrinho(n)) + '<div class="barra-info"><span>' + n + ' ' + plural(n, 'número', 'números') + '</span><span class="num">' + brl(n * cfg.preco) + '</span></div>' +
    '<div class="barra-acoes"><button class="btn peq fantasma" type="button" data-acao="limpar-sel">Limpar</button>' +
    '<button class="btn primario" type="button" data-acao="continuar">' + (ui.modo === 'admin' ? 'Registrar venda' : 'Fechar pedido') + '</button></div></div>';
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
function abrirPedidoWhats() {
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
      '<div class="adm-acoes"><button class="btn peq" type="button" data-acao="ver-pub">Ver como comprador</button><button class="btn peq" type="button" data-acao="compartilhar">Divulgar</button>' + (cfg.pausado ? '<button class="btn peq ok" type="button" data-acao="retomar">▶ Retomar vendas</button>' : '<button class="btn peq" type="button" data-acao="pausar">⏸ Pausar vendas</button>') + (SB ? '<button class="btn peq fantasma" type="button" data-acao="sair">Sair</button>' : '') + '</div></header>' +
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
  let h = htmlAvisoGanhadores();
  if (cfg.pausado) h += '<div class="aviso alerta"><div><strong>⏸️ As vendas estão pausadas.</strong><p>Quem abre a página vê os prêmios e o seu aviso, mas não consegue reservar números.</p></div><button class="btn peq ok" type="button" data-acao="retomar">Retomar vendas</button></div>';
  if (!cfg.pronto) h += '<div class="aviso alerta"><div><strong>Falta pouco pra abrir as vendas.</strong><p>Preencha seu WhatsApp e o Pix em Ajustes, confira seus números e salve. Até lá, quem abre o link vê os prêmios e um aviso de “em breve”.</p></div></div>';
  if (erroVendas) h += '<div class="aviso alerta"><p>' + esc(erroVendas) + '</p></div>';
  const nVenc = vendasCarregadas ? vendas.filter(vencida).length : 0;
  if (nVenc) h += '<div class="aviso alerta"><div><strong>' + nVenc + ' ' + plural(nVenc, 'reserva passou', 'reservas passaram') + ' do prazo de ' + esc(prazoTexto()) + ' sem pagamento.</strong><p>' + (TEM_SB ? 'Os números já aparecem livres pros compradores e saem da venda sozinhos em alguns minutos.' : 'Cobre de novo ou libere os números pra outras pessoas.') + '</p></div><button class="btn peq" type="button" data-acao="ver-vencidas">Ver ' + plural(nVenc, 'reserva', 'reservas') + '</button></div>';
  const nLogo = vendasCarregadas ? vendas.filter(venceLogo).length : 0;
  if (nLogo) h += '<div class="aviso alerta"><div><strong>⏰ ' + nLogo + ' ' + plural(nLogo, 'reserva vence', 'reservas vencem') + ' nas próximas 3 horas.</strong><p>Cobre agora no WhatsApp pra não perder a venda.</p></div><button class="btn peq" type="button" data-acao="ver-vencendo">Ver ' + plural(nLogo, 'reserva', 'reservas') + '</button></div>';
  const nLib = vendasCarregadas ? vendas.filter(v => liberada(v) && Date.now() - Date.parse(v.liberadaEm) < 86400000).length : 0;
  if (nLib) h += '<div class="aviso"><div><strong>' + nLib + ' ' + plural(nLib, 'reserva foi liberada', 'reservas foram liberadas') + ' nas últimas 24 horas.</strong><p>O pagamento não chegou no prazo, então os números voltaram a ficar livres. Se alguém pagou atrasado, toque em “Recebi o pagamento” na venda.</p></div><button class="btn peq" type="button" data-acao="ver-liberadas">Ver ' + plural(nLib, 'liberada', 'liberadas') + '</button></div>';
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
      '<div class="lista-topo"><button class="btn primario" type="button" data-acao="nova-venda">+ Venda presencial</button>' +
      '<div class="busca-v"><label for="busca-venda" class="sr">Buscar venda</label><input id="busca-venda" type="search" placeholder="Buscar por nome ou número" value="' + esc(ui.busca) + '"></div></div>' +
      '<div class="filtros" id="filtros"></div><div id="lista" class="lista"></div>' +
      '<div class="export"><div class="linha-botoes"><button class="btn peq" type="button" data-acao="imprimir-lista">Imprimir lista de controle</button><button class="btn peq" type="button" data-acao="csv">Baixar planilha (.csv)</button></div><p class="dica">A lista de controle sai no modelo da Formô, uma página por bloco, pronta pra imprimir ou salvar em PDF. A planilha abre no Excel e no Google Planilhas.</p></div>';
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
  const nLiberadas = vendas.filter(liberada).length, nLogo = vendas.filter(venceLogo).length, aReceber = vendas.filter(v => !v.pago && !liberada(v)).length, semBilhete = vendas.filter(v => v.pago && !v.bilhete).length, nVenc = vendas.filter(vencida).length;
  if (fl) fl.innerHTML = [['todas', 'Todas', vendas.length], ['receber', 'A receber', aReceber], ['vencendo', 'Vencendo', nLogo], ['vencidas', 'Reserva vencida', nVenc], ['bilhete', 'Bilhete a enviar', semBilhete], ['liberadas', 'Liberadas', nLiberadas]].filter(f => (f[0] !== 'vencidas' && f[0] !== 'liberadas' && f[0] !== 'vencendo') || f[2] || ui.filtro === f[0])
    .map(f => '<button type="button" class="filtro" data-filtro="' + f[0] + '" aria-pressed="' + (ui.filtro === f[0]) + '">' + f[1] + ' (' + f[2] + ')</button>').join('');
  if (!vendasCarregadas) { el.innerHTML = erroVendas ? '' : '<p class="dica">Carregando…</p>'; return; }
  if (!vendas.length) {
    el.innerHTML = '<div class="vazio"><strong>Nenhuma venda ainda.</strong><p class="dica">Quando um pedido chegar no WhatsApp, toque em Nova venda e cole a mensagem: o nome e os números são preenchidos sozinhos.</p></div>';
    return;
  }
  const q = ui.busca.trim().toLowerCase();
  const arr = vendas.slice()
    .filter(v => ui.filtro === 'todas' || (ui.filtro === 'receber' ? (!v.pago && !liberada(v)) : ui.filtro === 'vencidas' ? vencida(v) : ui.filtro === 'vencendo' ? venceLogo(v) : ui.filtro === 'liberadas' ? liberada(v) : (v.pago && !v.bilhete)))
    .filter(v => !q || String(v.nome || '').toLowerCase().includes(q) || String(v.codigo || '').toLowerCase() === q.replace(/^#/, '') || (v.numeros || []).concat(v.numerosLiberados || []).some(n => String(n).includes(q)) || soDigitos(v.telefone).includes(soDigitos(q) || '§'))
    .sort((a, b) => String(b.criadoEm || '').localeCompare(String(a.criadoEm || '')));
  el.innerHTML = arr.length ? arr.map(cardVenda).join('') : '<p class="dica">Nenhuma venda encontrada.</p>';
}
function cardLiberada(v) {
  const nums = ordenar(v.numerosLiberados || []);
  return '<article class="venda liberada">' +
    '<div class="venda-topo"><span class="pill liberada">Reserva liberada</span><span class="num">' + brl(nums.length * cfg.preco) + '</span></div>' +
    '<div><h3 class="venda-nome">' + esc(v.nome || 'Sem nome') + '</h3>' + (v.telefone ? '<span class="dica">' + esc(foneBonito(v.telefone)) + '</span>' : '') + (v.codigo ? '<span class="dica cod-pedido">Pedido ' + esc(v.codigo) + (v.origem === 'site' ? ' · feito pelo site' : '') + '</span>' : (v.origem === 'presencial' ? '<span class="dica cod-pedido">Venda presencial</span>' : '')) + '</div>' +
    '<div class="chips">' + nums.map(n => '<span class="chip-num riscado">' + n + '</span>').join('') + '</div>' +
    '<p class="dica">Reservou em ' + fmtQuando(v.criadoEm) + ' · liberada em ' + fmtQuando(v.liberadaEm) + ', porque o pagamento não chegou no prazo.</p>' +
    (v.obs ? '<p class="dica">' + esc(v.obs) + '</p>' : '') +
    '<div class="venda-acoes">' +
      '<button class="btn peq ok" type="button" data-acao="devolver-pago" data-venda="' + esc(v.id) + '">Recebi o pagamento</button>' +
      '<button class="btn peq" type="button" data-acao="devolver-reserva" data-venda="' + esc(v.id) + '">Reservar de novo</button>' +
      '<button class="btn peq fantasma" type="button" data-acao="editar-venda" data-venda="' + esc(v.id) + '">Editar</button>' +
    '</div></article>';
}
function devolverNumeros(id, pago) {
  const v = vendas.find(x => x.id === id); if (!v) return;
  const nums = ordenar(v.numerosLiberados || []);
  if (!nums.length) { toast('Essa venda não tem números guardados. Toque em Editar pra escolher.'); return; }
  const a = analisarNumeros(nums, id);
  if (a.deOutro.length) { toast(a.deOutro.map(o => o.n + ' já é de ' + (primeiroNome(o.v.nome) || 'outra pessoa')).join('; ') + '. Toque em Editar pra escolher outros.'); return; }
  const agora = new Date().toISOString();
  const campos = { numeros: nums, numerosLiberados: [], liberadaEm: null };
  if (pago) Object.assign(campos, { pago: true, pagoEm: agora }); else campos.criadoEm = agora;
  atualizarVenda(id, campos, pago ? 'Pagamento registrado. Os números voltaram pra ' + (primeiroNome(v.nome) || 'essa venda') + '.' : 'Reservado de novo. Novo prazo: ' + fmtQuando(new Date(Date.now() + (Number(cfg.prazoReserva) || 24) * 3600000).toISOString()) + '.');
}
function cardVenda(v) {
  if (liberada(v)) return cardLiberada(v);
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
    '<div class="venda-topo"><span class="pill ' + (v.pago ? 'pago' : (venc ? 'vencida' : (venceLogo(v) ? 'vencendo' : 'aguardando'))) + '">' + (v.pago ? 'Pago' : (venc ? 'Reserva vencida' : (venceLogo(v) ? '⏰ Vence em ' + faltaTexto(v) : 'Aguardando pagamento'))) + '</span><span class="num">' + brl(nums.length * cfg.preco) + '</span></div>' +
    '<div><h3 class="venda-nome">' + esc(v.nome || 'Sem nome') + '</h3>' + (v.telefone ? '<span class="dica">' + esc(foneBonito(v.telefone)) + '</span>' : '') + (v.codigo ? '<span class="dica cod-pedido">Pedido ' + esc(v.codigo) + (v.origem === 'site' ? ' · feito pelo site' : '') + '</span>' : (v.origem === 'presencial' ? '<span class="dica cod-pedido">Venda presencial</span>' : '')) + '</div>' +
    '<div class="chips">' + nums.map(n => '<span class="chip-num">' + n + '</span>').join('') + '</div>' +
    (v.pago ? '<p class="dica">' + (v.bilhete ? 'Bilhete enviado' : 'Bilhete ainda não enviado') + '</p>' : (v.semPrazo ? '<p class="dica">Reservado em ' + fmtQuando(v.criadoEm) + ' · sem prazo, combinado com você</p>' : '<p class="dica' + (venc ? ' erro' : '') + '">Reservado em ' + fmtQuando(v.criadoEm) + ' · ' + (venc ? 'o prazo acabou em ' : 'pagar até ') + fmtQuando(prazoDe(v).toISOString()) + '</p>')) +
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
  const mapa = mapaVendas(); const fora = [], deOutro = [], vencidos = [];
  nums.forEach(n => {
    if (!UNI_SET.has(n)) fora.push(n);
    else { const v = mapa.get(n); if (v && v.id !== idAtual) { if (TEM_SB && vencida(v)) vencidos.push({ n, v }); else deOutro.push({ n, v }); } }
  });
  return { fora, deOutro, vencidos };
}
function abrirVenda(v, numsIniciais) {
  ui.vendaEdit = v ? v.id : null; ui.confirmarExclusao = false;
  const nums = v ? ordenar(v.numeros || []) : ordenar(numsIniciais || []);
  abrirFolha('venda',
    '<div class="folha-cab">' + cabFolha(v ? 'Editar venda' : 'Venda presencial') + '</div>' +
    '<form id="f-venda" class="folha-corpo" novalidate>' +
      (v ? '' : '<details class="colar"><summary>Colar pedido do WhatsApp</summary><div class="campo"><label for="v-colar">Cole a mensagem que o comprador mandou</label><textarea id="v-colar" placeholder="Oi, ' + esc(cfg.vendedora) + '! Quero comprar a rifa…"></textarea><p class="dica">O nome e os números são preenchidos sozinhos.</p></div></details>') +
      '<div class="campo"><label for="v-numeros">Números</label><input id="v-numeros" type="text" inputmode="numeric" autocomplete="off" placeholder="Ex.: 19203, 19245" value="' + nums.join(', ') + '"><div id="v-numeros-info" class="dica"></div></div>' +
      '<div class="campo"><label for="v-nome">Nome do comprador</label><input id="v-nome" type="text" autocomplete="off" value="' + esc(v ? v.nome : '') + '"></div>' +
      '<div class="campo"><label for="v-tel">WhatsApp do comprador</label><input id="v-tel" type="tel" inputmode="tel" autocomplete="off" placeholder="(DDD) 99999-0000" value="' + esc(v && v.telefone ? foneBonito(v.telefone) : '') + '"><p class="dica">Opcional. Com ele, cobrar e mandar o bilhete já abrem a conversa certa.</p></div>' +
      '<label class="opcao" for="v-pago"><input id="v-pago" type="checkbox"' + ((v ? v.pago : true) ? ' checked' : '') + '><span>Pagamento recebido</span></label>' +
      '<label class="opcao" for="v-semprazo" id="v-semprazo-l"' + ((v ? v.pago : true) ? ' hidden' : '') + '><input id="v-semprazo" type="checkbox"' + ((v ? v.semPrazo : true) ? ' checked' : '') + '><span>Segurar os números sem prazo (a pessoa vai pagar depois)</span></label>' +
      '<label class="opcao" for="v-bilhete"><input id="v-bilhete" type="checkbox"' + (v && v.bilhete ? ' checked' : '') + '><span>Bilhete enviado</span></label>' +
      '<div class="campo"><label for="v-obs">Observação</label><input id="v-obs" type="text" autocomplete="off" placeholder="Ex.: paga sexta, em dinheiro" value="' + esc(v ? v.obs : '') + '"></div>' +
      '<p class="erro" id="v-erro" hidden></p>' +
      '<div class="folha-rodape"><span class="num" id="v-total"></span><button class="btn primario" type="submit" id="v-salvar">Salvar venda</button></div>' +
      (v ? '<div class="zona-excluir" id="zona-excluir"></div>' : '') +
    '</form>');
  const inNum = $('#v-numeros');
  $('#v-pago').addEventListener('change', () => { $('#v-semprazo-l').hidden = $('#v-pago').checked; });
  const atualizarInfo = () => {
    const ns = lerNumeros(inNum.value, false);
    const a = analisarNumeros(ns, ui.vendaEdit);
    let h = ns.length ? ns.length + ' ' + plural(ns.length, 'número', 'números') : 'Nenhum número ainda.';
    if (a.fora.length) h += '<br><span class="erro">' + listaNums(a.fora) + plural(a.fora.length, ' não está', ' não estão') + ' nos seus blocos.</span>';
    a.deOutro.forEach(o => { h += '<br><span class="erro">' + o.n + ' já é de ' + esc(o.v.nome || 'outra pessoa') + '.</span>'; });
    a.vencidos.forEach(o => { h += '<br>' + o.n + ' estava reservado pra ' + esc(primeiroNome(o.v.nome) || 'outra pessoa') + ', mas a reserva venceu: ao salvar, ele vem pra esta venda.'; });
    $('#v-numeros-info').innerHTML = h;
    $('#v-total').textContent = brl(ns.length * cfg.preco);
  };
  inNum.addEventListener('input', atualizarInfo);
  atualizarInfo();
  const colar = $('#v-colar');
  if (colar) colar.addEventListener('input', () => {
    const mc = colar.value.match(/pedido\s*:\s*#?([A-Za-z2-9]{4})\b/i);
    const ja = mc && vendas.find(x => String(x.codigo || '').toUpperCase() === mc[1].toUpperCase());
    if (ja) { abrirVenda(ja); toast('Esse pedido já está no painel: é a venda de ' + (primeiroNome(ja.nome) || 'alguém') + '.'); return; }
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
    obs: $('#v-obs').value.trim(), semPrazo: !pago && $('#v-semprazo').checked, origem: antiga ? (antiga.origem || 'painel') : 'presencial', criadoEm: antiga && !(liberada(antiga) && !pago) ? (antiga.criadoEm || agora) : agora, atualizadoEm: agora,
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
      '<div class="campo"><label for="a-prazo">Prazo pra pagar uma reserva</label><select id="a-prazo">' + [12, 24, 48, 72].map(h => '<option value="' + h + '"' + (Number(cfg.prazoReserva || 24) === h ? ' selected' : '') + '>' + (h >= 48 ? (h / 24) + ' dias' : h + ' horas') + '</option>').join('') + '</select><p class="dica">' + (TEM_SB ? 'Depois desse prazo sem pagamento, os números voltam a ficar livres sozinhos. A venda vai pro filtro “Liberadas”, caso a pessoa pague depois.' : 'Depois desse prazo sem pagamento, a venda aparece como “Reserva vencida” pra você cobrar ou liberar os números.') + '</p></div>' +
      '<label class="opcao" for="a-contador"><input id="a-contador" type="checkbox"' + (cfg.mostrarContador ? ' checked' : '') + '><span>Mostrar quantos números ainda estão livres</span></label>' +
    '</fieldset>' +
    '<fieldset><legend>Resultado do sorteio</legend><p class="dica">Depois da live, coloque o número sorteado de cada prêmio e salve. A página passa a mostrar o resultado, e aqui no painel aparece quem ganhou com um número seu.</p>' +
      cfg.premios.map((pr, i) => '<div class="campo"><label for="a-res-' + i + '">' + (i + 1) + 'º prêmio · ' + esc(pr) + '</label><input id="a-res-' + i + '" type="text" inputmode="numeric" autocomplete="off" placeholder="Número sorteado" value="' + (numeroSorteado(i) || '') + '"></div>').join('') +
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
    resultado: cfg.premios.map((pr, i) => { const d = soDigitos(($('#a-res-' + i) || {}).value); return d ? Number(d) : null; }),
    link: (() => { const l = (($('#a-link') || {}).value || '').trim().replace(/\s+/g, ''); return l && !/^https?:\/\//i.test(l) ? 'https://' + l : l; })(),
    mostrarContador: $('#a-contador').checked, prazoReserva: Number($('#a-prazo').value) || 24, pronto: true
  });
  if (!novo.vendedora) return mostrar('Escreva seu nome.');
  if ((novo.resultado || []).some(n => n && (n < 100 || n > 9999999))) return mostrar('Confira os números sorteados: cada um tem de 3 a 7 algarismos.');
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
    case 'pausar': abrirPausa(); break;
    case 'retomar': retomarVendas(); break;
    case 'imprimir-lista': imprimirLista(); break;
    case 'ver-pedido': verPedido(t.dataset.codigo); break;
    case 'mandou-comprovante': marcarPedidoLocal(t.dataset.codigo, { enviado: true }); renderMeusPedidos(); break;
    case 'pedido-whats': ui.pedidoPeloWhats = true; abrirPedidoWhats(); break;
    case 'ver-vencendo': ui.aba = 'vendas'; ui.filtro = 'vencendo'; renderAba(); { const l = $('#lista'); if (l) l.scrollIntoView({ block: 'start' }); } break;
    case 'sair': sair(); break;
    case 'recarregar': location.reload(); break;
    case 'liberar': { const v = vendas.find(x => x.id === id); if (v) { abrirVenda(v); ui.confirmarExclusao = true; renderZonaExcluir(); const z = $('#zona-excluir'); if (z) z.scrollIntoView({ block: 'center' }); } break; }
    case 'devolver-pago': devolverNumeros(id, true); break;
    case 'devolver-reserva': devolverNumeros(id, false); break;
    case 'ver-liberadas': ui.aba = 'vendas'; ui.filtro = 'liberadas'; renderAba(); { const l = $('#lista'); if (l) l.scrollIntoView({ block: 'start' }); } break;
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
    const meu = TEM_SB ? pedidoDoNumero(n) : null;
    if (meu) { toast('O ' + n + ' está reservado pra você (pedido ' + meu.codigo + ').'); return; }
    if (ocupadosPub.has(n)) { toast('O ' + n + ' já tem dono. Escolha outro.'); return; }
    if (!cfg.pronto || vendasEncerradas() || cfg.pausado) return;
    if (TEM_SB && !ui.sel.has(n) && ui.sel.size >= MAX_POR_PEDIDO) { toast('Cada pedido vai até ' + MAX_POR_PEDIDO + ' números. Finalize este e faça outro depois.'); return; }
  }
  if (ui.sel.has(n)) ui.sel.delete(n); else ui.sel.add(n);
  atualizarCel(n); renderBarra();
}
function escolherPraMim() {
  if (ui.modo !== 'admin' && TEM_SB && ui.sel.size >= MAX_POR_PEDIDO) { toast('Cada pedido vai até ' + MAX_POR_PEDIDO + ' números. Finalize este e faça outro depois.'); return; }
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
const CAMPOS_VENDA = { nome: 'nome', telefone: 'telefone', numeros: 'numeros', pago: 'pago', bilhete: 'bilhete', obs: 'obs', criadoEm: 'criado_em', atualizadoEm: 'atualizado_em', pagoEm: 'pago_em', liberadaEm: 'liberada_em', numerosLiberados: 'numeros_liberados', codigo: 'codigo', origem: 'origem', semPrazo: 'sem_prazo' };
function paraLinha(d) {
  const r = {};
  Object.keys(CAMPOS_VENDA).forEach(k => { if (k in d) r[CAMPOS_VENDA[k]] = d[k]; });
  if (r.numeros) r.numeros = r.numeros.map(Number);
  if (r.numeros_liberados) r.numeros_liberados = r.numeros_liberados.map(Number);
  return r;
}
function daLinha(r) {
  const d = {};
  Object.keys(CAMPOS_VENDA).forEach(k => { d[k] = r[CAMPOS_VENDA[k]]; });
  d.numeros = (d.numeros || []).map(Number); d.obs = d.obs || ''; d.telefone = d.telefone || '';
  d.numerosLiberados = (d.numerosLiberados || []).map(Number); d.liberadaEm = d.liberadaEm || null;
  d.semPrazo = !!d.semPrazo;
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
  ocupadosPub.clear();
  vendas.forEach(v => { if (!vencida(v)) (v.numeros || []).forEach(n => ocupadosPub.add(Number(n))); });
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
    atualizarProgresso();
    renderBarra();
  }
  if (perdidos.length) {
    toast(plural(perdidos.length, 'O ', 'Os ') + listaNums(perdidos) + plural(perdidos.length, ' acabou de ser vendido. Escolha outro.', ' acabaram de ser vendidos. Escolha outros.'));
    if (ui.folha === 'pedido') { if (ui.sel.size) abrirPedido(); else fecharFolha(); }
  }
}


/* =====================================================================
   Pedido em duas etapas: dados → Pix reservado → comprovante no WhatsApp
   ===================================================================== */
const MAX_POR_PEDIDO = 40;
const PEDIDO_ANTIGO = 'Oi, {vendedora}! Vim pela página da rifa e quero participar 🎉\nNome: {nome}\nNúmeros: {numeros}\nTotal: {total}\nJá te mando o comprovante do Pix aqui.';

/* pedidos deste aparelho (só pra mostrar de novo o Pix e o botão do comprovante) */
function lerPedidosLocais() {
  try { const a = JSON.parse(localStorage.getItem('rifa-pedidos') || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; }
}
function gravarPedidosLocais(lista) {
  try { localStorage.setItem('rifa-pedidos', JSON.stringify(lista.slice(-6))); } catch (e) { /* sem armazenamento */ }
}
function pedidosAtivos() {
  const agora = Date.now();
  return lerPedidosLocais().filter(p => p && p.codigo && Date.parse(p.prazo) > agora);
}
function salvarPedidoLocal(p) {
  const lista = lerPedidosLocais().filter(x => x && x.codigo !== p.codigo && Date.parse(x.prazo) > Date.now() - 7 * 86400000);
  lista.push(p); gravarPedidosLocais(lista);
}
function marcarPedidoLocal(codigo, campos) {
  gravarPedidosLocais(lerPedidosLocais().map(p => (p && p.codigo === codigo) ? Object.assign({}, p, campos) : p));
}
function pedidoDoNumero(n) {
  return pedidosAtivos().find(p => (p.numeros || []).map(Number).includes(Number(n)) && ocupadosPub.has(Number(n))) || null;
}
function htmlMeusPedidos() {
  if (!TEM_SB) return '';
  const ps = pedidosAtivos();
  if (!ps.length) return '';
  return '<div class="meus-pedidos">' + ps.map(p =>
    '<div class="meu-pedido"><div><strong>Seu pedido ' + esc(p.codigo) + '</strong> · ' + esc(listaNums(p.numeros || [])) + ' · <span class="num">' + brl((p.numeros || []).length * cfg.preco) + '</span>' +
      '<br><span class="dica">' + (p.enviado ? 'Comprovante enviado. Assim que eu confirmar, te mando o bilhete 💛' : 'Reservado até ' + fmtQuando(p.prazo) + '. Falta pagar e me mandar o comprovante.') + '</span></div>' +
      '<button class="btn peq' + (p.enviado ? '' : ' primario') + '" type="button" data-acao="ver-pedido" data-codigo="' + esc(p.codigo) + '">' + (p.enviado ? 'Ver pedido' : 'Pagar') + '</button></div>'
  ).join('') + '</div>';
}
function renderMeusPedidos() { const el = $('#meus-pedidos'); if (el) el.innerHTML = htmlMeusPedidos(); }

function abrirPedido() {
  if (TEM_SB && !ui.pedidoPeloWhats) abrirCheckout(); else abrirPedidoWhats();
}
function htmlChipsPedido(nums, removivel) {
  return '<div class="chips">' + nums.map(n => '<span class="chip-num">' + n + (removivel ? '<button type="button" data-acao="tirar" data-num="' + n + '" aria-label="Tirar o ' + n + '">×</button>' : '') + '</span>').join('') + '</div>' +
    '<p class="total-linha"><span>' + nums.length + ' × ' + brl(cfg.preco) + '</span><span class="num">' + brl(nums.length * cfg.preco) + '</span></p>';
}
function htmlEtapas(atual) {
  return '<ol class="etapas" aria-label="Etapas do pedido"><li' + (atual === 1 ? ' aria-current="step"' : ' class="feita"') + '><span>1</span>Seus dados</li><li' + (atual === 2 ? ' aria-current="step"' : '') + '><span>2</span>Pix e comprovante</li></ol>';
}
function abrirCheckout(erroMsg, comAlternativa) {
  const nums = ordenar(ui.sel);
  if (!nums.length) { fecharFolha(); return; }
  abrirFolha('pedido',
    '<div class="folha-cab">' + cabFolha('<span class="tit-carrinho">' + ICONE_CARRINHO + '</span>Seu pedido') + htmlChipsPedido(nums, true) + '</div><div class="perfura" aria-hidden="true"></div>' +
    '<form class="folha-corpo" id="f-checkout" novalidate>' + htmlEtapas(1) +
      '<div class="campo"><label for="p-nome">Seu nome</label><input id="p-nome" type="text" autocomplete="name" placeholder="Nome e sobrenome" value="' + esc(ui.nomeComprador || '') + '"></div>' +
      '<div class="campo"><label for="p-fone">Seu WhatsApp, com DDD</label><input id="p-fone" type="tel" inputmode="tel" autocomplete="tel" placeholder="(41) 99999-0000" value="' + esc(ui.foneComprador || '') + '"><p class="dica">É por ele que eu confirmo o pagamento e te mando o bilhete.</p></div>' +
      '<p class="erro" id="p-erro" role="alert"' + (erroMsg ? '' : ' hidden') + '>' + esc(erroMsg || '') + '</p>' +
      (comAlternativa ? '<p class="dica">Se continuar sem funcionar, <button class="link" type="button" data-acao="pedido-whats">mande o pedido direto no meu WhatsApp</button>.</p>' : '') +
      '<button class="btn primario largo" type="submit" id="p-reservar">Gerar Pix e reservar</button>' +
      '<p class="nota">⏳ Quando você gera o Pix, os números ficam reservados pra você por ' + esc(prazoTexto()) + '. Se o pagamento não chegar nesse prazo, eles voltam a ficar livres.</p>' +
      '<p class="dica lgpd">🔒 Seu nome e seu WhatsApp ficam só comigo, pra confirmar a compra e te mandar o bilhete.</p>' +
    '</form>');
  const nome = $('#p-nome'), fone = $('#p-fone');
  nome.addEventListener('input', () => { ui.nomeComprador = nome.value; });
  fone.addEventListener('input', () => { ui.foneComprador = fone.value; });
  $('#f-checkout').addEventListener('submit', e => { e.preventDefault(); enviarReserva(); });
}
function erroCheckout(msg) { const e = $('#p-erro'); if (e) { e.textContent = msg; e.hidden = !msg; } }
async function enviarReserva() {
  const nums = ordenar(ui.sel);
  const nome = ($('#p-nome').value || '').trim().replace(/\s+/g, ' ');
  let fone = soDigitos($('#p-fone').value);
  if (nome.length < 2) { erroCheckout('Escreva seu nome pra eu saber de quem é o pedido.'); $('#p-nome').focus(); return; }
  if (/^55\d{10,11}$/.test(fone)) fone = fone.slice(2);
  if (!/^\d{10,11}$/.test(fone)) { erroCheckout('Confira seu WhatsApp: coloque o DDD e o número, como (41) 99999-0000.'); $('#p-fone').focus(); return; }
  if (nums.length > MAX_POR_PEDIDO) { erroCheckout('Cada pedido vai até ' + MAX_POR_PEDIDO + ' números. Tire alguns e faça outro pedido depois.'); return; }
  erroCheckout('');
  const b = $('#p-reservar'); b.disabled = true; b.textContent = 'Reservando…';
  let r = null, corpo = null;
  try {
    r = await fetch(SB_CFG.url.replace(/\/+$/, '') + '/rest/v1/rpc/reservar', {
      method: 'POST', cache: 'no-store',
      headers: { apikey: SB_CFG.chave, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ p_nome: nome, p_telefone: fone, p_numeros: nums })
    });
    corpo = await r.json().catch(() => null);
  } catch (e) { r = null; }
  if (!r || !r.ok || !corpo || !corpo.codigo) {
    tratarErroReserva(r ? String((corpo && corpo.message) || '') : 'rede');
    return;
  }
  const pedido = { codigo: corpo.codigo, numeros: (corpo.numeros || nums).map(Number), prazo: corpo.prazo, nome, fone, criado: new Date().toISOString(), enviado: false };
  salvarPedidoLocal(pedido);
  pedido.numeros.forEach(n => ocupadosPub.add(n));
  ui.sel.clear();
  if (ui.modo === 'publico') { renderGrade(false); renderMeusPedidos(); const l = $('#linha-livres'); if (l) l.textContent = textoLivres(); atualizarProgresso(); }
  abrirPagamento(pedido);
  soltarConfete();
  buscarEstadoSB();
}
function tratarErroReserva(msg) {
  const reabrir = (m, alt) => { if (ui.sel.size) abrirCheckout(m, alt); else { fecharFolha(); toast(m); } };
  if (msg.indexOf('numero_ocupado') === 0) {
    const tomados = (msg.split(':')[1] || '').split(',').map(Number).filter(Boolean);
    tomados.forEach(n => { ui.sel.delete(n); ocupadosPub.add(n); });
    if (ui.modo === 'publico') renderGrade(false);
    reabrir(plural(tomados.length, 'O ', 'Os ') + listaNums(tomados) + plural(tomados.length, ' acabou de ser reservado por outra pessoa e saiu do seu pedido.', ' acabaram de ser reservados por outra pessoa e saíram do seu pedido.') + (ui.sel.size ? ' Confira e toque em Gerar Pix de novo.' : ' Escolha outros números.'));
    buscarEstadoSB();
    return;
  }
  const T = {
    limite_whatsapp: 'Esse WhatsApp já tem 2 pedidos esperando pagamento. Pague um deles ou fale comigo no WhatsApp.',
    limite_conexao: 'Já tem vários pedidos esperando pagamento feitos daqui. Pague um deles ou fale comigo no WhatsApp.',
    muitos_pedidos: 'Muita gente fazendo pedido agora! Tente de novo daqui a alguns minutos.',
    muitos_numeros: 'Cada pedido vai até ' + MAX_POR_PEDIDO + ' números. Tire alguns e faça outro pedido depois.',
    numero_fora: 'Algum desses números não está mais à venda. Recarregue a página e escolha de novo.',
    vendas_fechadas: 'As vendas estão fechadas no momento.',
    vendas_pausadas: 'As vendas estão pausadas por um instante. Tente de novo daqui a pouco!',
    nome_invalido: 'Escreva seu nome pra eu saber de quem é o pedido.',
    telefone_invalido: 'Confira seu WhatsApp: coloque o DDD e o número, como (41) 99999-0000.',
    sem_numeros: 'Escolha pelo menos um número.'
  };
  const chave = Object.keys(T).find(k => msg.indexOf(k) === 0);
  if (chave) { reabrir(T[chave], chave === 'limite_whatsapp' || chave === 'limite_conexao' || chave === 'muitos_pedidos'); return; }
  reabrir(msg === 'rede' ? 'Não consegui falar com o sistema agora. Confira a internet e tente de novo.' : 'Não consegui reservar agora. Tente de novo em instantes.', true);
}
function htmlPixPedido(total, rotuloId) {
  if (!cfg.pixChave) return '';
  const cc = pixCopiaECola(total);
  return '<li><h3>Pague por Pix</h3>' +
    '<p class="dica">Chave Pix (' + ROTULO_PIX[cfg.pixTipo] + ')' + (cfg.pixNome ? ' · em nome de ' + esc(cfg.pixNome) : '') + '</p>' +
    '<div class="copia"><code>' + esc(cfg.pixChave) + '</code><button class="btn peq" type="button" data-copiar="' + esc(cfg.pixChave) + '">Copiar chave</button></div>' +
    (cc ? '<p class="dica">Ou use o Pix copia e cola, que já vem com o valor de ' + brl(total) + ':</p><div class="copia-cc"><textarea id="' + rotuloId + '" class="cc-campo" readonly rows="4" aria-label="Código Pix copia e cola">' + esc(cc) + '</textarea><button class="btn peq" type="button" data-copiar="' + esc(cc) + '" data-alvo="' + rotuloId + '">Copiar código</button></div>' : '') +
    (cc && qrSVG(cc) ? '<div class="qr-pix">' + qrSVG(cc, 'QR Code Pix de ' + brl(total)) + '<p>Tá no computador ou no celular de outra pessoa? Escaneie com o app do banco.</p></div>' : '') +
  '</li>';
}
function abrirPagamento(p) {
  const nums = ordenar(p.numeros || []);
  const total = nums.length * cfg.preco;
  abrirFolha('pagamento',
    '<div class="folha-cab">' + cabFolha('Pedido ' + esc(p.codigo)) +
      '<p class="reservado">✅ Números reservados pra você até <strong>' + fmtQuando(p.prazo) + '</strong></p>' + htmlChipsPedido(nums, false) +
    '</div><div class="perfura" aria-hidden="true"></div>' +
    '<div class="folha-corpo">' + htmlEtapas(2) +
      '<ol class="passos">' + htmlPixPedido(total, 'pix-cc-pedido') +
        '<li><h3>Me mande o comprovante</h3><p>Depois de pagar, toque no botão: o WhatsApp abre com o seu pedido pronto. É só anexar o comprovante do Pix.</p>' +
          '<a class="btn primario largo" id="p-comprovante" href="' + esc(linkWa(cfg.whatsapp, msgPedido(p.nome, nums, p.codigo))) + '" target="_blank" rel="noopener" data-acao="mandou-comprovante" data-codigo="' + esc(p.codigo) + '">Já paguei: mandar comprovante</a>' +
          '<p class="dica">Se o WhatsApp não abrir, mande o comprovante pro número <span class="num">' + esc(foneBonito(cfg.whatsapp)) + '</span> com o código <strong>' + esc(p.codigo) + '</strong> · <button class="link" type="button" data-copiar="' + esc(soDigitos(cfg.whatsapp)) + '">copiar número</button></p></li>' +
      '</ol>' +
      '<p class="nota">Assim que eu confirmar o pagamento, te mando o bilhete digital de cada número pelo WhatsApp. Se fechar esta janela, o pedido continua aqui na página, no aviso “Seu pedido”. 💛</p>' +
    '</div>');
}
function verPedido(codigo) {
  const p = lerPedidosLocais().find(x => x && x.codigo === codigo);
  if (p) abrirPagamento(p);
}

/* =====================================================================
   Reservas quase vencendo (painel)
   ===================================================================== */
function venceLogo(v) {
  if (v.pago || v.semPrazo || liberada(v) || vencida(v) || !(v.numeros || []).length) return false;
  return prazoDe(v).getTime() - Date.now() <= 3 * 3600000;
}
function faltaTexto(v) {
  const m = Math.max(1, Math.round((prazoDe(v).getTime() - Date.now()) / 60000));
  if (m < 60) return m + ' min';
  const h = Math.floor(m / 60), r = m % 60;
  return h + 'h' + (r ? String(r).padStart(2, '0') : '');
}

/* =====================================================================
   Resultado do sorteio
   ===================================================================== */
function numeroSorteado(i) { const n = Number(((cfg.resultado || [])[i]) || 0); return n > 0 ? n : 0; }
function temResultado() { return Array.isArray(cfg.resultado) && cfg.resultado.some(n => Number(n) > 0); }
function htmlResultado() {
  if (!temResultado()) return '';
  const meus = [];
  const itens = cfg.premios.map((p, i) => {
    const n = numeroSorteado(i), meu = n && UNI_SET.has(n);
    if (meu) meus.push(n);
    return '<li class="res-item' + (meu ? ' meu' : '') + '" style="--cor:' + (CORES_PREMIO[i] || CORES_PREMIO[0]) + '"><span class="res-pos">' + (i + 1) + 'º</span><span class="res-premio">' + esc(p) + '</span><span class="res-num num">' + (n || 'a definir') + '</span>' + (meu ? '<span class="res-selo">Número meu! 🎉</span>' : '') + '</li>';
  }).join('');
  const texto = meus.length
    ? '🎉 Saiu número meu! Se você comprou ' + plural(meus.length, 'o número ', 'os números ') + listaNums(meus) + ', eu vou te chamar no WhatsApp que você usou na compra pra combinar a retirada com a Formô.'
    : 'Desta vez nenhum dos números sorteados era dos meus. Muito obrigada a todo mundo que participou e me ajudou a chegar na formatura! 💛';
  return '<section class="wrap secao resultado" aria-labelledby="t-res"><div class="secao-cab"><h2 id="t-res">Resultado do <em>sorteio</em></h2><p class="dica">Sorteio ao vivo no ' + igLink() + ' em ' + dataBR(cfg.sorteio) + '.</p></div>' +
    '<ol class="res-lista">' + itens + '</ol><p class="res-texto">' + texto + '</p></section>';
}
function msgGanhador(v, n, premio) {
  return preencher(msgModelo('ganhador'), Object.assign(varsVenda(v.nome, [n], false), { numero: n, premio }));
}
function htmlAvisoGanhadores() {
  if (!temResultado()) return '';
  const mapa = mapaVendas(); const itens = [];
  cfg.premios.forEach((p, i) => {
    const n = numeroSorteado(i);
    if (!n || !UNI_SET.has(n)) return;
    const v = mapa.get(n);
    itens.push('<li><span><strong class="num">' + n + '</strong> · ' + (i + 1) + 'º prêmio (' + esc(p) + ') · ' + (v ? esc(v.nome || 'sem nome') + (v.pago ? '' : ' <em>(não está como pago)</em>') : 'não foi vendido') + '</span>' +
      (v && v.telefone ? '<a class="btn peq primario" href="' + esc(linkWa(v.telefone, msgGanhador(v, n, p))) + '" target="_blank" rel="noopener">Avisar no WhatsApp</a>' : '') + '</li>');
  });
  if (!itens.length) return '<div class="aviso"><div><strong>Resultado do sorteio salvo.</strong><p>Nenhum dos números sorteados é dos seus blocos.</p></div></div>';
  return '<div class="aviso ganhou"><div><strong>🎉 Saiu número seu no sorteio!</strong><ul class="ganhadores">' + itens.join('') + '</ul></div></div>';
}

/* =====================================================================
   Lista de controle pra imprimir (modelo da Formô: uma página por bloco)
   ===================================================================== */
function imprimirLista() {
  if (!vendasCarregadas) { toast('Espere suas vendas carregarem.'); return; }
  const mapa = mapaVendas();
  const quando = fmtQuando(new Date().toISOString());
  const linha = n => {
    const v = mapa.get(n), pago = !!(v && v.pago);
    return '<tr><td class="li-n">' + n + '</td><td class="li-c">' + (v ? esc(v.nome || '') + (pago ? '' : ' <span class="li-res">(reservado)</span>') : '') + '</td>' +
      '<td class="li-t">' + (v && v.telefone ? esc(foneBonito(v.telefone)) : '') + '</td><td class="li-p"><span class="li-box' + (pago ? ' ok' : '') + '">' + (pago ? '✓' : '') + '</span></td></tr>';
  };
  const tabela = nums => '<table><colgroup><col class="c-n"><col><col class="c-t"><col class="c-p"></colgroup><thead><tr><th>Nº</th><th>Comprador</th><th>Telefone</th><th>Pago</th></tr></thead><tbody>' + nums.map(linha).join('') + '</tbody></table>';
  const paginas = BLOCOS.map(b => {
    const meio = Math.ceil(b.nums.length / 2);
    const comDono = b.nums.filter(n => mapa.has(n)).length;
    const pagos = b.nums.filter(n => { const v = mapa.get(n); return v && v.pago; }).length;
    return '<section class="li-pag"><header><p class="li-ed">' + esc(cfg.edicao) + ' · vendedora: ' + esc(cfg.vendedora) + '</p><h1>Controle de vendas</h1>' +
      '<p>Bloco ' + b.ini + ' a ' + b.fim + ' · ' + pagos + ' ' + plural(pagos, 'pago', 'pagos') + ', ' + (comDono - pagos) + ' ' + plural(comDono - pagos, 'reservado', 'reservados') + ', ' + (b.nums.length - comDono) + ' ' + plural(b.nums.length - comDono, 'livre', 'livres') + '. Atualizado em ' + quando + '. Sorteio em ' + dataBR(cfg.sorteio) + '.</p></header>' +
      '<div class="li-cols">' + tabela(b.nums.slice(0, meio)) + tabela(b.nums.slice(meio)) + '</div></section>';
  }).join('');
  let el = $('#impressao');
  if (!el) { el = document.createElement('div'); el.id = 'impressao'; document.body.appendChild(el); }
  el.innerHTML = paginas;
  document.documentElement.classList.add('imprimindo');
  const limpar = () => { document.documentElement.classList.remove('imprimindo'); window.removeEventListener('afterprint', limpar); };
  window.addEventListener('afterprint', limpar);
  setTimeout(() => { try { window.print(); } catch (e) { toast('Não consegui abrir a impressão neste aparelho.'); limpar(); } }, 60);
}


/* =====================================================================
   Toques finais: barra de vendidos, confete, botão de dúvidas
   ===================================================================== */
const MIN_PROGRESSO = 10; /* a barra só aparece depois de alguns números vendidos */
function contagemVendidos() {
  const total = UNI.length;
  const vendidos = UNI.filter(n => ocupadosPub.has(n)).length;
  return { total, vendidos };
}
function htmlProgresso() {
  if (!cfg.mostrarContador) return '';
  const c = contagemVendidos();
  if (!c.total || c.vendidos < MIN_PROGRESSO) return '';
  const pct = Math.min(100, Math.round(c.vendidos / c.total * 100));
  const falta = c.total - c.vendidos;
  return '<div class="progresso-pub" role="img" aria-label="' + c.vendidos + ' de ' + c.total + ' números já vendidos">' +
    '<p><strong>🎉 Já foram <span class="num">' + c.vendidos + '</span> de <span class="num">' + c.total + '</span> números!</strong> ' +
    (falta ? (falta <= 20 ? 'Só ' + plural(falta, 'falta ', 'faltam ') + falta + '. Me ajuda a completar 💛' : 'Me ajuda a completar 💛') : 'Todos vendidos, obrigada! 💛') + '</p>' +
    '<div class="progresso-trilho"><span style="width:' + pct + '%"></span></div></div>';
}
function atualizarProgresso() {
  const el = $('#progresso-pub'); if (el) el.innerHTML = htmlProgresso();
}

function soltarConfete() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cv = document.createElement('canvas');
  cv.className = 'confete'; cv.setAttribute('aria-hidden', 'true');
  document.body.appendChild(cv);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = window.innerWidth, H = window.innerHeight;
  cv.width = W * dpr; cv.height = H * dpr;
  const g = cv.getContext('2d'); if (!g) { cv.remove(); return; }
  g.scale(dpr, dpr);
  const cores = ['#FCBA59', '#61C4E1', '#F1BFC0', '#87B9A0', '#EE6A52', '#FEEAD1'];
  const pecas = Array.from({ length: 140 }, (_, i) => ({
    x: W / 2 + (Math.random() - .5) * W * .3, y: H * .35 + (Math.random() - .5) * 40,
    vx: (Math.random() - .5) * 13, vy: -Math.random() * 13 - 5,
    r: Math.random() * Math.PI, vr: (Math.random() - .5) * .35,
    w: 6 + Math.random() * 7, h: 9 + Math.random() * 9, cor: cores[i % cores.length], forma: i % 3
  }));
  const inicio = performance.now();
  const passo = t => {
    const dt = t - inicio;
    g.clearRect(0, 0, W, H);
    pecas.forEach(p => {
      p.vy += .32; p.vx *= .992; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.globalAlpha = Math.max(0, 1 - dt / 2600); g.fillStyle = p.cor;
      if (p.forma === 0) { g.beginPath(); g.arc(0, 0, p.w / 2, 0, Math.PI * 2); g.fill(); }
      else g.fillRect(-p.w / 2, -p.h / 2, p.w, p.forma === 1 ? p.h : p.h / 2.4);
      g.restore();
    });
    if (dt < 2600) requestAnimationFrame(passo); else cv.remove();
  };
  requestAnimationFrame(passo);
}

function linkDuvidas() {
  return linkWa(cfg.whatsapp, 'Oi, ' + cfg.vendedora + '! Tenho uma dúvida sobre a rifa da formatura 😊');
}
function atualizarBotaoDuvidas() {
  let b = $('#duvidas');
  const mostrar = ui.modo === 'publico' && !!cfg.whatsapp && !ui.folha && ui.sel.size === 0 && cfg.pronto;
  if (!b) {
    if (!mostrar) return;
    b = document.createElement('a');
    b.id = 'duvidas'; b.className = 'duvidas'; b.target = '_blank'; b.rel = 'noopener';
    b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" width="20" height="20"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.2 3.6c-.5.4-1.3.1-1.3-.6V16A2.5 2.5 0 0 1 4 13.5z" fill="currentColor"/><circle cx="8.5" cy="9.5" r="1.2" style="fill:var(--c5)"/><circle cx="12" cy="9.5" r="1.2" style="fill:var(--c5)"/><circle cx="15.5" cy="9.5" r="1.2" style="fill:var(--c5)"/></svg><span>Dúvidas? Fala comigo</span>';
    document.body.appendChild(b);
  }
  b.href = linkDuvidas();
  b.hidden = !mostrar;
}


/* =====================================================================
   Carrinho, pausa das vendas
   ===================================================================== */
const ICONE_CARRINHO = '<svg class="ic-carrinho" viewBox="0 0 24 24" aria-hidden="true" width="22" height="22"><path d="M2.5 4h2.2l2.3 10.1a1.6 1.6 0 0 0 1.6 1.2h8.3a1.6 1.6 0 0 0 1.5-1.1l2.2-6.6H6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="9.6" cy="19.4" r="1.7" fill="currentColor"/><circle cx="17" cy="19.4" r="1.7" fill="currentColor"/></svg>';
let ultimoCarrinho = 0;
function htmlCarrinho(n) {
  const pula = n !== ultimoCarrinho;
  ultimoCarrinho = n;
  return '<span class="carrinho' + (pula ? ' pula' : '') + '" aria-hidden="true">' + ICONE_CARRINHO + '<b class="num">' + n + '</b></span>';
}

const MSG_PAUSA_PADRAO = 'As vendas estão pausadas por um instante. Volto já! 💛';
function htmlPausada() {
  return '<div class="aviso-breve pausa"><h3>⏸️ Vendas pausadas</h3><p class="dica">' + esc(cfg.msgPausa || MSG_PAUSA_PADRAO) + '</p>' +
    (cfg.whatsapp ? '<a class="btn peq" href="' + esc(linkWa(cfg.whatsapp, 'Oi, ' + cfg.vendedora + '! Me avisa quando a rifa voltar? 😊')) + '" target="_blank" rel="noopener">Me avisa quando voltar</a>' : '') + '</div>';
}
function abrirPausa() {
  abrirFolha('pausa',
    '<div class="folha-cab">' + cabFolha('Pausar as vendas') + '</div>' +
    '<form class="folha-corpo" id="f-pausa" novalidate>' +
      '<p>Enquanto estiver pausado, quem abrir a página vê os prêmios e o seu aviso, mas não consegue reservar números. Quem já tem pedido continua conseguindo pagar e te mandar o comprovante.</p>' +
      '<div class="campo"><label for="pausa-msg">Aviso que aparece na página</label><textarea id="pausa-msg" rows="3">' + esc(cfg.msgPausa || MSG_PAUSA_PADRAO) + '</textarea></div>' +
      '<button class="btn primario largo" type="submit" id="pausa-ok">Pausar agora</button>' +
    '</form>');
  $('#f-pausa').addEventListener('submit', async e => {
    e.preventDefault();
    $('#pausa-ok').disabled = true;
    const msg = $('#pausa-msg').value.trim() || MSG_PAUSA_PADRAO;
    fecharFolha();
    await publicar(Object.assign({}, cfg, { pausado: true, msgPausa: msg }), 'Vendas pausadas. A página já mostra o seu aviso.');
  });
}
async function retomarVendas() {
  await publicar(Object.assign({}, cfg, { pausado: false }), 'Vendas retomadas! A página voltou a aceitar pedidos.');
}


/* =====================================================================
   Fundo contínuo: rabiscos e rifinhas passando de uma parte pra outra
   (uma camada só, atrás do texto e na frente das cores das faixas).
   Cada desenho procura um lugar vazio perto de onde deveria ficar,
   pra nunca ficar atrás de título, texto, botão ou cartão.
   ===================================================================== */
function formaInfo(nome, s) {
  const pts = [];
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const ponto = (c, x, y) => { pts.push(c + x.toFixed(1) + ' ' + y.toFixed(1)); x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); };
  FORMAS[nome]({ moveTo: (x, y) => ponto('M', x, y), lineTo: (x, y) => ponto('L', x, y) }, s);
  return { d: pts.join(''), x0, y0, x1, y1 };
}
const RIFINHA = 'M-30 -17h60a5 5 0 0 1 5 5v6a6 6 0 0 0 0 12v6a5 5 0 0 1 -5 5h-60a5 5 0 0 1 -5 -5v-6a6 6 0 0 0 0 -12v-6a5 5 0 0 1 5 -5z';
function aleatorio(semente) { let s = semente; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
function blocosFundo() {
  const app = $('#app'); if (!app) return [];
  const topoApp = app.getBoundingClientRect().top;
  return $$('.faixa-dona, .hero, main > section, .rodape', app).map(el => {
    const r = el.getBoundingClientRect();
    return { top: r.top - topoApp, bottom: r.bottom - topoApp, escuro: el.matches('.hero, .banda-verde, .rodape, .faixa-dona') };
  });
}
/* retângulos de tudo que não pode ficar escondido atrás de um desenho: linhas de texto, botões, cartões, fotos */
function obstaculosFundo(app) {
  const topoApp = app.getBoundingClientRect().top, esq = app.getBoundingClientRect().left;
  const lista = [];
  const add = r => { if (r.width > 1 && r.height > 1) lista.push({ x0: r.left - esq - 6, y0: r.top - topoApp - 6, x1: r.right - esq + 6, y1: r.bottom - topoApp + 6 }); };
  const solido = el => {
    if (/^(IMG|BUTTON|INPUT|TEXTAREA|SELECT|CANVAS|VIDEO|SUMMARY)$/.test(el.tagName) || el.matches('.btn, .slide, .carrossel, .grade, [role="button"]')) return true;
    if (el.matches('.banda, .hero, .rodape, .wrap, main, section')) return false;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.position === 'fixed') return null;
    const bg = cs.backgroundColor;
    return (bg && bg !== 'transparent' && !/rgba\([^)]*,\s*0\)$/.test(bg)) || cs.backgroundImage !== 'none' || parseFloat(cs.borderTopWidth) > 0;
  };
  const andar = el => {
    for (const filho of el.children) {
      if (filho.id === 'fundo-desenhos' || filho.matches('canvas.rabiscos')) continue;
      const s = solido(filho);
      if (s === null) continue;
      if (s) { add(filho.getBoundingClientRect()); continue; }
      andar(filho);
    }
    for (const no of el.childNodes) {
      if (no.nodeType === 3 && no.textContent.trim()) {
        const rg = document.createRange(); rg.selectNodeContents(no);
        for (const r of rg.getClientRects()) add(r);
      }
    }
  };
  andar(app);
  return lista;
}
function caixaGirada(b, tx, ty, ang) {
  const c = Math.cos(ang), s = Math.sin(ang);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  [[b.x0, b.y0], [b.x1, b.y0], [b.x0, b.y1], [b.x1, b.y1]].forEach(([x, y]) => {
    const X = tx + x * c - y * s, Y = ty + x * s + y * c;
    x0 = Math.min(x0, X); y0 = Math.min(y0, Y); x1 = Math.max(x1, X); y1 = Math.max(y1, Y);
  });
  return { x0, y0, x1, y1 };
}
function sobreposicao(cx, obs, W) {
  const a = Math.max(0, cx.x0), b = Math.min(W, cx.x1);
  if (b <= a) return 0;
  let soma = 0;
  for (const o of obs) {
    const w = Math.min(b, o.x1) - Math.max(a, o.x0); if (w <= 0) continue;
    const h = Math.min(cx.y1, o.y1) - Math.max(cx.y0, o.y0); if (h <= 0) continue;
    soma += w * h;
  }
  return soma;
}
function desenharRabiscos() {
  const app = $('#app'); if (!app) return;
  let svg = $('#fundo-desenhos');
  if (ui.modo !== 'publico' || !$('.hero')) { if (svg) svg.remove(); return; }
  if (!svg) {
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = 'fundo-desenhos'; svg.setAttribute('aria-hidden', 'true');
  }
  if (svg.parentNode !== app || app.firstChild !== svg) app.insertBefore(svg, app.firstChild);
  const blocos = blocosFundo();
  const W = app.clientWidth, H = blocos.length ? Math.ceil(blocos[blocos.length - 1].bottom) : 0;
  if (!W || !H) return;
  fundoAltura = H;
  svg.setAttribute('width', W); svg.setAttribute('height', H); svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  const obs = obstaculosFundo(app);
  const escuroEm = y => { const b = blocos.find(x => y >= x.top && y < x.bottom); return b ? b.escuro : false; };
  const k = Math.min(1.5, Math.max(1, W / 420));
  const rnd = aleatorio(20262);
  let h = '';
  /* rabiscos nas emendas entre as partes: um lado de cada vez, metade pra fora da tela */
  const cores = ['--c5', '--c6', '--c2', '--c5', '--c6', '--c2'];
  const formas = ['laco', 'zigue', 'mola', 'onda', 'laco', 'zigue'];
  /* onde duas partes escuras se encostam (Me ajuda a vender + rodapé) não há emenda pra enfeitar */
  const emendas = blocos.slice(0, -1).filter((b, j) => !(b.escuro && blocos[j + 1].escuro)).map(b => b.bottom).filter(y => y > 40 && y < H - 40);
  emendas.forEach((y, i) => {
    const direita = i % 2 === 0;
    const forma = formas[i % formas.length];
    const tam = (forma === 'onda' ? 130 : forma === 'zigue' ? 80 : forma === 'mola' ? 84 : 100) * k;
    const f = formaInfo(forma, tam);
    const ang = (direita ? 1 : -1) * (.12 + rnd() * .25);
    let melhor = null;
    [.62, .5, .4, .3].forEach(vis => {
      [0, -18, 18, -36, 36, -54, 54, -72, 72].forEach(dy => {
        /* acha a translação que deixa "vis" da largura do desenho dentro da tela */
        const c0 = caixaGirada(f, 0, 0, ang), larg = c0.x1 - c0.x0;
        const tx = direita ? W - vis * larg - c0.x0 : vis * larg - c0.x1;
        const ty = y + dy - (c0.y0 + c0.y1) / 2;
        const cx = caixaGirada(f, tx, ty, ang);
        const nota = sobreposicao(cx, obs, W) * 4 + Math.abs(dy) * 6 * k + (.62 - vis) * 1800 * k;
        if (!melhor || nota < melhor.nota) melhor = { nota, tx, ty };
      });
    });
    h += '<path class="rabisco" style="stroke:var(' + cores[i % cores.length] + ');stroke-width:' + (12 * Math.min(k, 1.3)).toFixed(1) + '" transform="translate(' + melhor.tx.toFixed(0) + ' ' + melhor.ty.toFixed(0) + ') rotate(' + (ang * 57.3).toFixed(0) + ')" d="' + f.d + '"/>';
  });
  /* um rabisco no topo, como antes */
  const topo = formaInfo('mola', 88 * k);
  h += '<path class="rabisco" style="stroke:var(--c5);stroke-width:' + (14 * Math.min(k, 1.3)).toFixed(1) + '" transform="translate(' + (W * .95).toFixed(0) + ' ' + ((blocos[0] ? blocos[0].top : 0) + 4).toFixed(0) + ') rotate(20)" d="' + topo.d + '"/>';
  /* rifinhas bem transparentes espalhadas pela página, nos espaços livres */
  const nRif = Math.max(6, Math.round(H / 340));
  const passo = H / nRif;
  for (let i = 0; i < nRif; i++) {
    const esc = (.75 + rnd() * .5) * Math.min(1.25, k);
    const rot = (rnd() - .5) * 1.2;
    const base = { x0: -36 * esc, y0: -18 * esc, x1: 36 * esc, y1: 18 * esc };
    const lado = i % 2 === 0;
    let melhor = null;
    for (let t = 0; t < 14; t++) {
      const fx = lado ? -.06 + rnd() * .4 : .66 + rnd() * .4;
      const yy = (i + .15 + rnd() * .7) * passo;
      const cx = caixaGirada(base, fx * W, yy, rot);
      const nota = sobreposicao(cx, obs, W) + rnd() * 40;
      if (!melhor || nota < melhor.nota) melhor = { nota, x: fx * W, y: yy };
    }
    const claro = escuroEm(melhor.y);
    h += '<g class="rifinha' + (claro ? ' clara' : '') + '" transform="translate(' + melhor.x.toFixed(0) + ' ' + melhor.y.toFixed(0) + ') rotate(' + (rot * 57.3).toFixed(0) + ') scale(' + esc.toFixed(2) + ')">' +
      '<path d="' + RIFINHA + '"/><path class="picote" d="M14 -17v34"/><path class="risco" d="M-22 -4h22M-22 4h14"/></g>';
  }
  svg.innerHTML = h;
  /* o listrado do rodapé continua o do "Me ajuda a vender", sem emenda */
  const rod = $('.rodape', app), verde = $('.banda-verde', app);
  if (rod && verde) rod.style.backgroundPosition = '0 ' + (-Math.round(verde.getBoundingClientRect().height)) + 'px';
}
let fundoTimer = null, fundoAltura = 0;
function agendarFundo() {
  clearTimeout(fundoTimer);
  fundoTimer = setTimeout(() => {
    if (ui.modo !== 'publico') return;
    const b = blocosFundo(); const alt = b.length ? Math.ceil(b[b.length - 1].bottom) : 0;
    if (Math.abs(alt - fundoAltura) > 2) desenharRabiscos();
  }, 120);
}
if (window.ResizeObserver) { try { new ResizeObserver(agendarFundo).observe($('#app')); } catch (e) { /* segue sem */ } }

/* ---------- início ---------- */
criarCamadas();
if (PAGINA === 'admin') telaPainel('carregando'); else render();
try { const m = sessionStorage.getItem('rifa-toast'); if (m) { sessionStorage.removeItem('rifa-toast'); setTimeout(() => toast(m), 400); } } catch (e) { /* nada */ }
let rz = null, larguraAntes = window.innerWidth; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (window.innerWidth !== larguraAntes) { larguraAntes = window.innerWidth; desenharRabiscos(); } }, 150); });
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (ui.modo === 'publico') desenharRabiscos(); });
conectar();
buscarEstadoExterno();
})();
