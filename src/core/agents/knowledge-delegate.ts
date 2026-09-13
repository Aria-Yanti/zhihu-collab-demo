import {
  MAX_AGENT_ROUNDS,
  MAX_EVIDENCE_PER_DELEGATE,
} from "../../config/limits.ts";
import { generateStructured } from "../../integrations/llm/provider.ts";
import type { DelegateOutput } from "../../types/contracts.ts";
import type { QuestionAnalysis } from "../question/types.ts";
import type { Candidate } from "../ranking/aggregate.ts";

export const KNOWLEDGE_DELEGATE_SYSTEM_PROMPT = `你是一个 Knowledge Delegate。

你并不是候选人本人。

你不能冒充候选人。

你的任务是：

根据候选人的公开知乎内容 Evidence，提炼这个人在当前问题上可能提供的知识视角。

你只能使用输入中的 Evidence。

禁止：

- 编造候选人的经历；
- 使用第一人称假装自己是候选人；
- 推断候选人的公司、职位、学历；
- 补充没有 Evidence 支撑的事实；
- 代替候选人作出承诺；
- 声称候选人愿意接受联系。

回答：

1. Evidence 是否与用户问题相关；
2. 该候选人能提供什么独特视角；
3. Evidence 支持哪些关键观点；
4. 哪些地方 Evidence 不足。

只输出符合 schema 的严格 JSON。`;

const DELEGATE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "authorId", "canHelp", "perspective", "keyPoints", "limitations",
    "evidenceIds", "confidence",
  ],
  properties: {
    authorId: { type: "string" },
    canHelp: { type: "boolean" },
    perspective: { type: "string" },
    keyPoints: { type: "array", items: { type: "string" } },
    limitations: { type: "array", items: { type: "string" } },
    evidenceIds: { type: "array", items: { type: "string" } },
    confidence: { type: "number" },
  },
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function parseOutput(value: unknown, candidate: Candidate): DelegateOutput {
  if (!isRecord(value)
    || typeof value.canHelp !== "boolean"
    || typeof value.perspective !== "string"
    || !stringArray(value.keyPoints)
    || !stringArray(value.limitations)
    || !stringArray(value.evidenceIds)
    || typeof value.confidence !== "number"
    || !Number.isFinite(value.confidence)) {
    throw new Error(`Knowledge Delegate for ${candidate.authorId} returned an invalid result`);
  }

  const allowedIds = new Set(
    candidate.evidence
      .slice(0, MAX_EVIDENCE_PER_DELEGATE)
      .map((evidence) => evidence.contentId),
  );

  return {
    authorId: candidate.authorId,
    canHelp: value.canHelp,
    perspective: value.perspective.trim(),
    keyPoints: value.keyPoints.map((point) => point.trim()).filter(Boolean),
    limitations: value.limitations.map((limitation) => limitation.trim()).filter(Boolean),
    evidenceIds: Array.from(new Set(value.evidenceIds.filter((id) => allowedIds.has(id)))),
    confidence: Math.max(0, Math.min(1, value.confidence)),
  };
}

function promptFor(question: QuestionAnalysis, candidate: Candidate): string {
  return JSON.stringify({
    question: {
      originalQuestion: question.originalQuestion,
      problem: question.problem,
      goal: question.goal,
      userBackground: question.userBackground ?? "",
      needs: question.needs,
      idealExpertTraits: question.idealExpertTraits,
    },
    candidate: {
      authorId: candidate.authorId,
      authorName: candidate.authorName,
      evidence: candidate.evidence
        .slice(0, MAX_EVIDENCE_PER_DELEGATE)
        .map((evidence) => ({
          contentId: evidence.contentId,
          title: evidence.title,
          excerpt: evidence.excerpt,
          contentType: evidence.contentType,
        })),
    },
    maxAgentRounds: MAX_AGENT_ROUNDS,
  });
}

export async function runKnowledgeDelegate(
  question: QuestionAnalysis,
  candidate: Candidate,
): Promise<DelegateOutput> {
  // A delegate has exactly one generation round; the provider owns its bounded transport retry.
  if (MAX_AGENT_ROUNDS !== 1) {
    throw new Error("Knowledge Delegate requires MAX_AGENT_ROUNDS to equal 1");
  }

  const output = await generateStructured<unknown>({
    system: KNOWLEDGE_DELEGATE_SYSTEM_PROMPT,
    prompt: promptFor(question, candidate),
    schema: DELEGATE_SCHEMA,
  });

  return parseOutput(output, candidate);
}
