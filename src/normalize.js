import { describe } from './taxonomy.js';

export function normalize(linksAllResults) {
  const byType = new Map();
  for (const result of linksAllResults || []) {
    const links = (result && result.links) || {};
    const subjectKind = result && result.kind;
    for (const [collection, paths] of Object.entries(links)) {
      for (const [path, stats] of Object.entries(paths || {})) {
        // Skip Bluesky's standard.site enrichment ref — it's the same post already
        // counted via .embed.external.uri (the page URL), so it would double-count.
        if (path.includes('associatedRefs')) continue;
        const meta = describe(collection, path);
        const count = Number(stats && stats.records) || 0;
        const dids = Number(stats && stats.distinct_dids) || 0;
        if (!count) continue;
        const existing = byType.get(meta.type);
        if (existing) { existing.count += count; existing.distinctDids += dids; }
        else byType.set(meta.type, { ...meta, collection, path, subjectKind, count, distinctDids: dids });
      }
    }
  }
  const groups = [...byType.values()].sort((a, b) => b.count - a.count);
  return { total: groups.reduce((s, g) => s + g.count, 0), groups };
}
