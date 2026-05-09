import { ApifyClient } from "apify-client";
import type { RawPost } from "./scorer.js";

const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;

const sourceToActor: Record<string, string> = {
  twitter: "apidojo/tweet-scraper",
  reddit: "trudax/reddit-scraper",
  news: "apify/google-news-scraper",
  google_news: "apify/google-news-scraper",
};

const sourceToClientKey: Record<string, string> = {
  twitter: "twitter_actor",
  reddit: "reddit_actor",
  news: "news_actor",
  google_news: "news_actor",
};

const assetIdToLabel: Record<string, string> = {
  "0x0000000000000000000000000000000000000000000000000000000000000000": "ETH",
  "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff": "BTC",
  "0x0000000000000000000000000000000000000000000000000000000000000001": "SOL",
};

function getApifyClientFactory(): () => ApifyClient {
  if (!APIFY_API_TOKEN) {
    throw new Error("APIFY_API_TOKEN environment variable not set");
  }
  return () => new ApifyClient({ token: APIFY_API_TOKEN });
}

let apifyClientFactory: () => ApifyClient = getApifyClientFactory;

export function __setApifyClientFactoryForTests(factory: () => ApifyClient): void {
  apifyClientFactory = factory;
}

function normalizePost(item: unknown): RawPost {
  const raw = item as Record<string, unknown>;
  return {
    text: String(raw.text ?? ""),
    source: String(raw.source ?? "unknown"),
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
    engagement: typeof raw.engagement === "number" ? raw.engagement : undefined,
  };
}

export async function runActors(assetId: string, sources: string[]): Promise<RawPost[]> {
  const client = apifyClientFactory();

  const validSources = sources.filter((s) => s in sourceToActor);
  if (validSources.length === 0) {
    return [];
  }

  const label = assetId in assetIdToLabel ? assetIdToLabel[assetId] : assetId;

  const runActor = async (source: string): Promise<RawPost[]> => {
    const actorId = sourceToActor[source];
    const clientKey = sourceToClientKey[source];
    const actor = client.actor(clientKey);
    const runResult = await actor.call({ input: { query: label } });
    const dataset = actor.dataset(runResult.defaultDatasetId);
    const { items } = await dataset.listItems();
    return items.map(normalizePost);
  };

  const results = await Promise.all(validSources.map(runActor));
  return results.flat();
}