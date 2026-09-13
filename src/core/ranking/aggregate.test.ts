import assert from "node:assert/strict";
import test from "node:test";
import { aggregateCandidates } from "./aggregate.ts";
import type { ZhihuEvidence } from "../../integrations/zhihu/types";

function evidence(index: number, authorId = "author-1"): ZhihuEvidence {
  return {
    contentId: `content-${index}`,
    title: `标题 ${index}`,
    excerpt: "摘要",
    authorId,
    authorName: authorId === "author-1" ? "作者一" : "作者二",
    contentType: "answer",
  };
}

test("groups by author, keeps counts, caps evidence, and returns top five", () => {
  const input = Array.from({ length: 7 }, (_, index) => evidence(index, `author-${index}`));
  input.push(...Array.from({ length: 6 }, (_, index) => evidence(index + 10)));

  const candidates = aggregateCandidates(input);
  assert.equal(candidates.length, 5);
  const authorOne = candidates.find((candidate) => candidate.authorId === "author-1");
  assert.ok(authorOne);
  assert.equal(authorOne.evidenceCount, 7);
  assert.equal(authorOne.evidence.length, 5);
});

test("uses a stable fallback for missing authors", () => {
  const [candidate] = aggregateCandidates([{ ...evidence(1), authorId: "", authorName: "" }]);
  assert.equal(candidate.authorId, "unknown:content-1");
  assert.equal(candidate.authorName, "知乎用户");
});
