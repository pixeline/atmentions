import { test } from 'node:test';
import assert from 'node:assert';
import { normalize } from '../src/normalize.js';

test('normalize flattens, maps, merges same type, sorts by count', () => {
  const a = { links: { 'app.bsky.feed.like': { '.subject.uri': { records: 5, distinct_dids: 5 } },
                       'app.bsky.feed.repost': { '.subject.uri': { records: 2, distinct_dids: 2 } } } };
  const b = { links: { 'site.standard.graph.recommend': { '.document': { records: 1, distinct_dids: 1 } },
                       'app.bsky.feed.repost': { '.subject.uri': { records: 1, distinct_dids: 1 } } } };
  const r = normalize([a, b]);
  assert.strictEqual(r.total, 9);
  assert.strictEqual(r.groups[0].type, 'like');      // 5, highest
  const repost = r.groups.find(g => g.type === 'repost');
  assert.strictEqual(repost.count, 3);               // merged 2 + 1
});

test('normalize tolerates empty/missing links', () => {
  assert.deepStrictEqual(normalize([{ links: {} }, {}]), { total: 0, groups: [] });
});
