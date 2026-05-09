import test from "node:test";
import assert from "node:assert/strict";

type RawPostLike = {
  text: string;
  source: string;
  createdAt: string;
  engagement?: number;
};

type FakeActorRun = {
  call: () => Promise<{ defaultDatasetId: string }>;
  dataset: () => {
    listItems: () => Promise<{ items: RawPostLike[] }>;
  };
};

type FakeApifyClient = {
  actor: (actorId: string) => FakeActorRun;
};

test("runActors with unknown source skips silently and returns empty array", async () => {
  let actorCalls = 0;
  const fakeClient: FakeApifyClient = {
    actor: () => {
      actorCalls += 1;
      return {
        call: async () => ({ defaultDatasetId: "unused" }),
        dataset: () => ({ listItems: async () => ({ items: [] }) })
      };
    }
  };

  // @ts-expect-error TDD: module implemented next.
  const { runActors, __setApifyClientFactoryForTests } = await import("./apify.js");
  __setApifyClientFactoryForTests(() => fakeClient);

  const result = await runActors("ETH", ["some_unknown_source"]);

  assert.deepEqual(result, []);
  assert.equal(actorCalls, 0);
});

test("runActors calls one Actor per valid source", async () => {
  const actorIds: string[] = [];
  const fakeClient: FakeApifyClient = {
    actor: (actorId: string) => {
      actorIds.push(actorId);
      return {
        call: async () => ({ defaultDatasetId: `${actorId}-dataset` }),
        dataset: () => ({ listItems: async () => ({ items: [] }) })
      };
    }
  };

  // @ts-expect-error TDD: module implemented next.
  const { runActors, __setApifyClientFactoryForTests } = await import("./apify.js");
  __setApifyClientFactoryForTests(() => fakeClient);

  await runActors("ETH", ["twitter", "reddit", "google_news"]);

  assert.equal(actorIds.length, 3);
});

test("each returned item conforms to RawPost shape", async () => {
  const fakeItems: RawPostLike[] = [
    { text: "Post 1", source: "twitter", createdAt: "2026-05-09T00:00:00.000Z" },
    { text: "Post 2", source: "twitter", createdAt: "2026-05-09T00:10:00.000Z", engagement: 5 }
  ];

  const fakeClient: FakeApifyClient = {
    actor: () => ({
      call: async () => ({ defaultDatasetId: "dataset-1" }),
      dataset: () => ({ listItems: async () => ({ items: fakeItems }) })
    })
  };

  // @ts-expect-error TDD: module implemented next.
  const { runActors, __setApifyClientFactoryForTests } = await import("./apify.js");
  __setApifyClientFactoryForTests(() => fakeClient);

  const result = await runActors("ETH", ["twitter"]);

  assert.ok(result.length > 0);
  for (const item of result) {
    assert.equal(typeof item.text, "string");
    assert.equal(typeof item.source, "string");
    assert.equal(typeof item.createdAt, "string");
  }
});

test("results from all sources are merged into one flat array", async () => {
  const byActorId: Record<string, RawPostLike[]> = {
    twitter_actor: [{ text: "t1", source: "twitter", createdAt: "2026-05-09T00:00:00.000Z" }],
    reddit_actor: [
      { text: "r1", source: "reddit", createdAt: "2026-05-09T00:01:00.000Z" },
      { text: "r2", source: "reddit", createdAt: "2026-05-09T00:02:00.000Z" }
    ]
  };

  const fakeClient: FakeApifyClient = {
    actor: (actorId: string) => ({
      call: async () => ({ defaultDatasetId: `${actorId}-dataset` }),
      dataset: () => ({ listItems: async () => ({ items: byActorId[actorId] ?? [] }) })
    })
  };

  // @ts-expect-error TDD: module implemented next.
  const { runActors, __setApifyClientFactoryForTests } = await import("./apify.js");
  __setApifyClientFactoryForTests(() => fakeClient);

  const result = await runActors("ETH", ["twitter", "reddit"]);

  assert.equal(Array.isArray(result), true);
  assert.equal(result.length, 3);
  assert.deepEqual(
    result.map((p: RawPostLike) => p.text),
    ["t1", "r1", "r2"]
  );
});
