import assert from "node:assert/strict";
import test from "node:test";
import type { QuestionAnalysis } from "../question/types.ts";
import type { Candidate } from "./aggregate.ts";
import { rerankCandidates } from "./rerank.ts";

const analysis: QuestionAnalysis = {
  originalQuestion: "如何转行做产品经理？",
  problem: "缺少转行经验",
  goal: "找到真实的转行路径",
  userBackground: "",
  needs: ["转行经验"],
  idealExpertTraits: ["有转行经历"],
  searchQueries: ["产品经理 转行"],
  requiresHumanExperience: true,
  confidence: 0.9,
};

function candidates(count: number): Candidate[] {
  return Array.from({ length: count }, (_, index) => ({
    authorId: `author-${index}`,
    authorName: `作者${index}`,
    evidence: [{
      contentId: `evidence-${index}`,
      title: `转行记录 ${index}`,
      excerpt: "记录了转行过程和经验。",
      authorId: `author-${index}`,
      authorName: `作者${index}`,
      contentType: "answer",
    }],
    evidenceCount: 1,
    preliminaryScore: count - index,
  }));
}

function mockLlm(response: unknown): () => void {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    choices: [{ message: { content: JSON.stringify(response) } }],
  }), { status: 200 });
  return () => {
    globalThis.fetch = originalFetch;
  };
}

test("reranks at most five candidates with one structured request and returns top three", async () => {
  let calls = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_input, init) => {
    calls += 1;
    const body = JSON.parse(String(init?.body));
    assert.equal(body.messages[1].content.includes("author-5"), false);
    return new Response(JSON.stringify({
      choices: [{
        message: {
          content: JSON.stringify({
            rankedCandidates: [
              { authorId: "author-4", fitScore: 0.95, reason: "Evidence 与问题最匹配", evidenceIds: ["evidence-4"] },
              { authorId: "author-1", fitScore: 0.8, reason: "有相关经验", evidenceIds: ["evidence-1"] },
              { authorId: "author-0", fitScore: 0.7, reason: "Evidence 可供了解", evidenceIds: ["evidence-0"] },
            ],
          }),
        },
      }],
    }), { status: 200 });
  };
  const oldKey = process.env.LLM_API_KEY;
  process.env.LLM_API_KEY = "test-key";
  try {
    const result = await rerankCandidates(analysis, candidates(6));
    assert.deepEqual(result.map((item) => item.authorId), ["author-4", "author-1", "author-0"]);
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
    if (oldKey === undefined) delete process.env.LLM_API_KEY;
    else process.env.LLM_API_KEY = oldKey;
  }
});

test("returns fewer than three candidates when fewer are provided", async () => {
  const restore = mockLlm({
    rankedCandidates: [{ authorId: "author-0", fitScore: 0.5, reason: "相关", evidenceIds: ["evidence-0"] }],
  });
  const oldKey = process.env.LLM_API_KEY;
  process.env.LLM_API_KEY = "test-key";
  try {
    assert.equal((await rerankCandidates(analysis, candidates(1))).length, 1);
  } finally {
    restore();
    if (oldKey === undefined) delete process.env.LLM_API_KEY;
    else process.env.LLM_API_KEY = oldKey;
  }
});

test("falls back to deterministic top three when LLM fails", async () => {
  const oldFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("failure", { status: 500 });
  const oldKey = process.env.LLM_API_KEY;
  process.env.LLM_API_KEY = "test-key";
  try {
    const result = await rerankCandidates(analysis, candidates(5));
    assert.deepEqual(result.map((item) => item.authorId), ["author-0", "author-1", "author-2"]);
  } finally {
    globalThis.fetch = oldFetch;
    if (oldKey === undefined) delete process.env.LLM_API_KEY;
    else process.env.LLM_API_KEY = oldKey;
  }
});

test("falls back when JSON output is invalid", async () => {
  const oldFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    choices: [{ message: { content: "{not-json" } }],
  }), { status: 200 });
  const oldKey = process.env.LLM_API_KEY;
  process.env.LLM_API_KEY = "test-key";
  try {
    assert.deepEqual((await rerankCandidates(analysis, candidates(3))).map((item) => item.authorId), [
      "author-0", "author-1", "author-2",
    ]);
  } finally {
    globalThis.fetch = oldFetch;
    if (oldKey === undefined) delete process.env.LLM_API_KEY;
    else process.env.LLM_API_KEY = oldKey;
  }
});

test("falls back in DEMO_MODE", async () => {
  const oldMode = process.env.DEMO_MODE;
  process.env.DEMO_MODE = "true";
  try {
    assert.deepEqual((await rerankCandidates(analysis, candidates(3))).map((item) => item.authorId), [
      "author-0", "author-1", "author-2",
    ]);
  } finally {
    if (oldMode === undefined) delete process.env.DEMO_MODE;
    else process.env.DEMO_MODE = oldMode;
  }
});

test("does not invent evidence when a candidate has insufficient evidence", async () => {
  const input = candidates(1);
  input[0].evidence = [];
  const restore = mockLlm({
    rankedCandidates: [{
      authorId: "author-0",
      fitScore: 0.9,
      reason: "没有足够证据",
      evidenceIds: ["invented-evidence"],
    }],
  });
  const oldKey = process.env.LLM_API_KEY;
  process.env.LLM_API_KEY = "test-key";
  try {
    const [result] = await rerankCandidates(analysis, input);
    assert.deepEqual(result.evidenceIds, []);
  } finally {
    restore();
    if (oldKey === undefined) delete process.env.LLM_API_KEY;
    else process.env.LLM_API_KEY = oldKey;
  }
});
