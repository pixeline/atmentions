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
  "app.bsky.feed.like": { type: "like", label: "Likes", icon: "heart", app: "Bluesky", appId: "bluesky" },
  "app.bsky.feed.repost": { type: "repost", label: "Reposts", icon: "repeat-2", app: "Bluesky", appId: "bluesky" },
  "site.standard.graph.recommend": { type: "recommend", label: "Recommends", icon: "star", app: "standard.site", appId: "standard-site" },
  "app.standard-reader.read": { type: "read", label: "Reads", icon: "book-open", app: "standard-reader", appId: "standard-reader" },
  "app.standard-reader.bookmark": { type: "bookmark", label: "Bookmarks", icon: "bookmark", app: "standard-reader", appId: "standard-reader" },
  "fyi.unravel.frontpage.post": { type: "frontpage", label: "Frontpage", icon: "newspaper", app: "Frontpage", appId: "frontpage" },
  "at.margin.note": { type: "note", label: "Notes", icon: "square-pen", app: "Margin", appId: "margin" },
  "at.margin.bookmark": { type: "margin-bookmark", label: "Bookmarks", icon: "bookmark", app: "Margin", appId: "margin" },
  "network.cosmik.card": { type: "card", label: "Saves", icon: "folder", app: "Semble", appId: "semble" },
  "blog.pckt.document": { type: "pckt", label: "pckt", icon: "file-text", app: "pckt", appId: "pckt" },
  "community.lexicon.bookmarks.bookmark": { type: "lex-bookmark", label: "Bookmarks", icon: "bookmark", app: "Bookmarks" }
};
var KNOWN_WITH_PATH = {
  "app.bsky.feed.post|.reply.parent.uri": { type: "reply", label: "Replies", icon: "message-circle", app: "Bluesky", appId: "bluesky" },
  "app.bsky.feed.post|.embed.record.uri": { type: "quote", label: "Quotes", icon: "quote", app: "Bluesky", appId: "bluesky" },
  "app.bsky.feed.post|.embed.external.uri": { type: "bsky-link", label: "Linked on Bluesky", icon: "link", app: "Bluesky", appId: "bluesky" }
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
  return { type: `${collection}${path}`, label: humanizeNsid(collection), icon: "circle", app };
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
    if (seen.has(r.did)) return false;
    seen.add(r.did);
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

// src/logos.js
function mark(bg, letter, fg = "#ffffff") {
  const c = /^[a-z0-9]$/i.test(letter) ? letter.toUpperCase() : "?";
  return `<svg class="atmo-logo" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><rect width="16" height="16" rx="4" fill="${bg}"/><text x="8" y="11.5" text-anchor="middle" font-size="9" font-weight="700" font-family="system-ui,sans-serif" fill="${fg}">${c}</text></svg>`;
}
var MARGIN = `<svg class="atmo-logo" width="16" height="16" viewBox="0 0 265 231" fill="#027bff" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M0 230 V0 H199 V65.7156 H149.5 V115.216 H182.5 L199 131.716 V230 Z"/><path d="M215 214.224 V230 H264.5 V0 H215 V16.2242 H248.5 V214.224 H215 Z"/></svg>`;
var FRONTPAGE = `<svg class="atmo-logo" width="16" height="16" viewBox="0 0 334 334" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><style>.atmo-fp-stop2{stop-color:#040818}@media (prefers-color-scheme:dark){.atmo-fp-stop2{stop-color:#fff}}</style><path d="M95 225.903V101L162 62.0968V32L69 86V241L95 225.903Z" fill="url(#atmo-fp-g0)"/><path d="M147 256.903V132L214 93.0968V63L121 117V272L147 256.903Z" fill="url(#atmo-fp-g1)"/><path d="M266 93V129L204 165V198L266 162V198L204 234V284L173 302V147L266 93Z" fill="url(#atmo-fp-g2)"/><defs><linearGradient id="atmo-fp-g0" x1="69" y1="84.5" x2="205.5" y2="167" gradientUnits="userSpaceOnUse"><stop stop-color="#2E05FF"/><stop class="atmo-fp-stop2" offset="1"/></linearGradient><linearGradient id="atmo-fp-g1" x1="69" y1="84.5" x2="205.5" y2="167" gradientUnits="userSpaceOnUse"><stop stop-color="#2E05FF"/><stop class="atmo-fp-stop2" offset="1"/></linearGradient><linearGradient id="atmo-fp-g2" x1="69" y1="84.5" x2="205.5" y2="167" gradientUnits="userSpaceOnUse"><stop stop-color="#2E05FF"/><stop class="atmo-fp-stop2" offset="1"/></linearGradient></defs></svg>`;
var BLUESKY = `<svg class="atmo-logo" width="16" height="16" viewBox="0 0 568 501" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path fill="#1185fe" d="M123.121 33.664C188.241 82.553 258.281 181.68 284 234.873c25.719-53.192 95.759-152.32 160.879-201.21C491.866-1.611 568-28.906 568 57.947c0 17.346-9.945 145.713-15.778 166.555-20.275 72.453-94.155 90.933-159.875 79.748C507.222 323.8 536.444 388.56 473.333 453.32c-119.86 122.992-172.272-30.859-185.702-70.281-2.462-7.227-3.614-10.608-3.631-7.733-.017-2.875-1.169.506-3.631 7.733-13.43 39.422-65.842 193.273-185.702 70.281-63.111-64.76-33.89-129.52 80.986-149.071-65.72 11.185-139.6-7.295-159.875-79.748C9.945 203.659 0 75.291 0 57.946 0-28.906 76.135-1.612 123.121 33.664Z"/></svg>`;
var SEMBLE = `<svg class="atmo-logo" width="16" height="16" viewBox="0 0 32 43" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M31.0164 33.1306C31.0164 38.581 25.7882 42.9994 15.8607 42.9994C5.93311 42.9994 0 37.5236 0 32.0732C0 26.6228 5.93311 23.2617 15.8607 23.2617C25.7882 23.2617 31.0164 27.6802 31.0164 33.1306Z" fill="#FF6400"/><path d="M25.7295 19.3862C25.7295 22.5007 20.7964 22.2058 15.1558 22.2058C9.51511 22.2058 4.93445 22.1482 4.93445 19.0337C4.93445 15.9192 9.71537 12.6895 15.356 12.6895C20.9967 12.6895 25.7295 16.2717 25.7295 19.3862Z" fill="#FF6400"/><path d="M25.0246 10.9256C25.0246 14.0401 20.7964 11.9829 15.1557 11.9829C9.51506 11.9829 6.34424 13.6876 6.34424 10.5731C6.34424 7.45857 9.51506 5.63867 15.1557 5.63867C20.7964 5.63867 25.0246 7.81103 25.0246 10.9256Z" fill="#FF6400"/><path d="M20.4426 3.5755C20.4426 5.8323 18.2088 4.22951 15.2288 4.22951C12.2489 4.22951 10.5737 5.8323 10.5737 3.5755C10.5737 1.31871 12.2489 0 15.2288 0C18.2088 0 20.4426 1.31871 20.4426 3.5755Z" fill="#FF6400"/></svg>`;
var STANDARD_SITE = `<svg class="atmo-logo" width="16" height="16" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path fill-rule="evenodd" clip-rule="evenodd" d="M13.7848 0.065714C13.9147 -0.0219047 14.0853 -0.0219047 14.2152 0.065714C14.3672 0.16831 14.4487 1.17325 14.6113 3.18324L14.6679 3.88175H18.5308C21.5884 3.88179 24.067 6.36063 24.067 9.41828V10.3728H22.1579V9.41828C22.1579 7.415 20.5341 5.79089 18.5308 5.79086H14.8257C14.9975 7.72432 15.1695 8.84869 15.6731 9.76909C16.2205 10.7696 17.0392 11.5976 18.0361 12.1592C19.167 12.7962 20.6187 12.9381 23.522 13.2213L25.1166 13.3766C26.9289 13.5534 27.8355 13.6419 27.9364 13.793C28.0224 13.9222 28.0211 14.0905 27.933 14.2184C27.83 14.368 26.9222 14.4423 25.107 14.5906L24.067 14.6755V18.5819C24.0669 21.6396 21.5884 24.1181 18.5308 24.1182H14.6632L14.6113 24.7719C14.4489 26.8111 14.3676 27.831 14.2155 27.9342C14.0855 28.0219 13.9148 28.0219 13.7848 27.9342C13.6327 27.8315 13.5514 26.8117 13.389 24.7719L13.3368 24.1182H9.36726C6.30968 24.1181 3.83082 21.6395 3.83079 18.5819V17.6274H5.73987V18.5819C5.73991 20.5852 7.36404 22.209 9.36726 22.209H13.1814C13.0072 20.202 12.8353 19.0446 12.3157 18.1037C11.7575 17.0929 10.9223 16.2602 9.90699 15.7024C8.75503 15.0696 7.27799 14.9489 4.32422 14.7075L2.89302 14.5906C1.07778 14.4423 0.170021 14.368 0.0669912 14.2184C-0.0210463 14.0905 -0.0224419 13.9222 0.0635733 13.793C0.164352 13.6418 1.07092 13.5534 2.88339 13.3766L3.83079 13.284V9.41828C3.83079 6.36064 6.30966 3.8818 9.36726 3.88175H13.3324L13.389 3.18324C13.5515 1.17355 13.6328 0.168553 13.7848 0.065714ZM22.1579 14.8352C20.1779 15.0125 19.0285 15.1887 18.0933 15.7024C17.0779 16.2602 16.2425 17.0929 15.6843 18.1037C15.1647 19.0446 14.9928 20.202 14.8186 22.209H18.5308C20.534 22.209 22.1578 20.5852 22.1579 18.5819V14.8352ZM9.36726 5.79086C7.36401 5.7909 5.73987 7.41501 5.73987 9.41828V13.0957C7.82821 12.8811 9.01013 12.6965 9.96385 12.1592C10.9608 11.5976 11.7795 10.7696 12.3269 9.76909C12.8305 8.84869 13.0028 7.72433 13.1746 5.79086H9.36726Z" fill="currentColor"/></svg>`;
var STANDARD_READER = `<svg class="atmo-logo" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 64 64" aria-hidden="true"><style>.atmo-sr-glyph{fill:oklch(0.575 0.155 38)}@media (prefers-color-scheme:dark){.atmo-sr-glyph{fill:oklch(0.72 0.14 42)}}</style><text class="atmo-sr-glyph" x="50%" y="50%" dy="0.02em" text-anchor="middle" dominant-baseline="central" font-family="'Newsreader', Georgia, 'Times New Roman', serif" font-size="56" font-weight="500">S</text></svg>`;
var APP_LOGOS = {
  bluesky: BLUESKY,
  margin: MARGIN,
  semble: SEMBLE,
  frontpage: FRONTPAGE,
  "standard-site": STANDARD_SITE,
  "standard-reader": STANDARD_READER,
  pckt: mark("#e0563f", "P")
};
function logoFor(appId, appName) {
  if (!appId) return "";
  if (APP_LOGOS[appId]) return APP_LOGOS[appId];
  const letter = String(appName || appId).trim().charAt(0) || "?";
  return mark("#9ca3af", letter);
}

// src/icons.js
var A = 'class="atmo-icon" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
var ICONS = {
  heart: `<svg ${A}><path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5"/></svg>`,
  "repeat-2": `<svg ${A}><path d="m2 9 3-3 3 3"/><path d="M13 18H7a2 2 0 0 1-2-2V6"/><path d="m22 15-3 3-3-3"/><path d="M11 6h6a2 2 0 0 1 2 2v10"/></svg>`,
  star: `<svg ${A}><path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/></svg>`,
  "book-open": `<svg ${A}><path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/></svg>`,
  bookmark: `<svg ${A}><path d="M17 3a2 2 0 0 1 2 2v15a1 1 0 0 1-1.496.868l-4.512-2.578a2 2 0 0 0-1.984 0l-4.512 2.578A1 1 0 0 1 5 20V5a2 2 0 0 1 2-2z"/></svg>`,
  newspaper: `<svg ${A}><path d="M15 18h-5"/><path d="M18 14h-8"/><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-4 0v-9a2 2 0 0 1 2-2h2"/><rect width="8" height="4" x="10" y="6" rx="1"/></svg>`,
  "square-pen": `<svg ${A}><path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"/></svg>`,
  folder: `<svg ${A}><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>`,
  "message-circle": `<svg ${A}><path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"/></svg>`,
  quote: `<svg ${A}><path d="M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/><path d="M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/></svg>`,
  link: `<svg ${A}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
  "file-text": `<svg ${A}><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/><path d="M14 2v5a1 1 0 0 0 1 1h5"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>`,
  circle: `<svg ${A}><circle cx="12" cy="12" r="10"/></svg>`,
  sparkles: `<svg ${A}><path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"/><path d="M20 2v4"/><path d="M22 4h-4"/><circle cx="4" cy="20" r="2"/></svg>`
};
function iconFor(name) {
  return ICONS[name] || ICONS.circle;
}

// src/render.js
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}
function reactorHref(r) {
  const m = String(r.recordUri || "").match(/^at:\/\/([^/]+)\/([^/]+)\/(.+)$/);
  if (m) {
    const [, did, collection, rkey] = m;
    if (collection === "app.bsky.feed.post") {
      const who = r.handle && r.handle.includes(".") ? r.handle : did;
      return `https://bsky.app/profile/${who}/post/${rkey}`;
    }
    return `https://pdsls.dev/at://${did}/${collection}/${rkey}`;
  }
  return r.handle && r.handle.includes(".") ? `https://bsky.app/profile/${r.handle}` : "#";
}
function renderReactorList(reactors) {
  if (!reactors || !reactors.length) return '<p class="muted">No one yet.</p>';
  return '<ul class="list">' + reactors.map((r) => {
    const name = esc(r.displayName || r.handle || r.did);
    const av = r.avatar ? `<img src="${esc(r.avatar)}" alt="" loading="lazy">` : "";
    return `<li><a href="${esc(reactorHref(r))}" target="_blank" rel="noopener">${av}<span>${name}</span></a></li>`;
  }).join("") + "</ul>";
}
var DEFAULT_EMPTY = "No ripples in the ATmosphere yet.";
function renderHTML(reactions, { variant = "default", emptyText = DEFAULT_EMPTY } = {}) {
  if (!reactions || !reactions.total) return `<div class="wrap"><p class="atmo-empty">${esc(emptyText)}</p></div>`;
  const chip = (g) => `<button type="button" class="chip" data-atmo-expand="${esc(g.type)}" aria-expanded="false">${iconFor(g.icon)}<span class="n">${g.count}</span><span class="lbl">${esc(g.label)}</span></button><div class="panel" data-atmo-panel="${esc(g.type)}" hidden></div>`;
  if (variant === "minimal") {
    return `<div class="wrap"><button type="button" class="toggle" data-atmo-toggle aria-expanded="false">${iconFor("sparkles")} ${reactions.total} ATmosphere reactions</button><div class="panel" data-atmo-allpanel hidden></div></div>`;
  }
  if (variant === "full") {
    const row = (g) => {
      const logo = g.appId ? `<span class="atmo-logowrap" title="${esc(g.app)}">${logoFor(g.appId, g.app)}</span>` : "";
      return `<button type="button" class="atmo-row" data-atmo-expand="${esc(g.type)}" aria-expanded="false">${logo}${iconFor(g.icon)}<span class="n">${g.count}</span><span class="lbl">${esc(g.label)}</span></button><div class="panel" data-atmo-panel="${esc(g.type)}" hidden></div>`;
    };
    return `<div class="wrap"><div class="atmo-rows">${reactions.groups.map(row).join("")}</div></div>`;
  }
  return `<div class="wrap"><div class="chips">${reactions.groups.map(chip).join("")}</div></div>`;
}

