// Avisos no celular da Geo: lê a fila de avisos no banco e manda pra cada aparelho inscrito.
// Quem chama esta função é o próprio banco (pg_net), sempre que entra um aviso na fila.
// Chamar de fora não faz mal: sem aviso na fila, ela não faz nada.
import { mandar } from './webpush.js';

const URL_SB = Deno.env.get('SUPABASE_URL') ?? '';
function chaveServico(): string {
  const k = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (k) return k;
  try { const s = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}'); return s.default ?? Object.values(s)[0] ?? ''; } catch { return ''; }
}
async function rpc(nome: string, corpo: unknown) {
  const k = chaveServico();
  const r = await fetch(URL_SB + '/rest/v1/rpc/' + nome, {
    method: 'POST',
    headers: { apikey: k, Authorization: 'Bearer ' + k, 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo ?? {})
  });
  const txt = await r.text();
  if (!r.ok) throw new Error(nome + ' ' + r.status + ' ' + txt.slice(0, 200));
  return txt ? JSON.parse(txt) : null;
}

Deno.serve(async () => {
  try {
    const lote = await rpc('pegar_avisos', {});
    if (!lote || !Array.isArray(lote.avisos) || !lote.avisos.length) return Response.json({ avisos: 0 });
    const jwk = typeof lote.vapid === 'string' ? JSON.parse(lote.vapid) : lote.vapid;
    const resultados: unknown[] = [];
    for (const a of lote.avisos) {
      for (const i of (lote.inscricoes ?? [])) {
        let st = 0, txt = '';
        try { const r = await mandar(i, { titulo: a.titulo, corpo: a.corpo, url: a.url, tag: a.tag }, jwk, lote.contato || 'mailto:rifa@example.com', {}); /* sem Topic: a Apple recusa (BadWebPushTopic) */ st = r.status; txt = r.txt; }
        catch (e) { st = -1; txt = String(e).slice(0, 200); }
        resultados.push({ aviso: a.id, inscricao: i.id, status: st, txt });
      }
    }
    await rpc('registrar_avisos', { p_resultados: resultados });
    return Response.json({ avisos: lote.avisos.length, resultados });
  } catch (e) {
    return Response.json({ erro: String(e).slice(0, 300) }, { status: 500 });
  }
});
