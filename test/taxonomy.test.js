import { test } from 'node:test';
import assert from 'node:assert';
import { describe as describeBucket, humanizeNsid } from '../src/taxonomy.js';

test('known buckets map to labels/icons', () => {
  assert.deepStrictEqual(describeBucket('app.bsky.feed.like', '.subject.uri'),
    { type: 'like', label: 'Likes', icon: '♥', app: 'Bluesky' });
  assert.strictEqual(describeBucket('site.standard.graph.recommend', '.document').label, 'Recommends');
  assert.strictEqual(describeBucket('fyi.unravel.frontpage.post', '.url').app, 'Frontpage');
});

test('unknown bucket falls back to humanized nsid', () => {
  const d = describeBucket('com.example.foo.bar', '.x');
  assert.strictEqual(d.app, 'com.example.foo');
  assert.strictEqual(d.label, 'Bar');
  assert.strictEqual(d.icon, '◇');
});

test('humanizeNsid uses last segment, title-cased', () => {
  assert.strictEqual(humanizeNsid('app.bsky.feed.repost'), 'Repost');
});