// src/widget.css.js
var STYLE = `
:host { --atmo-fg:#3d3c3c; --atmo-muted:#777; --atmo-accent:#f7b4ed; --atmo-bg:transparent; --atmo-radius:.5rem; display:block; }
:host([appearance="dark"]) { --atmo-fg:#eee; --atmo-muted:#aaa; --atmo-bg:transparent; }
.wrap { font: 14px/1.4 system-ui, sans-serif; color: var(--atmo-fg); }
.chips { display:flex; flex-wrap:wrap; gap:.5rem; align-items:center; }
.chip { display:inline-flex; gap:.35rem; align-items:center; border:1px solid color-mix(in srgb, var(--atmo-fg) 18%, transparent); background:var(--atmo-bg); border-radius:999px; padding:.25rem .6rem; cursor:pointer; font:inherit; color:inherit; }
.chip:hover, .chip:focus-visible { border-color:var(--atmo-accent); outline:none; }
.chip .n { font-weight:700; }
.chip .lbl { color:var(--atmo-muted); }
.toggle { background:none; border:1px solid color-mix(in srgb, var(--atmo-fg) 18%, transparent); border-radius:999px; padding:.25rem .7rem; cursor:pointer; font:inherit; color:inherit; }
.list { list-style:none; margin:.6rem 0 0; padding:0; display:flex; flex-wrap:wrap; gap:.5rem; }
.list a { display:inline-flex; gap:.35rem; align-items:center; text-decoration:none; color:inherit; }
.list img { width:22px; height:22px; border-radius:50%; }
.panel[hidden] { display:none; }
.atmo-empty { margin:0; font-size:13px; font-style:italic; color:var(--atmo-muted); }
.muted { margin:0; font-size:13px; font-style:italic; color:var(--atmo-muted); }
@media (prefers-reduced-motion: no-preference) { .panel { transition: opacity .15s; } }
.atmo-rows { display:flex; flex-direction:column; gap:.4rem; align-items:flex-start; }
.atmo-row { display:inline-flex; gap:.4rem; align-items:center; border:1px solid color-mix(in srgb, var(--atmo-fg) 18%, transparent); background:var(--atmo-bg); border-radius:999px; padding:.25rem .7rem; cursor:pointer; font:inherit; color:inherit; }
.atmo-row:hover, .atmo-row:focus-visible { border-color:var(--atmo-accent); outline:none; }
.atmo-logowrap { display:inline-flex; }
.atmo-logo { display:block; }
.atmo-row .n { font-weight:700; }
.atmo-row .lbl { color:var(--atmo-muted); }
.atmo-icon { width:15px; height:15px; flex:none; vertical-align:text-bottom; }
`;

