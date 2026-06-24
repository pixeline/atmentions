import { describe } from "./taxonomy.js";

export function normalize(linksAllResults) {
  const byType = new Map();
  for (const result of linksAllResults || []) {
    const links = (result && result.links) || {};
    const subjectKind = result && result.kind;
    for (const [collection, paths] of Object.entries(links)) {
      for (const [path, stats] of Object.entries(paths || {})) {
        // Skip Bluesky's standard.site enrichment ref — it's the same post already
        // counted via .embed.external.uri (the page URL), so it would double-count.
        if (path.includes("associatedRefs")) continue;
        const meta = describe(collection, path);
        const records = Number(stats && stats.records) || 0;
        const dids = Number(stats && stats.distinct_dids) || 0;
        if (!records) continue;
        // Count distinct people, not records. A type can span several paths
        // (e.g. a bsky link via embed card + richtext facet); keep every source
        // so reactors can later be resolved across all of them.
        const source = { collection, path };
        const existing = byType.get(meta.type);
        if (existing) {
          existing.count += dids;
          existing.sources.push(source);
        } else {
          byType.set(meta.type, {
            ...meta,
            collection,
            path,
            subjectKind,
            count: dids,
            sources: [source],
          });
        }
      }
    }
  }
  const groups = [...byType.values()].sort((a, b) => b.count - a.count);
  return { total: groups.reduce((s, g) => s + g.count, 0), groups };
}
