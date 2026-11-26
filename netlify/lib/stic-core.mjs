// STIC live vote — request logic, independent of the storage backend (tested with an in-memory store).
// Contract (same as the laptop server vote-server.mjs):
//   GET  /stic/api/state          → { stage, tally, votes: [{t, c}], reveal? }   (?lite=1 → { stage, reveal? })
//   POST /stic/api/vote  {c, token}  → one live vote per phone token; a phone may change its vote; 409 unless stage = vote
//   POST /stic/api/stage {key, stage?, reset?, reveal?}  → presenter only (key checked against its SHA-256)
// Stores no personal data: no IP, no user agent. Each vote is its own key (v/<token>) so concurrent votes never race.
// The reveal (answer + sources) is NOT in this public repo: the presenter seeds it into the store with the key,
// and it is returned only while stage = sources.

import { createHash } from 'node:crypto';

export const PRESENTER_KEY_SHA256 = '5d97dde9e7f7fe92d69c8ac2390b6044e25b23d8ace0e2da8ab0e6d1f83c2554';
const STAGES = ['vote', 'closed', 'sources'];
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store'
};
const json = (code, body) => new Response(JSON.stringify(body), { status: code, headers: { 'Content-Type': 'application/json', ...CORS } });
const sha = s => createHash('sha256').update(String(s)).digest('hex');

let cache = null;                                  // warm-instance cache of the vote list (presenter polls every second)
const CACHE_MS = 800;

async function getStage(store) {
  const s = await store.get('stage', { type: 'json' });
  return s && STAGES.includes(s.stage) ? s.stage : 'vote';
}
async function listVotes(store) {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.votes;
  const { blobs } = await store.list({ prefix: 'v/' });
  const votes = (await Promise.all(blobs.map(b => store.get(b.key, { type: 'json' }))))
    .filter(v => v && ['A', 'B', 'C'].includes(v.c) && typeof v.t === 'number')
    .map(v => ({ t: v.t, c: v.c }))
    .sort((a, b) => a.t - b.t);
  cache = { at: Date.now(), votes };
  return votes;
}
async function readBody(req) {
  try { const t = await req.text(); return t.length > 8000 ? {} : JSON.parse(t || '{}'); } catch { return {}; }
}

export async function handle(req, store) {
  const url = new URL(req.url);
  const route = url.pathname.replace(/\/+$/, '').split('/').pop();
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  if (req.method === 'GET' && route === 'state') {
    const stage = await getStage(store);
    const out = { stage };
    if (stage === 'sources') out.reveal = (await store.get('reveal', { type: 'json' })) || null;
    if (url.searchParams.get('lite')) return json(200, out);
    const votes = await listVotes(store);
    const tally = { A: 0, B: 0, C: 0 };
    for (const v of votes) tally[v.c]++;
    return json(200, { stage, tally, votes, ...(out.reveal !== undefined ? { reveal: out.reveal } : {}) });
  }

  if (req.method === 'POST' && route === 'vote') {
    if ((await getStage(store)) !== 'vote') return json(409, { error: 'closed' });
    const { c, token } = await readBody(req);
    if (!['A', 'B', 'C'].includes(c) || typeof token !== 'string' || !/^[a-z0-9]{6,64}$/i.test(token)) return json(400, { error: 'bad' });
    await store.setJSON('v/' + token, { t: Date.now(), c });   // same token → same key: a changed vote overwrites
    cache = null;
    return json(200, { ok: true });
  }

  if (req.method === 'POST' && route === 'stage') {
    const { key, stage, reset, reveal } = await readBody(req);
    if (typeof key !== 'string' || sha(key) !== PRESENTER_KEY_SHA256) return json(403, { error: 'forbidden' });
    let archived = null;
    if (reset === 'YES') {
      const { blobs } = await store.list({ prefix: 'v/' });
      const votes = (await Promise.all(blobs.map(b => store.get(b.key, { type: 'json' })))).filter(Boolean);
      if (votes.length) {                                        // never destroy silently: keep a dated copy
        archived = 'archive/' + new Date().toISOString().replace(/[:.]/g, '-');
        await store.setJSON(archived, { stage: await getStage(store), votes: votes.map(v => ({ t: v.t, c: v.c })) });
      }
      await Promise.all(blobs.map(b => store.delete(b.key)));
      await store.setJSON('stage', { stage: 'vote' });
      cache = null;
    }
    if (reveal && typeof reveal === 'object') await store.setJSON('reveal', reveal);
    if (STAGES.includes(stage)) await store.setJSON('stage', { stage });
    return json(200, { ok: true, stage: await getStage(store), ...(archived ? { archived } : {}), revealSet: !!(await store.get('reveal', { type: 'json' })) });
  }

  return json(404, { error: 'not found' });
}
