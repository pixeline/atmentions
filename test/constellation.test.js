import { test } from 'node:test';
import assert from 'node:assert';
import { linksAll, links } from '../src/constellation.js';

test('linksAll requests /links/all with encoded target and returns links map', async () => {
  let calledUrl;
  const fetchImpl = async (url) => {
    calledUrl = url;
    return {
      ok: true,
      json: async () => ({
        links: {
          'app.bsky.feed.like': {
            '.subject.uri': { records: 3, distinct_dids: 3 },
          },
        },
      }),
    };
  };
  const res = await linksAll({
    endpoint: 'https://idx.test',
    target: 'at://did:plc:x/app.bsky.feed.post/1',
    fetchImpl,
  });
  assert.ok(calledUrl.startsWith('https://idx.test/links/all?target='));
  assert.ok(
    calledUrl.includes(
      encodeURIComponent('at://did:plc:x/app.bsky.feed.post/1'),
    ),
  );
  assert.strictEqual(
    res.links['app.bsky.feed.like']['.subject.uri'].records,
    3,
  );
});

test('links passes collection+path+limit and returns rows', async () => {
  const fetchImpl = async (url) => ({
    ok: true,
    json: async () => ({
      linking_records: [
        { did: 'did:plc:a', collection: 'app.bsky.feed.like', rkey: 'r1' },
      ],
      cursor: 'c1',
    }),
  });
  const res = await links({
    endpoint: 'https://idx.test',
    target: 'at://x',
    collection: 'app.bsky.feed.like',
    path: '.subject.uri',
    limit: 10,
    fetchImpl,
  });
  assert.strictEqual(res.linking_records[0].did, 'did:plc:a');
  assert.strictEqual(res.cursor, 'c1');
});

test('linksAll throws on non-ok', async () => {
  const fetchImpl = async () => ({
    ok: false,
    status: 500,
    json: async () => ({}),
  });
  await assert.rejects(
    () =>
      linksAll({ endpoint: 'https://idx.test', target: 'at://x', fetchImpl }),
    /500/,
  );
});
