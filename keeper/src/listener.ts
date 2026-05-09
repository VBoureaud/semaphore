import { createPublicClient, http, type PublicClient } from "viem";
import semOracleAbi from "../../contracts/out/SemaphoreOracle.sol/SemaphoreOracle.json" with { type: "json" };

const BASE_SEPOLIA_RPC = process.env.BASE_SEPOLIA_RPC;
const ORACLE_ADDRESS = process.env.ORACLE_ADDRESS;

export type SentimentRequest = {
  requestId: string;
  assetId: string;
  requester: string;
  sources: string[];
};

function getPublicClient(): PublicClient {
  if (!BASE_SEPOLIA_RPC) {
    throw new Error("BASE_SEPOLIA_RPC environment variable not set");
  }
  return createPublicClient({
    chain: {
      id: 84532,
      name: "Base Sepolia",
      network: "base-sepolia",
      nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
      rpcUrls: { default: { http: [BASE_SEPOLIA_RPC] } },
    },
    transport: http(),
  });
}

let publicClientFactory: () => PublicClient = getPublicClient;

export function __setPublicClientFactoryForTests(factory: () => PublicClient): void {
  publicClientFactory = factory;
}

export function startListener(
  publicClient: PublicClient,
  oracleAddress: string,
  onRequest: (req: SentimentRequest) => Promise<void>
): () => void {
  const unwatch = publicClient.watchContractEvent({
    address: oracleAddress,
    abi: semOracleAbi,
    eventName: "SentimentUpdateRequested",
    onLogs: (logs) => {
      for (const log of logs) {
        const args = log.args as unknown as {
          requestId: string;
          assetId: string;
          requester: string;
        };
        try {
          Promise.resolve(onRequest({
            requestId: args.requestId,
            assetId: args.assetId,
            requester: args.requester,
            sources: [],
          })).catch(console.error);
        } catch (e) {
          console.error(e);
        }
      }
    },
  });

  return unwatch;
}