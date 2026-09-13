import assert from "node:assert/strict";
import test from "node:test";
import type { DelegateOutput } from "../../types/contracts.ts";
import type { QuestionAnalysis } from "../question/types.ts";
import { deterministicModeratorFallback, runModerator } from "./moderator.ts";

const question: QuestionAnalysis = {
  originalQuestion: "如何从设计转行产品经理？",
  problem: "缺少真实路径参考",
  goal: "了解可行的转行步骤",
  needs: ["转行经验"],
  idealExpertTraits: ["有相关公开内容"],
  searchQueries: ["设计 转行 产品经理"],
  requiresHumanExperience: true,
  confidence: 0.9,
};

const delegates: DelegateOutput[] = [
  {
    authorId: "author-1", canHelp: true, perspective: "转行实践",
    keyPoints: ["先验证岗位要求", "补足能力"], limitations: ["缺少长期结果"],
    evidenceIds: ["evidence-1"], confidence: 0.9,
  },
  {
    authorId: "author-2", canHelp: true, perspective: "招聘视角",
    keyPoints: ["先验证岗位要求", "调整作品集"], limitations: ["只覆盖一个行业"],
    evidenceIds: ["evidence-2"], confidence: 0.8,
  },
];

test("uses structured generation and rejects recommendations for unknown people", async () => {
  const originalFetch = globalThis.fetch;
  const oldKey = process.env.LLM_API_KEY;
  let body: Record<string, unknown> | undefined;
  globalThis.fetch = async (_input, init) => {
    body = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({
      summary: "两种有 Evidence 支持的视角。",
      consensus: ["先验证岗位要求"],
      differences: [{ topic: "侧重点", perspectives: ["author-1: 实践", "author-2: 招聘"] }],
      recommendedActions: ["验证岗位要求"],
      recommendedPeople: [
        { authorId: "author-2", reason: "Evidence 与招聘需求接近" },
        { authorId: "invented", reason: "不应保留" },
      ],
    }) } }] }), { status: 200 });
  };
  process.env.LLM_API_KEY = "test-key";

  try {
    const result = await runModerator(question, delegates);
    assert.equal((body as { messages?: unknown[] }).messages?.length, 2);
    assert.deepEqual(result.recommendedPeople, [
      { authorId: "author-2", reason: "Evidence 与招聘需求接近" },
    ]);
  } finally {
    globalThis.fetch = originalFetch;
    if (oldKey === undefined) delete process.env.LLM_API_KEY;
    else process.env.LLM_API_KEY = oldKey;
  }
});

test("falls back deterministically while retaining delegate key points and limitations", async () => {
  const oldDemoMode = process.env.DEMO_MODE;
  process.env.DEMO_MODE = "true";
  try {
    const result = await runModerator(question, delegates);
    assert.deepEqual(result, deterministicModeratorFallback(delegates));
    assert.match(result.summary, /author-1/);
    assert.deepEqual(result.consensus, ["先验证岗位要求"]);
    assert.deepEqual(result.differences[0].perspectives, [
      "author-1: 先验证岗位要求", "author-1: 补足能力",
      "author-2: 先验证岗位要求", "author-2: 调整作品集",
    ]);
    assert.deepEqual(result.differences[1].perspectives, [
      "author-1: 缺少长期结果", "author-2: 只覆盖一个行业",
    ]);
    assert.deepEqual(result.recommendedPeople, []);
  } finally {
    if (oldDemoMode === undefined) delete process.env.DEMO_MODE;
    else process.env.DEMO_MODE = oldDemoMode;
  }
});
