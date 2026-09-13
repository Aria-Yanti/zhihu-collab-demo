import assert from "node:assert/strict";
import test from "node:test";
import { candidate, question } from "./knowledge-delegate.test.ts";
import { runDelegates } from "./run-delegates.ts";

test("runs only the top three delegates concurrently and preserves partial success", async () => {
  const originalFetch = globalThis.fetch;
  const oldKey = process.env.LLM_API_KEY;
  const requested = new Set<string>();
  let inFlight = 0;
  let peakInFlight = 0;

  globalThis.fetch = async (_input, init) => {
    const request = JSON.parse(String(init?.body));
    const prompt = JSON.parse(request.messages[1].content);
    const authorId = prompt.candidate.authorId as string;
    requested.add(authorId);
    inFlight += 1;
    peakInFlight = Math.max(peakInFlight, inFlight);
    await new Promise((resolve) => setTimeout(resolve, 10));
    inFlight -= 1;

    if (authorId === "author-2") {
      return new Response("failed", { status: 500 });
    }
    return new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify({
        authorId,
        canHelp: true,
        perspective: `视角 ${authorId}`,
        keyPoints: ["公开内容支持的观点"],
        limitations: ["信息有限"],
        evidenceIds: [`${authorId}-evidence`],
        confidence: 0.8,
      }) } }],
    }), { status: 200 });
  };
  process.env.LLM_API_KEY = "test-key";

  const candidates = Array.from({ length: 4 }, (_, index) => ({
    ...candidate(1),
    authorId: `author-${index + 1}`,
    authorName: `作者 ${index + 1}`,
    evidence: [{
      ...candidate(1).evidence[0],
      authorId: `author-${index + 1}`,
      contentId: `author-${index + 1}-evidence`,
    }],
  }));

  try {
    const result = await runDelegates(question, candidates);
    assert.equal(peakInFlight, 3);
    assert.deepEqual([...requested].sort(), ["author-1", "author-2", "author-3"]);
    assert.deepEqual(result.outputs.map((output) => output.authorId), ["author-1", "author-3"]);
    assert.equal(result.errors.length, 1);
    assert.match(result.errors[0].message, /failed/i);
    assert.deepEqual(
      { ...result.metrics, durationMs: 0 },
      { delegateCount: 3, successfulCount: 2, failedCount: 1, durationMs: 0 },
    );
    assert.ok(result.metrics.durationMs >= 10);
  } finally {
    globalThis.fetch = originalFetch;
    if (oldKey === undefined) delete process.env.LLM_API_KEY;
    else process.env.LLM_API_KEY = oldKey;
  }
});
