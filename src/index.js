import { linksAll, links } from './constellation.js';
import { normalize } from './normalize.js';
import { getProfiles } from './appview.js';

const DEFAULTS = { indexEndpoint: 'https://constellation.microcosm.blue', appview: 'https://public.api.bsky.app', userAgent: 'atmentions (+https://github.com/pixeline/atmentions)' };

// Apps key reactions by the page URL inconsistently (trailing slash or not);
// the backlink index matches the literal string, so query BOTH variants.
function urlVariants(url) {
  if (!url) return [];
  const u = url.split('#')[0];
  const toggled = u.endsWith('/') ? u.slice(0, -1) : u + '/';
  return [u, toggled];
}

// Each subject is tagged with its kind so groups can later resolve reactors
// against the right target (no fragile guessing from collection/path).
function subjectsOf({ url, aturi, bsky }) {
  const s = [];
  if (aturi) s.push({ target: aturi, kind: 'aturi' });
  if (bsky) s.push({ target: bsky, kind: 'bsky' });
  for (const v of urlVariants(url)) s.push({ target: v, kind: 'url' });
  return s;
}

export async function fetchReactions(subjects, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const errors = [];
  const results = await Promise.all(subjectsOf(subjects).map(({ target, kind }) =>
    linksAll({ endpoint: o.indexEndpoint, target, fetchImpl: o.fetchImpl, userAgent: o.userAgent })
      .then((r) => ({ ...r, kind }))
      .catch((e) => { errors.push({ target, message: e.message }); return { links: {}, kind }; })
  ));
  const { total, groups } = normalize(results);
  return { total, groups, errors };
}

// Targets to resolve a group's reactors, chosen by which subject produced it.
function targetsFor(group, subjects) {
  if (group.subjectKind === 'aturi') return [subjects.aturi].filter(Boolean);
  if (group.subjectKind === 'bsky') return [subjects.bsky].filter(Boolean);
  if (group.subjectKind === 'url') return urlVariants(subjects.url);
  return [subjects.aturi, subjects.bsky, ...urlVariants(subjects.url)].filter(Boolean);
}

export async function resolveReactors(group, subjects, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  let rows = [];
  for (const target of targetsFor(group, subjects)) {
    try {
      const res = await links({ endpoint: o.indexEndpoint, target, collection: group.collection, path: group.path, limit: 100, fetchImpl: o.fetchImpl, userAgent: o.userAgent });
      rows.push(...(res.linking_records || []));
    } catch { /* skip this target, try the rest */ }
  }
  const seen = new Set();
  rows = rows.filter((r) => { if (seen.has(r.did)) return false; seen.add(r.did); return true; });
  let profiles = [];
  try { profiles = await getProfiles({ appview: o.appview, dids: rows.map((r) => r.did), fetchImpl: o.fetchImpl }); }
  catch { profiles = []; }
  const byDid = new Map(profiles.map((p) => [p.did, p]));
  return rows.map((r) => ({ did: r.did, recordUri: `at://${r.did}/${r.collection}/${r.rkey}`, ...(byDid.get(r.did) || { handle: r.did, displayName: '', avatar: '' }) }));
}

export { DEFAULTS };
