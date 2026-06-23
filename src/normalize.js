import { describe } from './taxonomy.js';

export function normalize(linksAllResults) {
  const byType = new Map();
  for (const result of linksAllResults || []) {
    const links = (result && result.links) || {};
    for (const [collection, paths] of Object.entries(links)) {
      for (const [path, stats] of Object.entries(paths || {})) {
        const meta = describe(collection, path);
        const count = Number(stats && stats.records) || 0;
        const dids = Number(stats && stats.distinct_dids) || 0;
        if (!count) continue;
        const existing = byType.get(meta.type);
        if (existing) { existing.count += count; existing.distinctDids += dids; }
        else byType.set(meta.type, { ...meta, collection, path, count, distinctDids: dids });
      }
    }
  }
  const groups = [...byType.values()].sort((a, b) => b.count - a.count);
  return { total: groups.reduce((s, g) => s + g.count, 0), groups };
}
