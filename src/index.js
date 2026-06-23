import { linksAll, links } from './constellation.js';
import { normalize } from './normalize.js';
import { getProfiles } from './appview.js';

const DEFAULTS = { indexEndpoint: 'https://constellation.microcosm.blue', appview: 'https://public.api.bsky.app', userAgent: 'atmentions (+https://github.com/pixeline/atmentions)' };

function subjectsOf({ url, aturi, bsky }) {
  const s = [];
  if (aturi) s.push(aturi);
  if (bsky) s.push(bsky);
  if (url) s.push(url.split('#')[0]);
  return s;
}

export async function fetchReactions(subjects, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const targets = subjectsOf(subjects);
  const errors = [];
  const results = await Promise.all(targets.map((target) =>
    linksAll({ endpoint: o.indexEndpoint, target, fetchImpl: o.fetchImpl, userAgent: o.userAgent })
      .catch((e) => { errors.push({ target, message: e.message }); return { links: {} }; })
  ));
  const { total, groups } = normalize(results);
  return { total, groups, errors };
}

export async function resolveReactors(group, subjects, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  // pick the subject target whose kind matches the group (at-uri groups vs url groups)
  const isAtUri = group.path === '.document' || group.path === '.subject' || group.collection.startsWith('app.bsky') || group.collection.startsWith('site.standard') || group.collection.startsWith('app.standard-reader');
  const target = isAtUri ? (subjects.aturi || subjects.bsky || subjects.url) : (subjects.url ? subjects.url.split('#')[0] : subjects.aturi);
  let rows = [];
  try {
    const res = await links({ endpoint: o.indexEndpoint, target, collection: group.collection, path: group.path, limit: 100, fetchImpl: o.fetchImpl, userAgent: o.userAgent });
    rows = res.linking_records || [];
  } catch { return []; }
  const profiles = await getProfiles({ appview: o.appview, dids: rows.map((r) => r.did), fetchImpl: o.fetchImpl });
  const byDid = new Map(profiles.map((p) => [p.did, p]));
  return rows.map((r) => ({ did: r.did, recordUri: `at://${r.did}/${r.collection}/${r.rkey}`, ...(byDid.get(r.did) || { handle: r.did, displayName: '', avatar: '' }) }));
}

export { DEFAULTS };
