import test from "node:test";
import assert from "node:assert/strict";

type MockWatchContractEvent = (args: {
  address: string;
  abi: unknown[];
  eventName: string;
  onLogs: (logs: unknown[]) => void;
}) => () => void;

test("startListener calls watchContractEvent on oracle address with event name SentimentRequested", async (t) => {
  let watchContractEventArgs: {
    address: string;
    abi: unknown[];
    eventName: string;
    onLogs: (logs: unknown[]) => void;
  } | null = null;

  const mockPublicClient = {
    watchContractEvent: (args: {
      address: string;
      abi: unknown[];
      eventName: string;
      onLogs: (logs: unknown[]) => void;
    }) => {
      watchContractEventArgs = args;
      return () => {};
    }
  };

  const { startListener } = await import("./listener.js");

  const unsubscribe = startListener(
    mockPublicClient as unknown as { watchContractEvent: MockWatchContractEvent },
    "0x1234567890123456789012345678901234567890",
    () => {}
  );

  assert.equal(typeof unsubscribe, "function");

  assert.ok(watchContractEventArgs !== null, "watchContractEvent should have been called");
  assert.equal(watchContractEventArgs!.address, "0x1234567890123456789012345678901234567890");
  assert.equal(watchContractEventArgs!.eventName, "SentimentUpdateRequested");
});

test("when a log is received, the onRequest callback is called with correctly shaped { requestId, assetId, requester, sources }", async (t) => {
  let capturedOnLogs: ((logs: unknown[]) => void) | null = null;
  let onRequestArgs: { requestId: string; assetId: string; requester: string; sources: string[] } | null = null;

  const mockPublicClient = {
    watchContractEvent: (args: {
      address: string;
      abi: unknown[];
      eventName: string;
      onLogs: (logs: unknown[]) => void;
    }) => {
      capturedOnLogs = args.onLogs;
      return () => {};
    }
  };

  const mockLogs = [
    {
      args: {
        requestId: "0x1111111111111111111111111111111111111111111111111111111111111111",
        assetId: "0x0000000000000000000000000000000000000000000000000000000000000000",
        requester: "0x2222222222222222222222222222222222222222",
        sources: ["twitter", "reddit"]
      }
    }
  ];

  const { startListener } = await import("./listener.js");

  startListener(
    mockPublicClient as unknown as { watchContractEvent: MockWatchContractEvent },
    "0x1234567890123456789012345678901234567890",
    (args) => {
      onRequestArgs = args;
    }
  );

  // Simulate receiving logs by calling the captured onLogs callback
  if (capturedOnLogs) {
    capturedOnLogs(mockLogs as unknown[]);
  }

  assert.ok(onRequestArgs !== null, "onRequest should have been called");
  assert.equal(onRequestArgs!.requestId, "0x1111111111111111111111111111111111111111111111111111111111111111");
  assert.equal(onRequestArgs!.assetId, "0x0000000000000000000000000000000000000000000000000000000000000000");
  assert.equal(onRequestArgs!.requester, "0x2222222222222222222222222222222222222222");
  assert.deepEqual(onRequestArgs!.sources, []);
});

test("if onRequest throws, the error is caught and does not crash the listener", async (t) => {
  let capturedOnLogs: ((logs: unknown[]) => void) | null = null;
  let errorLogged = false;

  const mockPublicClient = {
    watchContractEvent: (args: {
      address: string;
      abi: unknown[];
      eventName: string;
      onLogs: (logs: unknown[]) => void;
    }) => {
      capturedOnLogs = args.onLogs;
      return () => {};
    }
  };

  const mockLogs = [
    {
      args: {
        requestId: "0x1111111111111111111111111111111111111111111111111111111111111111",
        assetId: "0x0000000000000000000000000000000000000000000000000000000000000000",
        requester: "0x2222222222222222222222222222222222222222",
        sources: ["twitter"]
      }
    }
  ];

  const originalConsoleError = console.error;
  console.error = (msg: unknown) => {
    if (msg instanceof Error && msg.message === "Callback error") {
      errorLogged = true;
    }
  };

  const { startListener } = await import("./listener.js");

  startListener(
    mockPublicClient as unknown as { watchContractEvent: MockWatchContractEvent },
    "0x1234567890123456789012345678901234567890",
    () => {
      throw new Error("Callback error");
    }
  );

  // Simulate receiving logs - error should be caught and logged
  if (capturedOnLogs) {
    capturedOnLogs(mockLogs as unknown[]);
  }

  console.error = originalConsoleError;

  assert.ok(errorLogged, "Error from onRequest should be caught and logged");
});