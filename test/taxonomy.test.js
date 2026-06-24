import { test } from 'node:test';
import assert from 'node:assert';
import { describe as describeBucket, humanizeNsid } from '../src/taxonomy.js';

test('known buckets map to labels/icons', () => {
  assert.deepStrictEqual(describeBucket('app.bsky.feed.like', '.subject.uri'),
    { type: 'like', label: 'Likes', icon: 'heart', app: 'Bluesky', appId: 'bluesky', verb: 'liked' });
  assert.strictEqual(describeBucket('site.standard.graph.recommend', '.document').label, 'Recommends');
  assert.strictEqual(describeBucket('fyi.unravel.frontpage.post', '.url').app, 'Frontpage');
});

test('unknown bucket falls back to humanized nsid', () => {
  const d = describeBucket('com.example.foo.bar', '.x');
  assert.strictEqual(d.app, 'com.example.foo');
  assert.strictEqual(d.label, 'Bar');
  assert.strictEqual(d.icon, 'circle');
});

test('humanizeNsid uses last segment, title-cased', () => {
  assert.strictEqual(humanizeNsid('app.bsky.feed.repost'), 'Repost');
});

test('margin and standard-reader bookmarks do not collide on type', () => {
  assert.notStrictEqual(
    describeBucket('at.margin.bookmark', '.source').type,
    describeBucket('app.standard-reader.bookmark', '.subject').type
  );
});

test('community.lexicon bookmark + bluesky external link card are labeled', () => {
  assert.strictEqual(describeBucket('community.lexicon.bookmarks.bookmark', '.subject').label, 'Bookmarks');
  assert.deepStrictEqual(describeBucket('app.bsky.feed.post', '.embed.external.uri'),
    { type: 'bsky-link', label: 'Linked on Bluesky', icon: 'link', app: 'Bluesky', appId: 'bluesky', verb: 'linked to' });
});

test('all bluesky post link paths resolve to one "Linked on Bluesky" type', () => {
  const expected = { type: 'bsky-link', label: 'Linked on Bluesky', icon: 'link', app: 'Bluesky', appId: 'bluesky' };
  // link card (already mapped)
  assert.deepStrictEqual(describeBucket('app.bsky.feed.post', '.embed.external.uri'), expected);
  // richtext link facet — new index format
  assert.deepStrictEqual(describeBucket('app.bsky.feed.post', '.facets[].features[app.bsky.richtext.facet#link].uri'), expected);
  // richtext link facet — old index format
  assert.deepStrictEqual(describeBucket('app.bsky.feed.post', '.facets[app.bsky.richtext.facet].features[app.bsky.richtext.facet#link].uri'), expected);
  // bridgy-mirrored post
  assert.deepStrictEqual(describeBucket('app.bsky.feed.post', '.bridgyOriginalUrl'), expected);
});

test('non-link bluesky post paths are unaffected', () => {
  assert.strictEqual(describeBucket('app.bsky.feed.post', '.reply.parent.uri').type, 'reply');
  assert.strictEqual(describeBucket('app.bsky.feed.post', '.embed.record.uri').type, 'quote');
});

test('known entries carry an appId; shared/generic do NOT', () => {
  assert.strictEqual(describeBucket('at.margin.note', '.target.source').appId, 'margin');
  assert.strictEqual(describeBucket('app.bsky.feed.post', '.embed.external.uri').appId, 'bluesky');
  assert.strictEqual(describeBucket('site.standard.graph.recommend', '.document').appId, 'standard-site');
  assert.strictEqual(describeBucket('network.cosmik.card', '.content.url').appId, 'semble');
  assert.strictEqual(describeBucket('community.lexicon.bookmarks.bookmark', '.subject').appId, undefined);
  assert.strictEqual(describeBucket('com.example.foo.bar', '.x').appId, undefined);
});

test('icon fields are Lucide names, not emoji', () => {
  assert.strictEqual(describeBucket('at.margin.note', '.target.source').icon, 'square-pen');
  assert.strictEqual(describeBucket('app.bsky.feed.post', '.embed.external.uri').icon, 'link');
  assert.strictEqual(describeBucket('site.standard.graph.recommend', '.document').icon, 'star');
  assert.strictEqual(describeBucket('community.lexicon.bookmarks.bookmark', '.subject').icon, 'bookmark');
  assert.strictEqual(describeBucket('com.example.foo.bar', '.x').icon, 'circle'); // generic fallback
});

test('each bucket carries a natural-language verb', () => {
  assert.strictEqual(describeBucket('app.bsky.feed.like', '.subject.uri').verb, 'liked');
  assert.strictEqual(describeBucket('app.bsky.feed.post', '.reply.parent.uri').verb, 'replied to');
  assert.strictEqual(describeBucket('app.bsky.feed.post', '.embed.external.uri').verb, 'linked to');
  assert.strictEqual(describeBucket('at.margin.note', '.target.source').verb, 'annotated');
  assert.strictEqual(describeBucket('community.lexicon.bookmarks.bookmark', '.subject').verb, 'bookmarked');
  assert.strictEqual(describeBucket('com.example.foo.bar', '.x').verb, 'reacted to'); // generic fallback
});
