import assert from "node:assert/strict";
import test from "node:test";
import type { QuestionAnalysis } from "../question/types.ts";
import type { Candidate } from "../ranking/aggregate.ts";
import { runKnowledgeDelegate } from "./knowledge-delegate.ts";

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

function candidate(evidenceCount = 4): Candidate {
  return {
    authorId: "author-1",
    authorName: "作者一",
    evidence: Array.from({ length: evidenceCount }, (_, index) => ({
      contentId: `evidence-${index + 1}`,
      title: `公开内容 ${index + 1}`,
      excerpt: "关于转行过程的公开记录。",
      authorId: "author-1",
      authorName: "作者一",
      contentType: "answer" as const,
    })),
    evidenceCount,
    preliminaryScore: 1,
  };
}

test("uses one structured round, includes at most three Evidence, and grounds the output", async () => {
  const originalFetch = globalThis.fetch;
  const oldKey = process.env.LLM_API_KEY;
  let calls = 0;
  globalThis.fetch = async (_input, init) => {
    calls += 1;
    const request = JSON.parse(String(init?.body));
    const prompt = JSON.parse(request.messages[1].content);
    assert.equal(prompt.maxAgentRounds, 1);
    assert.equal(prompt.candidate.evidence.length, 3);
    assert.equal(JSON.stringify(prompt).includes("evidence-4"), false);
    return new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify({
        authorId: "wrong-author",
        canHelp: true,
        perspective: " 可提供转行步骤视角 ",
        keyPoints: [" 从公开记录梳理步骤 "],
        limitations: ["缺少结果数据"],
        evidenceIds: ["evidence-1", "evidence-4", "invented"],
        confidence: 2,
      }) } }],
    }), { status: 200 });
  };
  process.env.LLM_API_KEY = "test-key";

  try {
    const result = await runKnowledgeDelegate(question, candidate());
    assert.equal(calls, 1);
    assert.equal(result.authorId, "author-1");
    assert.deepEqual(result.evidenceIds, ["evidence-1"]);
    assert.equal(result.confidence, 1);
    assert.equal(result.perspective, "可提供转行步骤视角");
  } finally {
    globalThis.fetch = originalFetch;
    if (oldKey === undefined) delete process.env.LLM_API_KEY;
    else process.env.LLM_API_KEY = oldKey;
  }
});

export { candidate, question };
