// src/constellation.js
function buildUrl(endpoint, route, params) {
  const u = new URL(endpoint.replace(/\/$/, "") + route);
  for (const [k, v] of Object.entries(params)) if (v != null) u.searchParams.set(k, String(v));
  return u.toString();
}
async function getJson(url, fetchImpl, userAgent) {
  const doFetch = fetchImpl || globalThis.fetch;
  const headers = userAgent ? { "User-Agent": userAgent } : void 0;
  const res = await doFetch(url, headers ? { headers } : void 0);
  if (!res.ok) throw new Error(`constellation ${url} -> ${res.status}`);
  return res.json();
}
async function linksAll({ endpoint, target, fetchImpl, userAgent }) {
  return getJson(buildUrl(endpoint, "/links/all", { target }), fetchImpl, userAgent);
}
async function links({ endpoint, target, collection, path, limit = 100, cursor, fetchImpl, userAgent }) {
  return getJson(buildUrl(endpoint, "/links", { target, collection, path, limit, cursor }), fetchImpl, userAgent);
}

// src/taxonomy.js
var KNOWN = {
  "app.bsky.feed.like": { type: "like", label: "Likes", icon: "\u2665", app: "Bluesky" },
  "app.bsky.feed.repost": { type: "repost", label: "Reposts", icon: "\u{1F501}", app: "Bluesky" },
  "site.standard.graph.recommend": { type: "recommend", label: "Recommends", icon: "\u2B50", app: "standard.site" },
  "app.standard-reader.read": { type: "read", label: "Reads", icon: "\u{1F4D6}", app: "standard-reader" },
  "app.standard-reader.bookmark": { type: "bookmark", label: "Bookmarks", icon: "\u{1F516}", app: "standard-reader" },
  "fyi.unravel.frontpage.post": { type: "frontpage", label: "Frontpage", icon: "\u{1F4F0}", app: "Frontpage" },
  "at.margin.note": { type: "note", label: "Notes", icon: "\u270D\uFE0F", app: "Margin" },
  "at.margin.bookmark": { type: "margin-bookmark", label: "Bookmarks", icon: "\u{1F516}", app: "Margin" },
  "network.cosmik.card": { type: "card", label: "Saves", icon: "\u{1F5C2}\uFE0F", app: "Semble" },
  "community.lexicon.bookmarks.bookmark": { type: "lex-bookmark", label: "Bookmarks", icon: "\u{1F516}", app: "Bookmarks" }
};
var KNOWN_WITH_PATH = {
  "app.bsky.feed.post|.reply.parent.uri": { type: "reply", label: "Replies", icon: "\u{1F4AC}", app: "Bluesky" },
  "app.bsky.feed.post|.embed.record.uri": { type: "quote", label: "Quotes", icon: "\u275D", app: "Bluesky" },
  "app.bsky.feed.post|.embed.external.uri": { type: "bsky-link", label: "Linked on Bluesky", icon: "\u{1F517}", app: "Bluesky" }
};
function humanizeNsid(collection) {
  const last = String(collection).split(".").pop() || collection;
  return last.charAt(0).toUpperCase() + last.slice(1);
}
function describe(collection, path) {
  const withPath = KNOWN_WITH_PATH[`${collection}|${path}`];
  if (withPath) return withPath;
  if (KNOWN[collection]) return KNOWN[collection];
  const parts = String(collection).split(".");
  const app = parts.slice(0, -1).join(".") || collection;
  return { type: `${collection}${path}`, label: humanizeNsid(collection), icon: "\u25C7", app };
}

