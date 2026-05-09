import "dotenv/config";
import { createPublicClient, http, createWalletClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { startListener, type SentimentRequest } from "./listener.js";
import { runActors } from "./apify.js";
import { score } from "./scorer.js";
import { pinRawData } from "./ipfs.js";
import { payX402 } from "./payment.js";
import { fulfill } from "./fulfiller.js";

const BASE_SEPOLIA_RPC = process.env.BASE_SEPOLIA_RPC || "https://sepolia.base.org";
const ORACLE_ADDRESS = process.env.ORACLE_ADDRESS;
const KEEPER_PRIVATE_KEY = process.env.KEEPER_PRIVATE_KEY;
const APIFY_X402_ENDPOINT = process.env.APIFY_X402_ENDPOINT;

if (!ORACLE_ADDRESS) {
  throw new Error("ORACLE_ADDRESS is required");
}
if (!KEEPER_PRIVATE_KEY) {
  throw new Error("KEEPER_PRIVATE_KEY is required");
}

const BASE_SEPOLIA_CHAIN = {
  id: 84532,
  name: "Base Sepolia",
  network: "base-sepolia",
  nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [BASE_SEPOLIA_RPC] } },
};

const publicClient = createPublicClient({
  chain: BASE_SEPOLIA_CHAIN,
  transport: http(),
});

const account = privateKeyToAccount(KEEPER_PRIVATE_KEY as `0x${string}`);
const walletClient = createWalletClient({
  account,
  chain: BASE_SEPOLIA_CHAIN,
  transport: http(),
});

async function handleRequest(req: SentimentRequest): Promise<void> {
  const { requestId, assetId, sources } = req;
  console.log(`[keeper:${requestId}] processing request for asset ${assetId}`);

  try {
    console.log(`[keeper:${requestId}] step 1: paying for data`);
    if (APIFY_X402_ENDPOINT) {
      await payX402(APIFY_X402_ENDPOINT, ORACLE_ADDRESS, "base-sepolia", walletClient);
    }

    console.log(`[keeper:${requestId}] step 2: fetching social data`);
    const posts = await runActors(assetId, sources);
    console.log(`[keeper:${requestId}] fetched ${posts.length} posts`);

    console.log(`[keeper:${requestId}] step 3: scoring posts`);
    const result = score(posts);
    console.log(`[keeper:${requestId}] score: ${result.score.toFixed(4)}, signal: ${result.signal}`);

    console.log(`[keeper:${requestId}] step 4: pinning to IPFS`);
    const dataHash = await pinRawData(posts, assetId);
    console.log(`[keeper:${requestId}] data hash: ${dataHash}`);

    console.log(`[keeper:${requestId}] step 5: fulfilling oracle`);
    const txHash = await fulfill(requestId, result.score, result.volumeIndex, result.signal, walletClient);
    console.log(`[keeper:${requestId}] fulfilled, tx: ${txHash}`);
  } catch (error) {
    console.error(`[keeper:${requestId}] error:`, error);
  }
}

console.log("[semaphore] keeper running");

startListener(publicClient, ORACLE_ADDRESS!, handleRequest);