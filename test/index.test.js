import { test } from 'node:test';
import assert from 'node:assert';
import { fetchReactions } from '../src/index.js';

test('fetchReactions queries each provided subject and aggregates; captures errors', async () => {
  const fetchImpl = async (url) => {
    if (url.includes('/links/all')) {
      const target = new URL(url).searchParams.get('target');
      if (target.startsWith('at://')) return { ok: true, json: async () => ({ links: { 'site.standard.graph.recommend': { '.document': { records: 2, distinct_dids: 2 } } } }) };
      return { ok: false, status: 503, json: async () => ({}) }; // url subject fails
    }
    return { ok: true, json: async () => ({}) };
  };
  const r = await fetchReactions({ url: 'https://pixeline.be/x', aturi: 'at://did:plc:v/site.standard.document/1' }, { fetchImpl });
  assert.strictEqual(r.total, 2);
  assert.strictEqual(r.groups[0].type, 'recommend');
  assert.strictEqual(r.errors.length, 1);   // the url subject 503, captured not thrown
});
