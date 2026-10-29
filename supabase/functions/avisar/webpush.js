// Web Push (RFC 8291 aes128gcm + VAPID RFC 8292) só com WebCrypto: roda no Deno (Supabase) e no Node 20+.
const te = new TextEncoder();
export function b64u(bytes) {
  let s = ''; const b = new Uint8Array(bytes);
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function deB64u(str) {
  const s = String(str).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(s + '='.repeat((4 - (s.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function junta(...partes) {
  const n = partes.reduce((s, p) => s + p.length, 0); const out = new Uint8Array(n); let o = 0;
  for (const p of partes) { out.set(p, o); o += p.length; }
  return out;
}
async function hkdf(salt, ikm, info, bytes) {
  const k = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, k, bytes * 8));
}
/* criptografa a mensagem pro aparelho (p256dh + auth da inscrição) */
export async function cifrar(texto, p256dh, authSecret) {
  const uaPublic = deB64u(p256dh), auth = deB64u(authSecret);
  const par = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', par.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, par.privateKey, 256));
  const ikm = await hkdf(auth, ecdh, junta(te.encode('WebPush: info\0'), uaPublic, asPublic), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, te.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, te.encode('Content-Encoding: nonce\0'), 12);
  const chave = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const claro = junta(te.encode(texto), new Uint8Array([2]));
  const cifrado = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, chave, claro));
  const rs = new Uint8Array([0, 0, 16, 0]); // 4096
  return junta(salt, rs, new Uint8Array([asPublic.length]), asPublic, cifrado);
}
/* assinatura VAPID (JWT ES256) */
export async function vapid(endpoint, jwkPrivado, contato) {
  const aud = new URL(endpoint).origin;
  const cab = b64u(te.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const corpo = b64u(te.encode(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: contato })));
  const chave = await crypto.subtle.importKey('jwk', jwkPrivado, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const ass = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, chave, te.encode(cab + '.' + corpo)));
  const publica = junta(new Uint8Array([4]), deB64u(jwkPrivado.x), deB64u(jwkPrivado.y));
  return 'vapid t=' + cab + '.' + corpo + '.' + b64u(ass) + ', k=' + b64u(publica);
}
/* manda um aviso pra uma inscrição; devolve o código HTTP do serviço de push */
export async function mandar(inscricao, mensagem, jwkPrivado, contato, opcoes = {}) {
  const corpo = await cifrar(JSON.stringify(mensagem), inscricao.keys.p256dh, inscricao.keys.auth);
  const r = await fetch(inscricao.endpoint, {
    method: 'POST',
    headers: {
      Authorization: await vapid(inscricao.endpoint, jwkPrivado, contato),
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: String(opcoes.ttl || 86400),
      Urgency: opcoes.urgencia || 'high',
      ...(opcoes.topico ? { Topic: opcoes.topico } : {})
    },
    body: corpo
  });
  let txt = ''; try { txt = (await r.text()).slice(0, 200); } catch (e) { /* nada */ }
  return { status: r.status, txt };
}
