/* Login do painel da rifa (Supabase Auth: e-mail e senha) */
(function () {
  'use strict';
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const C = window.RIFA_SUPABASE || {};
  const corpo = $('#login-corpo');
  const PAINEL = '../admin/';

  function cabecalho(titulo, texto) {
    return '<span class="selo">Painel da vendedora</span><h1>' + titulo + '</h1>' + (texto ? '<p class="dica">' + texto + '</p>' : '');
  }
  function campoSenha(id, rotulo, auto) {
    return '<div class="campo"><label for="' + id + '">' + rotulo + '</label><div class="senha-linha"><input id="' + id + '" type="password" autocomplete="' + auto + '" required minlength="6">' +
      '<button class="link" type="button" data-ver="' + id + '" aria-label="Mostrar a senha" aria-pressed="false">Mostrar</button></div></div>';
  }

  if (!window.supabase || !C.url || !C.chave) {
    corpo.innerHTML = cabecalho('Quase pronto', 'O painel ainda não foi ligado ao banco de dados. Assim que isso for feito, o login aparece aqui.');
    return;
  }
  const sb = window.supabase.createClient(C.url, C.chave, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  let recuperando = /type=recovery/.test(location.hash);

  function traduzir(err) {
    const m = String((err && err.message) || '').toLowerCase();
    if (m.includes('invalid login credentials')) return 'E-mail ou senha não conferem. Confira e tente de novo.';
    if (m.includes('email not confirmed')) return 'Esse e-mail ainda não foi confirmado. No Supabase, confirme o usuário em Authentication > Users.';
    if (m.includes('rate limit') || m.includes('too many') || (err && err.status === 429)) return 'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.';
    if (m.includes('password should be') || m.includes('weak')) return 'Essa senha é fraca demais. Use pelo menos 8 caracteres, misturando letras e números.';
    if (m.includes('same password') || m.includes('different from the old')) return 'A senha nova precisa ser diferente da antiga.';
    if (m.includes('failed to fetch') || m.includes('network')) return 'Não consegui conectar. Confira a internet e tente de novo.';
    return 'Não deu certo agora. Tente de novo em instantes.';
  }
  function erro(msg) { const e = $('#l-erro'); if (!e) return; e.textContent = msg; e.hidden = !msg; }
  function ocupado(sim, texto) { const b = $('#l-botao'); if (!b) return; b.disabled = sim; if (texto) b.textContent = texto; }

  function telaEntrar(aviso) {
    corpo.innerHTML = cabecalho('Entrar', 'Use o e-mail e a senha que você autorizou no Supabase.') +
      (aviso ? '<p class="ok-msg" role="status">' + esc(aviso) + '</p>' : '') +
      '<form id="l-form" class="login-form" novalidate>' +
        '<div class="campo"><label for="l-email">E-mail</label><input id="l-email" type="email" autocomplete="username" inputmode="email" required></div>' +
        campoSenha('l-senha', 'Senha', 'current-password') +
        '<p class="erro" id="l-erro" role="alert" hidden></p>' +
        '<button class="btn primario largo" type="submit" id="l-botao">Entrar no painel</button>' +
      '</form>' +
      '<button class="link" type="button" id="l-esqueci">Esqueci minha senha</button>';
    $('#l-email').focus();
    $('#l-form').addEventListener('submit', async ev => {
      ev.preventDefault();
      const email = $('#l-email').value.trim(), senha = $('#l-senha').value;
      if (!email || !senha) { erro('Preencha o e-mail e a senha.'); return; }
      erro(''); ocupado(true, 'Entrando…');
      const { error } = await sb.auth.signInWithPassword({ email, password: senha });
      if (error) { erro(traduzir(error)); ocupado(false, 'Entrar no painel'); return; }
      location.replace(PAINEL);
    });
    $('#l-esqueci').addEventListener('click', () => telaEsqueci($('#l-email').value.trim()));
  }

  function telaEsqueci(emailInicial) {
    corpo.innerHTML = cabecalho('Esqueci a senha', 'Escreva seu e-mail. Se ele tiver acesso ao painel, chega um link pra você criar uma senha nova.') +
      '<form id="l-form" class="login-form" novalidate>' +
        '<div class="campo"><label for="l-email">E-mail</label><input id="l-email" type="email" autocomplete="username" inputmode="email" required value="' + esc(emailInicial || '') + '"></div>' +
        '<p class="erro" id="l-erro" role="alert" hidden></p>' +
        '<button class="btn primario largo" type="submit" id="l-botao">Mandar o link</button>' +
      '</form>' +
      '<button class="link" type="button" id="l-voltar">Voltar pro login</button>';
    $('#l-email').focus();
    $('#l-voltar').addEventListener('click', () => telaEntrar());
    $('#l-form').addEventListener('submit', async ev => {
      ev.preventDefault();
      const email = $('#l-email').value.trim();
      if (!email) { erro('Escreva seu e-mail.'); return; }
      erro(''); ocupado(true, 'Mandando…');
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
      if (error) { erro(traduzir(error)); ocupado(false, 'Mandar o link'); return; }
      telaEntrar('Pronto! Se esse e-mail tiver acesso, o link chega em alguns minutos. Olhe também o spam.');
    });
  }

  function telaNovaSenha() {
    corpo.innerHTML = cabecalho('Senha nova', 'Crie a senha que você vai usar pra entrar no painel.') +
      '<form id="l-form" class="login-form" novalidate>' +
        campoSenha('l-senha', 'Senha nova', 'new-password') +
        campoSenha('l-senha2', 'Repita a senha nova', 'new-password') +
        '<p class="erro" id="l-erro" role="alert" hidden></p>' +
        '<button class="btn primario largo" type="submit" id="l-botao">Salvar e entrar</button>' +
      '</form>';
    $('#l-senha').focus();
    $('#l-form').addEventListener('submit', async ev => {
      ev.preventDefault();
      const s1 = $('#l-senha').value, s2 = $('#l-senha2').value;
      if (s1.length < 8) { erro('Use pelo menos 8 caracteres.'); return; }
      if (s1 !== s2) { erro('As duas senhas não estão iguais.'); return; }
      erro(''); ocupado(true, 'Salvando…');
      const { error } = await sb.auth.updateUser({ password: s1 });
      if (error) { erro(traduzir(error)); ocupado(false, 'Salvar e entrar'); return; }
      history.replaceState(null, '', location.pathname);
      location.replace(PAINEL);
    });
  }

  document.addEventListener('click', ev => {
    const b = ev.target.closest('[data-ver]'); if (!b) return;
    const inp = document.getElementById(b.dataset.ver); if (!inp) return;
    const ver = inp.type === 'password';
    inp.type = ver ? 'text' : 'password';
    b.textContent = ver ? 'Esconder' : 'Mostrar';
    b.setAttribute('aria-pressed', String(ver));
    b.setAttribute('aria-label', ver ? 'Esconder a senha' : 'Mostrar a senha');
  });

  sb.auth.onAuthStateChange(ev => { if (ev === 'PASSWORD_RECOVERY') { recuperando = true; telaNovaSenha(); } });

  (async () => {
    let sessao = null;
    try { const r = await sb.auth.getSession(); sessao = r && r.data && r.data.session; } catch (e) { sessao = null; }
    if (recuperando) { if (!$('#l-senha2')) telaNovaSenha(); return; }
    if (/error_code=otp_expired|error=access_denied/.test(location.hash)) { history.replaceState(null, '', location.pathname); telaEsqueci(); erro('Esse link já expirou. Peça um novo.'); return; }
    if (sessao) { location.replace(PAINEL); return; }
    telaEntrar();
  })();
})();
