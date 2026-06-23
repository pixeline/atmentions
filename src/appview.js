function chunk(arr, n) { const out = []; for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n)); return out; }

export async function getProfiles({ appview, dids, fetchImpl }) {
  const doFetch = fetchImpl || globalThis.fetch;
  const unique = [...new Set(dids || [])];
  if (!unique.length) return [];
  const out = [];
  for (const group of chunk(unique, 25)) {
    const u = new URL(appview.replace(/\/$/, '') + '/xrpc/app.bsky.actor.getProfiles');
    for (const d of group) u.searchParams.append('actors', d);
    const res = await doFetch(u.toString());
    if (!res.ok) continue; // degrade: skip this chunk
    const data = await res.json();
    out.push(...(data.profiles || []).map((p) => ({ did: p.did, handle: p.handle, displayName: p.displayName || '', avatar: p.avatar || '' })));
  }
  return out;
}
