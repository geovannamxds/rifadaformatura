/**
 * Rifa da Formatura · cópia automática das vendas nesta planilha
 *
 * O banco de dados da rifa (Supabase) manda pra cá a lista completa de vendas
 * sempre que algo muda e também de hora em hora. Cada envio reescreve as abas
 * "Vendas", "Números" e "Resumo". Não precisa mexer em nada aqui.
 */
const SEGREDO = '__SEGREDO__';
const FUSO = 'America/Sao_Paulo';

function doPost(e) {
  let dados;
  try {
    dados = JSON.parse(e.postData.contents);
  } catch (err) {
    return resposta('json_invalido');
  }
  if (!dados || dados.segredo !== SEGREDO) return resposta('negado');
  const trava = LockService.getScriptLock();
  trava.waitLock(30000);
  try {
    atualizarPlanilha(dados);
  } finally {
    trava.releaseLock();
  }
  return resposta('ok');
}

function resposta(texto) {
  return ContentService.createTextOutput(texto);
}

function quando(iso) {
  return iso ? Utilities.formatDate(new Date(iso), FUSO, 'dd/MM/yyyy HH:mm') : '';
}

function fone(t) {
  const s = String(t || '').replace(/\D/g, '');
  if (s.length === 11) return '(' + s.slice(0, 2) + ') ' + s.slice(2, 7) + '-' + s.slice(7);
  if (s.length === 10) return '(' + s.slice(0, 2) + ') ' + s.slice(2, 6) + '-' + s.slice(6);
  return s;
}

function atualizarPlanilha(d) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const prazoHoras = Number(d.prazo_horas) || 24;
  const preco = Number(d.preco) || 0;
  const vendas = d.vendas || [];

  const situacao = function (v) {
    if (v.situacao) return v.situacao;
    if (v.pago) return 'Pago';
    if (!(v.numeros || []).length && v.liberada) return 'Liberada (não pagou no prazo)';
    if (Date.parse(v.criado) + prazoHoras * 3600000 < Date.now()) return 'Reserva vencida';
    return 'Aguardando pagamento';
  };

  // Aba "Vendas": uma linha por venda
  const linhasVendas = vendas.map(function (v) {
    const nums = (v.numeros || []).length ? v.numeros : (v.liberados || []);
    return [
      v.codigo || '', v.nome || '', fone(v.telefone), nums.join(', '), nums.length, nums.length * preco,
      situacao(v), v.bilhete ? 'Sim' : 'Não', quando(v.criado), quando(v.pago_em),
      v.origem_txt || (v.origem === 'site' ? 'Site' : 'Painel'), v.obs || ''
    ];
  });
  escrever(ss, 'Vendas',
    ['Pedido', 'Comprador', 'WhatsApp', 'Números', 'Qtd.', 'Valor (R$)', 'Situação', 'Bilhete enviado', 'Feito em', 'Pago em', 'Origem', 'Observação'],
    linhasVendas, { 6: 'R$ #,##0.00' });

  // Aba "Números": uma linha por número, como a lista de controle da Formô
  const dono = {};
  vendas.forEach(function (v) { (v.numeros || []).forEach(function (n) { dono[n] = v; }); });
  const linhasNumeros = (d.universo || []).map(function (n) {
    const ini = Math.floor((n - 1) / 50) * 50 + 1;
    const v = dono[n];
    return [n, ini + ' a ' + (ini + 49), v ? v.nome : '', v ? fone(v.telefone) : '', v ? situacao(v) : 'Livre', v ? (v.codigo || '') : ''];
  });
  escrever(ss, 'Números', ['Número', 'Bloco', 'Comprador', 'WhatsApp', 'Situação', 'Pedido'], linhasNumeros, {});

  // Aba "Resumo"
  let pagos = 0, aguardando = 0;
  Object.keys(dono).forEach(function (n) { if (dono[n].pago) pagos++; else aguardando++; });
  const total = (d.universo || []).length;
  escrever(ss, 'Resumo', ['Item', 'Valor'], [
    ['Atualizado em', quando(new Date().toISOString())],
    ['Números à venda', total],
    ['Números pagos', pagos],
    ['Números aguardando pagamento', aguardando],
    ['Números livres', total - pagos - aguardando],
    ['Recebido (R$)', pagos * preco],
    ['A receber (R$)', aguardando * preco],
    ['Vendas registradas', vendas.length]
  ], {});

  // a primeira aba em branco da planilha some, se ainda existir
  ['Página1', 'Sheet1'].forEach(function (nome) {
    const aba = ss.getSheetByName(nome);
    if (aba && aba.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(aba);
  });
}

function escrever(ss, nome, cabecalho, linhas, formatos) {
  const aba = ss.getSheetByName(nome) || ss.insertSheet(nome);
  aba.clearContents();
  const tudo = [cabecalho].concat(linhas);
  aba.getRange(1, 1, tudo.length, cabecalho.length).setValues(tudo);
  aba.getRange(1, 1, 1, cabecalho.length).setFontWeight('bold').setBackground('#173B33').setFontColor('#FBF4E6');
  aba.setFrozenRows(1);
  Object.keys(formatos).forEach(function (col) {
    if (linhas.length) aba.getRange(2, Number(col), linhas.length, 1).setNumberFormat(formatos[col]);
  });
}
