import { test } from "node:test";
import assert from "node:assert";
import { normalize } from "../src/normalize.js";

test("normalize flattens, maps, merges same type, sorts by count", () => {
  const a = {
    links: {
      "app.bsky.feed.like": {
        ".subject.uri": { records: 5, distinct_dids: 5 },
      },
      "app.bsky.feed.repost": {
        ".subject.uri": { records: 2, distinct_dids: 2 },
      },
    },
  };
  const b = {
    links: {
      "site.standard.graph.recommend": {
        ".document": { records: 1, distinct_dids: 1 },
      },
      "app.bsky.feed.repost": {
        ".subject.uri": { records: 1, distinct_dids: 1 },
      },
    },
  };
  const r = normalize([a, b]);
  assert.strictEqual(r.total, 9);
  assert.strictEqual(r.groups[0].type, "like"); // 5, highest
  const repost = r.groups.find((g) => g.type === "repost");
  assert.strictEqual(repost.count, 3); // merged 2 + 1
});

test("normalize counts distinct people (distinct_dids), not records", () => {
  // 5 like records but only 3 distinct accounts -> count should reflect people
  const a = {
    links: {
      "app.bsky.feed.like": {
        ".subject.uri": { records: 5, distinct_dids: 3 },
      },
    },
  };
  const r = normalize([a]);
  assert.strictEqual(r.groups[0].count, 3);
  assert.strictEqual(r.total, 3);
});

test("normalize merges all bluesky link paths into one group, summing distinct_dids", () => {
  const a = {
    kind: "url",
    links: {
      "app.bsky.feed.post": {
        ".embed.external.uri": { records: 54, distinct_dids: 51 },
        ".facets[].features[app.bsky.richtext.facet#link].uri": {
          records: 47,
          distinct_dids: 44,
        },
        ".facets[app.bsky.richtext.facet].features[app.bsky.richtext.facet#link].uri":
          { records: 12, distinct_dids: 12 },
        ".bridgyOriginalUrl": { records: 1, distinct_dids: 1 },
        ".text": { records: 0, distinct_dids: 0 },
      },
    },
  };
  const r = normalize([a]);
  const linked = r.groups.filter((g) => g.type === "bsky-link");
  assert.strictEqual(linked.length, 1); // one row, not four
  assert.strictEqual(linked[0].count, 51 + 44 + 12 + 1); // summed distinct_dids = 108
});

test("a merged group carries every (collection, path) source it spans", () => {
  const a = {
    kind: "url",
    links: {
      "app.bsky.feed.post": {
        ".embed.external.uri": { records: 54, distinct_dids: 51 },
        ".facets[].features[app.bsky.richtext.facet#link].uri": {
          records: 47,
          distinct_dids: 44,
        },
      },
    },
  };
  const linked = normalize([a]).groups.find((g) => g.type === "bsky-link");
  assert.deepStrictEqual(linked.sources, [
    { collection: "app.bsky.feed.post", path: ".embed.external.uri" },
    {
      collection: "app.bsky.feed.post",
      path: ".facets[].features[app.bsky.richtext.facet#link].uri",
    },
  ]);
});

test("normalize tolerates empty/missing links", () => {
  assert.deepStrictEqual(normalize([{ links: {} }, {}]), {
    total: 0,
    groups: [],
  });
});
