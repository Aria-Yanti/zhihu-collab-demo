import { MAX_RERANK_CANDIDATES } from "../../config/limits.ts";
import type { Candidate } from "./aggregate.ts";
import type { QuestionAnalysis } from "../question/types.ts";
import type { RankedCandidate } from "../../types/contracts.ts";
import { generateStructured } from "../../integrations/llm/provider.ts";

export const RERANK_SYSTEM_PROMPT = `你是知乎经验候选人匹配器。

请根据：

- 用户的问题；
- 用户目标；
- 候选人的知乎公开 Evidence；
判断哪些候选人最值得用户进一步了解。

严格要求：

1. 只能依据提供的 Evidence；
2. 不推断候选人的公司；
3. 不推断学历；
4. 不推断职位；
5. 不推断未明确出现的人生经历；
6. 不因为粉丝量高就自动排名更高；
7. 优先考虑经验与问题是否真正匹配。
输出 Top 3。`;

const RERANK_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["rankedCandidates"],
  properties: {
    rankedCandidates: {
      type: "array",
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["authorId", "fitScore", "reason", "evidenceIds"],
        properties: {
          authorId: { type: "string" },
          fitScore: { type: "number" },
          reason: { type: "string" },
          evidenceIds: { type: "array", items: { type: "string" } },
        },
      },
    },
  },
} as const;

type LlmRerankResult = {
  rankedCandidates?: unknown;
};

function deterministicTopCandidates(candidates: Candidate[]): RankedCandidate[] {
  return [...candidates]
    .sort((left, right) =>
      right.preliminaryScore - left.preliminaryScore
      || right.evidenceCount - left.evidenceCount
      || left.authorName.localeCompare(right.authorName),
    )
    .slice(0, 3)
    .map((candidate) => ({
      authorId: candidate.authorId,
      authorName: candidate.authorName,
      fitScore: candidate.preliminaryScore,
      reason: candidate.evidence.length > 0
        ? "根据候选人的知乎公开 Evidence 进行确定性排序。"
        : "候选人缺少可验证的知乎公开 Evidence。",
      evidenceIds: candidate.evidence.map((item) => item.contentId),
    }));
}

function promptFor(analysis: QuestionAnalysis, candidates: Candidate[]): string {
  return JSON.stringify({
    question: analysis.originalQuestion,
    problem: analysis.problem,
    goal: analysis.goal,
    userBackground: analysis.userBackground ?? "",
    needs: analysis.needs,
    idealExpertTraits: analysis.idealExpertTraits,
    candidates: candidates.map((candidate) => ({
      authorId: candidate.authorId,
      authorName: candidate.authorName,
      evidence: candidate.evidence.map((item) => ({
        contentId: item.contentId,
        title: item.title,
        excerpt: item.excerpt,
        contentType: item.contentType,
      })),
    })),
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseLlmResult(value: unknown, candidates: Candidate[]): RankedCandidate[] {
  if (!isRecord(value) || !Array.isArray(value.rankedCandidates)) {
    throw new Error("Reranker returned an invalid result");
  }

  const byId = new Map(candidates.map((candidate) => [candidate.authorId, candidate]));
  const seen = new Set<string>();
  const ranked: RankedCandidate[] = [];

  for (const item of value.rankedCandidates) {
    if (!isRecord(item) || typeof item.authorId !== "string") {
      throw new Error("Reranker returned an invalid candidate");
    }
    const candidate = byId.get(item.authorId);
    if (!candidate || seen.has(candidate.authorId)) {
      continue;
    }
    if (typeof item.fitScore !== "number" || !Number.isFinite(item.fitScore)
      || typeof item.reason !== "string" || !Array.isArray(item.evidenceIds)
      || !item.evidenceIds.every((id): id is string => typeof id === "string")) {
      throw new Error("Reranker returned invalid candidate fields");
    }

    const evidenceIds = new Set(candidate.evidence.map((evidence) => evidence.contentId));
    const groundedEvidenceIds = item.evidenceIds.filter((id) => evidenceIds.has(id));
    ranked.push({
      authorId: candidate.authorId,
      authorName: candidate.authorName,
      fitScore: Math.max(0, Math.min(1, item.fitScore)),
      reason: item.reason.trim(),
      evidenceIds: groundedEvidenceIds,
    });
    seen.add(candidate.authorId);
  }

  return ranked.length > 0 ? ranked.slice(0, 3) : (() => {
    throw new Error("Reranker returned no valid candidates");
  })();
}

export async function rerankCandidates(
  analysis: QuestionAnalysis,
  candidates: Candidate[],
): Promise<RankedCandidate[]> {
  const topCandidates = [...candidates]
    .sort((left, right) =>
      right.preliminaryScore - left.preliminaryScore
      || right.evidenceCount - left.evidenceCount
      || left.authorName.localeCompare(right.authorName),
    )
    .slice(0, MAX_RERANK_CANDIDATES);
  const fallback = deterministicTopCandidates(topCandidates);

  if (topCandidates.length === 0) {
    return fallback;
  }

  try {
    return parseLlmResult(
      await generateStructured<LlmRerankResult>({
        system: RERANK_SYSTEM_PROMPT,
        prompt: promptFor(analysis, topCandidates),
        schema: RERANK_SCHEMA,
      }),
      topCandidates,
    );
  } catch {
    return fallback;
  }
}

export const rerank = rerankCandidates;