// src/normalize.js
function normalize(linksAllResults) {
  const byType = /* @__PURE__ */ new Map();
  for (const result of linksAllResults || []) {
    const links2 = result && result.links || {};
    const subjectKind = result && result.kind;
    for (const [collection, paths] of Object.entries(links2)) {
      for (const [path, stats] of Object.entries(paths || {})) {
        if (path.includes("associatedRefs")) continue;
        const meta = describe(collection, path);
        const count = Number(stats && stats.records) || 0;
        const dids = Number(stats && stats.distinct_dids) || 0;
        if (!count) continue;
        const existing = byType.get(meta.type);
        if (existing) {
          existing.count += count;
          existing.distinctDids += dids;
        } else byType.set(meta.type, { ...meta, collection, path, subjectKind, count, distinctDids: dids });
      }
    }
  }
  const groups = [...byType.values()].sort((a, b) => b.count - a.count);
  return { total: groups.reduce((s, g) => s + g.count, 0), groups };
}

// src/appview.js
function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}
async function getProfiles({ appview, dids, fetchImpl }) {
  const doFetch = fetchImpl || globalThis.fetch;
  const unique = [...new Set(dids || [])];
  if (!unique.length) return [];
  const out = [];
  for (const group of chunk(unique, 25)) {
    const u = new URL(appview.replace(/\/$/, "") + "/xrpc/app.bsky.actor.getProfiles");
    for (const d of group) u.searchParams.append("actors", d);
    const res = await doFetch(u.toString());
    if (!res.ok) continue;
    const data = await res.json();
    out.push(...(data.profiles || []).map((p) => ({ did: p.did, handle: p.handle, displayName: p.displayName || "", avatar: p.avatar || "" })));
  }
  return out;
}

// src/index.js
var DEFAULTS = { indexEndpoint: "https://constellation.microcosm.blue", appview: "https://public.api.bsky.app", userAgent: "atmentions (+https://github.com/pixeline/atmentions)" };
function urlVariants(url) {
  if (!url) return [];
  const u = url.split("#")[0];
  const toggled = u.endsWith("/") ? u.slice(0, -1) : u + "/";
  return [u, toggled];
}
function subjectsOf({ url, aturi, bsky }) {
  const s = [];
  if (aturi) s.push({ target: aturi, kind: "aturi" });
  if (bsky) s.push({ target: bsky, kind: "bsky" });
  for (const v of urlVariants(url)) s.push({ target: v, kind: "url" });
  return s;
}
async function fetchReactions(subjects, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const errors = [];
  const results = await Promise.all(subjectsOf(subjects).map(
    ({ target, kind }) => linksAll({ endpoint: o.indexEndpoint, target, fetchImpl: o.fetchImpl, userAgent: o.userAgent }).then((r) => ({ ...r, kind })).catch((e) => {
      errors.push({ target, message: e.message });
      return { links: {}, kind };
    })
  ));
  const { total, groups } = normalize(results);
  return { total, groups, errors };
}
function targetsFor(group, subjects) {
  if (group.subjectKind === "aturi") return [subjects.aturi].filter(Boolean);
  if (group.subjectKind === "bsky") return [subjects.bsky].filter(Boolean);
  if (group.subjectKind === "url") return urlVariants(subjects.url);
  return [subjects.aturi, subjects.bsky, ...urlVariants(subjects.url)].filter(Boolean);
}
async function resolveReactors(group, subjects, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  let rows = [];
  for (const target of targetsFor(group, subjects)) {
    try {
      const res = await links({ endpoint: o.indexEndpoint, target, collection: group.collection, path: group.path, limit: 100, fetchImpl: o.fetchImpl, userAgent: o.userAgent });
      rows.push(...res.linking_records || []);
    } catch {
    }
  }
  const seen = /* @__PURE__ */ new Set();
  rows = rows.filter((r) => {
    const k = `${r.did}/${r.collection}/${r.rkey}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  let profiles = [];
  try {
    profiles = await getProfiles({ appview: o.appview, dids: rows.map((r) => r.did), fetchImpl: o.fetchImpl });
  } catch {
    profiles = [];
  }
  const byDid = new Map(profiles.map((p) => [p.did, p]));
  return rows.map((r) => ({ did: r.did, recordUri: `at://${r.did}/${r.collection}/${r.rkey}`, ...byDid.get(r.did) || { handle: r.did, displayName: "", avatar: "" } }));
}
export {
  DEFAULTS,
  fetchReactions,
  resolveReactors
};