// src/widget.js
var hasDOM = typeof window !== "undefined" && typeof window.HTMLElement !== "undefined";
function readSubjects(el) {
  return {
    url: el.getAttribute("data-url") || el.getAttribute("url") || (typeof location !== "undefined" ? location.href : ""),
    aturi: el.getAttribute("data-aturi") || el.getAttribute("aturi") || void 0,
    bsky: el.getAttribute("data-bsky") || el.getAttribute("bsky") || void 0
  };
}
async function mount(el, opts = {}) {
  const root = el.shadowRoot || el.attachShadow({ mode: "open" });
  const variant = el.getAttribute("variant") || "default";
  const emptyText = el.getAttribute("empty-text") || void 0;
  const hideEmpty = el.hasAttribute("hide-empty");
  root.innerHTML = `<style>${STYLE}</style><div data-atmo-host></div>`;
  const host = root.querySelector("[data-atmo-host]");
  const subjects = readSubjects(el);
  let reactions;
  try {
    reactions = await fetchReactions(subjects, opts);
  } catch {
    return;
  }
  host.innerHTML = hideEmpty && (!reactions || !reactions.total) ? "" : renderHTML(reactions, { variant, emptyText });
  const expand = async (type, panel, btn) => {
    if (panel.dataset.loaded) {
      panel.hidden = !panel.hidden;
      btn && btn.setAttribute("aria-expanded", String(!panel.hidden));
      return;
    }
    const group = reactions.groups.find((g) => g.type === type);
    panel.innerHTML = "Loading\u2026";
    const reactors = group ? await resolveReactors(group, subjects, opts).catch(() => []) : [];
    panel.innerHTML = renderReactorList(reactors);
    panel.dataset.loaded = "1";
    panel.hidden = false;
    btn && btn.setAttribute("aria-expanded", "true");
  };
  host.addEventListener("click", async (e) => {
    const chip = e.target.closest("[data-atmo-expand]");
    if (chip) {
      const type = chip.getAttribute("data-atmo-expand");
      return expand(type, host.querySelector(`[data-atmo-panel="${CSS.escape(type)}"]`), chip);
    }
    const toggle = e.target.closest("[data-atmo-toggle]");
    if (toggle) {
      const panel = host.querySelector("[data-atmo-allpanel]");
      if (!panel.dataset.loaded) {
        panel.innerHTML = reactions.groups.map((g) => `<strong>${iconFor(g.icon)} ${g.count}</strong> ${esc(g.label)}`).join(" \xB7 ");
        panel.dataset.loaded = "1";
      }
      panel.hidden = !panel.hidden;
      toggle.setAttribute("aria-expanded", String(!panel.hidden));
    }
  });
}
function register() {
  if (!hasDOM || customElements.get("atmentions-reactions")) return;
  class ATmentionsReactions extends window.HTMLElement {
    connectedCallback() {
      mount(this).catch(() => {
      });
    }
  }
  customElements.define("atmentions-reactions", ATmentionsReactions);
}
if (hasDOM) {
  register();
  const init = () => document.querySelectorAll("[data-atmentions]").forEach((el) => mount(el).catch(() => {
  }));
  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
}
export {
  mount,
  register
};
