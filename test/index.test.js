import { test } from "node:test";
import assert from "node:assert";
import { fetchReactions, resolveReactors } from "../src/index.js";

test("fetchReactions queries each provided subject and aggregates; captures errors", async () => {
  const fetchImpl = async (url) => {
    if (url.includes("/links/all")) {
      const target = new URL(url).searchParams.get("target");
      if (target.startsWith("at://"))
        return {
          ok: true,
          json: async () => ({
            links: {
              "site.standard.graph.recommend": {
                ".document": { records: 2, distinct_dids: 2 },
              },
            },
          }),
        };
      return { ok: false, status: 503, json: async () => ({}) }; // url subject fails
    }
    return { ok: true, json: async () => ({}) };
  };
  const r = await fetchReactions(
    {
      url: "https://pixeline.be/x",
      aturi: "at://did:plc:v/site.standard.document/1",
    },
    { fetchImpl },
  );
  assert.strictEqual(r.total, 2);
  assert.strictEqual(r.groups[0].type, "recommend");
  assert.strictEqual(r.groups[0].subjectKind, "aturi"); // recommend came from the aturi subject
  assert.strictEqual(r.errors.length, 2); // both url variants (slash + no-slash) 503'd, captured not thrown
});

test("fetchReactions matches URL-keyed reactions regardless of trailing slash", async () => {
  // the page is queried WITHOUT a trailing slash, but the data lives under the slash variant
  const fetchImpl = async (url) => {
    const target = new URL(url).searchParams.get("target");
    if (target === "https://pixeline.be/x/")
      return {
        ok: true,
        json: async () => ({
          links: {
            "at.margin.note": {
              ".target.source": { records: 2, distinct_dids: 1 },
            },
          },
        }),
      };
    return { ok: true, json: async () => ({ links: {} }) };
  };
  const r = await fetchReactions(
    { url: "https://pixeline.be/x" },
    { fetchImpl },
  );
  const note = r.groups.find((g) => g.type === "note");
  assert.ok(note, "margin note found via the trailing-slash variant");
  assert.strictEqual(note.count, 1); // count is distinct people: 2 records, 1 account
  assert.strictEqual(note.subjectKind, "url");
});

test("fetchReactions skips the associatedRefs path (avoids double-counting the linking post)", async () => {
  const fetchImpl = async (url) => {
    const target = new URL(url).searchParams.get("target");
    if (target.startsWith("at://"))
      return {
        ok: true,
        json: async () => ({
          links: {
            "app.bsky.feed.post": {
              ".embed.external.associatedRefs[com.atproto.repo.strongRef].uri":
                { records: 1, distinct_dids: 1 },
            },
          },
        }),
      };
    if (target === "https://pixeline.be/x")
      return {
        ok: true,
        json: async () => ({
          links: {
            "app.bsky.feed.post": {
              ".embed.external.uri": { records: 1, distinct_dids: 1 },
            },
          },
        }),
      }; // a real record lives under ONE url variant
    return { ok: true, json: async () => ({ links: {} }) };
  };
  const r = await fetchReactions(
    {
      url: "https://pixeline.be/x",
      aturi: "at://did/site.standard.document/1",
    },
    { fetchImpl },
  );
  assert.strictEqual(
    r.total,
    1,
    "the one linking post counted once, not twice",
  );
  assert.strictEqual(r.groups[0].type, "bsky-link");
});

test("resolveReactors dedups reactors by DID (one entry per person per group)", async () => {
  const fetchImpl = async (url) => {
    if (url.includes("/links")) {
      return {
        ok: true,
        json: async () => ({
          linking_records: [
            { did: "did:plc:a", collection: "at.margin.note", rkey: "r1" },
            { did: "did:plc:a", collection: "at.margin.note", rkey: "r2" }, // same person, 2nd note
          ],
        }),
      };
    }
    // getProfiles
    return {
      ok: true,
      json: async () => ({
        profiles: [
          {
            did: "did:plc:a",
            handle: "alex.test",
            displayName: "Alex",
            avatar: "",
          },
        ],
      }),
    };
  };
  const reactors = await resolveReactors(
    {
      type: "note",
      collection: "at.margin.note",
      path: ".target.source",
      subjectKind: "url",
    },
    { url: "https://x/" },
    { fetchImpl },
  );
  assert.strictEqual(reactors.length, 1, "one entry for the one person");
  assert.strictEqual(reactors[0].did, "did:plc:a");
});
