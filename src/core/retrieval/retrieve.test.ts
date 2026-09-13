import assert from "node:assert/strict";
import test from "node:test";
import { retrieveEvidence } from "./retrieve.ts";
import type { QuestionAnalysis } from "../question/types";

const analysis: QuestionAnalysis = {
  originalQuestion: "如何学习 AI Agent？",
  problem: "",
  goal: "",
  needs: [],
  idealExpertTraits: [],
  searchQueries: ["AI Agent", "AI Agent 经验", "失败查询"],
  requiresHumanExperience: false,
  confidence: 1,
};

test("retrieves serially, tolerates failures, and de-duplicates content", async () => {
  const calls: string[] = [];
  const summary = await retrieveEvidence(analysis, async (query) => {
    calls.push(query);
    if (query === "失败查询") throw new Error("temporary failure");
    return [{
      contentId: "same-content",
      title: "同一内容",
      excerpt: "摘要",
      authorId: "author-1",
      authorName: "作者",
    }];
  });

  assert.deepEqual(calls, ["AI Agent", "AI Agent 经验", "失败查询"]);
  assert.equal(summary.queryCount, 3);
  assert.equal(summary.evidenceCount, 1);
});

test("handles empty API results", async () => {
  const summary = await retrieveEvidence({ ...analysis, searchQueries: ["empty"] }, async () => []);
  assert.deepEqual(summary, { evidence: [], queryCount: 1, evidenceCount: 0 });
});
