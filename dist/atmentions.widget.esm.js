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
  const chip = (g) => `<button type="button" class="chip" data-atmo-expand="${esc(g.type)}" aria-expanded="false"><span aria-hidden="true">${esc(g.icon)}</span><span class="n">${g.count}</span><span class="lbl">${esc(g.label)}</span></button><div class="panel" data-atmo-panel="${esc(g.type)}" hidden></div>`;
  if (variant === "minimal") {
    return `<div class="wrap"><button type="button" class="toggle" data-atmo-toggle aria-expanded="false">\u25C7 ${reactions.total} ATmosphere reactions</button><div class="panel" data-atmo-allpanel hidden></div></div>`;
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
        panel.innerHTML = reactions.groups.map((g) => `<strong>${esc(g.icon)} ${g.count}</strong> ${esc(g.label)}`).join(" \xB7 ");
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
