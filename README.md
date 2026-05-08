# Semaphore

Decentralized Sentiment Oracle — Hackathon Project Proposal

## Executive Summary

This project gives a verifiable, on-chain narrative intelligence. While protocols like Chainlink provide reliable price feeds, there is no equivalent for *sentiment risk*. Social and narrative forces that precede price movements are made available through Semaphore. This project uses **Apify** as the real-time web data backbone, **X402** as the micropayment protocol, and a **smart contract oracle** as the on-chain delivery layer to produce a feed that any DeFi protocol can consume.

***

## Problem Statement

On-chain DeFi protocols are blind to the off-chain world beyond price data. Yet some of the most catastrophic DeFi events — the Luna/UST depeg, the FTX contagion, the SVB bank run — were preceded by hours or days of clear, measurable social sentiment deterioration that any off-chain observer could read. No protocol could read it automatically.

Current solutions are either:

- **Centralized SaaS**: expensive subscriptions, opaque methodology, not composable with on-chain logic
- **Static snapshots**: pulled manually, not real-time, no on-chain proof of freshness
- **Proprietary**: no smart contract interface, not permissionlessly consumable

The result: DeFi protocols take on *narrative risk* they cannot price, hedge, or respond to programmatically.

***

## Solution: How It Works

### High-Level Architecture

```
User / DeFi Protocol
        │
        ▼
 ┌─────────────────┐      X402 payment (USDC on Solana/Base)
 │  Oracle Request │ ─────────────────────────────────────►  Apify Actor
 │   Smart Contract│                                          (Scraper)
 └────────┬────────┘ ◄─────────────────────────────────────  Raw Social Data
          │                    Result + proof of payment
          │  on-chain write
          ▼
 ┌─────────────────┐
 │  Sentiment Feed │  ← readable by any smart contract
 │  Contract       │    (same interface as Chainlink AggregatorV3)
 └─────────────────┘
```

### Step-by-Step Flow

1. **Request trigger**: A smart contract (e.g., a lending protocol, a prediction market, or an end user) calls `requestSentimentUpdate(asset, sources[], budget)` on the Oracle contract, attaching a small USDC payment.

2. **Off-chain agent wakes up**: An off-chain keeper/agent listens for `SentimentRequested` events on-chain. When it detects one, it reads the `asset` and `sources[]` parameters (e.g., `["twitter", "reddit", "google_news"]`).

3. **X402 payment to Apify**: The agent constructs an HTTP request to an X402-enabled Apify endpoint. The endpoint returns a `402 Payment Required` response with a USDC price quote. The agent pays via X402 micropayment (sub-cent per scrape).

4. **Apify Actors run**: Apify executes the relevant Actors concurrently:
   - **Twitter/X Scraper**: collects recent mentions, engagement, sentiment keywords
   - **Reddit Scraper**: monitors key subreddits (r/CryptoCurrency, r/ethereum, asset-specific subs)
   - **Google News Scraper**: captures mainstream financial press coverage
   - **Telegram Channel Scraper** (optional): captures community channel activity

5. **Sentiment aggregation**: The agent runs a lightweight NLP scoring pass (VADER or a small LLM call) over the raw data to produce:
   - A **sentiment score** (−1.0 to +1.0)
   - A **volume index** (normalized mention count)
   - A **fear/greed signal** (categorical: Extreme Fear / Fear / Neutral / Greed / Extreme Greed)
   - A **source breakdown** (score per platform)
   - A **data hash** (keccak256 of the raw dataset, for auditability)

6. **On-chain write**: The agent submits the aggregated result to the Oracle contract via `fulfillSentimentUpdate(requestId, score, volumeIndex, signal, dataHash, timestamp)`. The transaction is signed and verifiable on-chain.

7. **Consumers read**: Any smart contract calls `getLatestSentiment(asset)` — identical interface to `AggregatorV3Interface.latestRoundData()`. No integration change required for protocols already using Chainlink.

***

## The X402 Integration — Why It Matters

### Role 1: Permissionless Data Access

Any agent — human-operated, autonomous, or another smart contract's keeper — can trigger a scrape without a pre-existing API key or subscription. The protocol handles authentication through payment. This means:

- New DeFi protocols can integrate the oracle from day one without onboarding friction
- Autonomous agents can natively pay for intelligence as part of their decision loop
- The data marketplace is open and composable

### Role 2: On-Chain Payment Proof

Every X402 payment generates a verifiable payment receipt. The oracle contract stores the receipt hash alongside the sentiment result. This creates an auditable chain:

- **Who** requested the data (wallet address)
- **When** (block timestamp)
- **What** was bought (Apify Actor, asset, source set)
- **What** was returned (sentiment score + data hash)

This is fundamentally different from a centralized API call. The payment trail is the provenance record.
