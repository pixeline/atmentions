function buildUrl(endpoint, route, params) {
  const u = new URL(endpoint.replace(/\/$/, '') + route);
  for (const [k, v] of Object.entries(params)) if (v != null) u.searchParams.set(k, String(v));
  return u.toString();
}

async function getJson(url, fetchImpl, userAgent) {
  const doFetch = fetchImpl || globalThis.fetch;
  const headers = userAgent ? { 'User-Agent': userAgent } : undefined;
  const res = await doFetch(url, headers ? { headers } : undefined);
  if (!res.ok) throw new Error(`constellation ${url} -> ${res.status}`);
  return res.json();
}

export async function linksAll({ endpoint, target, fetchImpl, userAgent }) {
  return getJson(buildUrl(endpoint, '/links/all', { target }), fetchImpl, userAgent);
}

export async function links({ endpoint, target, collection, path, limit = 100, cursor, fetchImpl, userAgent }) {
  return getJson(buildUrl(endpoint, '/links', { target, collection, path, limit, cursor }), fetchImpl, userAgent);
}
