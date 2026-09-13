import type { ZhihuEvidence } from "../../integrations/zhihu/types";
import { MAX_RERANK_CANDIDATES } from "../../config/limits.ts";

export interface Candidate {
  authorId: string;
  authorName: string;
  evidence: ZhihuEvidence[];
  evidenceCount: number;
  preliminaryScore: number;
  matchedQueries?: string[];
}

function authorKey(evidence: ZhihuEvidence, index: number): string {
  const authorId = evidence.authorId?.trim();
  return authorId || `unknown:${evidence.contentId?.trim() || index}`;
}

function scoreCandidate(evidence: ZhihuEvidence[]): number {
  const evidenceScore = evidence.length;
  const contentTypes = new Set(evidence.map((item) => item.contentType).filter(Boolean)).size;
  const interactions = evidence.reduce(
    (total, item) => total + (item.metrics?.votes ?? 0) + (item.metrics?.comments ?? 0),
    0,
  );

  return Number((evidenceScore + contentTypes * 0.25 + interactions / 1000).toFixed(3));
}

export function aggregateCandidates(input: ZhihuEvidence[]): Candidate[] {
  const grouped = new Map<string, Candidate>();

  input.forEach((item, index) => {
    const key = authorKey(item, index);
    const current = grouped.get(key);
    if (current) {
      if (current.evidence.length < 5) current.evidence.push(item);
      current.evidenceCount += 1;
      return;
    }

    grouped.set(key, {
      authorId: key,
      authorName: item.authorName?.trim() || "知乎用户",
      evidence: [item],
      evidenceCount: 1,
      preliminaryScore: 0,
    });
  });

  return Array.from(grouped.values())
    .map((candidate) => ({
      ...candidate,
      preliminaryScore: scoreCandidate(candidate.evidence),
    }))
    .sort((left, right) =>
      right.preliminaryScore - left.preliminaryScore
      || right.evidenceCount - left.evidenceCount
      || left.authorName.localeCompare(right.authorName),
    )
    .slice(0, MAX_RERANK_CANDIDATES);
}

export const aggregate = aggregateCandidates;
