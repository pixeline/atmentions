import { test } from 'node:test';
import assert from 'node:assert';
import { getProfiles } from '../src/appview.js';

test('getProfiles chunks >25 dids and flattens results', async () => {
  const dids = Array.from({ length: 30 }, (_, i) => `did:plc:${i}`);
  let calls = 0;
  const fetchImpl = async (url) => {
    calls++;
    const n = new URL(url).searchParams.getAll('actors').length;
    return {
      ok: true,
      json: async () => ({
        profiles: Array.from({ length: n }, (_, i) => ({
          did: `d${i}`,
          handle: `h${i}`,
          displayName: '',
          avatar: '',
        })),
      }),
    };
  };
  const res = await getProfiles({
    appview: 'https://av.test',
    dids,
    fetchImpl,
  });
  assert.strictEqual(calls, 2); // 25 + 5
  assert.strictEqual(res.length, 30);
});

test('getProfiles returns [] for empty input without fetching', async () => {
  let called = false;
  await getProfiles({
    appview: 'https://av.test',
    dids: [],
    fetchImpl: async () => {
      called = true;
      return {};
    },
  });
  assert.strictEqual(called, false);
});
