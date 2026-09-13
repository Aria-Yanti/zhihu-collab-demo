import { generateStructured } from "../../integrations/llm/provider.ts";
import type { CollaborationResult, DelegateOutput } from "../../types/contracts.ts";
import type { QuestionAnalysis } from "../question/types.ts";

export const MODERATOR_SYSTEM_PROMPT = `你是 Knowledge Collaboration Moderator。

你收到的是多个 Knowledge Delegate 的结构化输出。

你的任务不是重新生成一份泛泛的 AI 回答。

请识别：

1. 哪些观点形成共识；
2. 哪些观点存在明显差异；
3. 差异来自哪些不同经验视角；
4. 用户当前最值得采取哪些行动；
5. 哪个候选人的 Evidence 与用户问题最接近。

严格要求：

- 不增加新的事实；
- 不虚构专家经历；
- 不掩盖分歧；
- 不把所有观点强行统一；
- 不声称真人同意参与；
- 所有关键结论必须可以追溯到 Delegate。

只输出符合 schema 的严格 JSON。`;

const COLLABORATION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "summary", "consensus", "differences", "recommendedActions", "recommendedPeople",
  ],
  properties: {
    summary: { type: "string" },
    consensus: { type: "array", items: { type: "string" } },
    differences: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["topic", "perspectives"],
        properties: {
          topic: { type: "string" },
          perspectives: { type: "array", items: { type: "string" } },
        },
      },
    },
    recommendedActions: { type: "array", items: { type: "string" } },
    recommendedPeople: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["authorId", "reason"],
        properties: { authorId: { type: "string" }, reason: { type: "string" } },
      },
    },
  },
} as const;

function uniqueNonEmpty(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function strings(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function parseResult(value: unknown, delegates: DelegateOutput[]): CollaborationResult {
  if (!isRecord(value)
    || typeof value.summary !== "string"
    || !strings(value.consensus)
    || !Array.isArray(value.differences)
    || !strings(value.recommendedActions)
    || !Array.isArray(value.recommendedPeople)) {
    throw new Error("Moderator returned an invalid result");
  }

  const differences = value.differences.map((difference) => {
    if (!isRecord(difference)
      || typeof difference.topic !== "string"
      || !strings(difference.perspectives)) {
      throw new Error("Moderator returned an invalid difference");
    }
    return {
      topic: difference.topic.trim(),
      perspectives: uniqueNonEmpty(difference.perspectives),
    };
  }).filter((difference) => difference.topic && difference.perspectives.length > 0);

  const authorIds = new Set(delegates.map((delegate) => delegate.authorId));
  const recommendedPeople = value.recommendedPeople.flatMap((person) => {
    if (!isRecord(person)
      || typeof person.authorId !== "string"
      || typeof person.reason !== "string") {
      throw new Error("Moderator returned an invalid person recommendation");
    }
    const authorId = person.authorId.trim();
    const reason = person.reason.trim();
    return authorIds.has(authorId) && reason ? [{ authorId, reason }] : [];
  });

  return {
    summary: value.summary.trim(),
    consensus: uniqueNonEmpty(value.consensus),
    differences,
    recommendedActions: uniqueNonEmpty(value.recommendedActions),
    recommendedPeople,
  };
}

function promptFor(question: QuestionAnalysis, delegates: DelegateOutput[]): string {
  return JSON.stringify({
    question,
    delegates,
    traceabilityInstruction:
      "每项关键结论都要在文字中标明支持它的 Delegate authorId；不得使用输入之外的事实。",
  });
}

/** A deliberately minimal synthesis used only when structured generation fails. */
export function deterministicModeratorFallback(
  delegates: DelegateOutput[],
): CollaborationResult {
  const helpful = delegates.filter((delegate) => delegate.canHelp);
  const counts = new Map<string, number>();
  for (const delegate of helpful) {
    new Set(uniqueNonEmpty(delegate.keyPoints)).forEach((point) => {
      counts.set(point, (counts.get(point) ?? 0) + 1);
    });
  }

  const consensus = Array.from(counts)
    .filter(([, count]) => count >= 2)
    .map(([point]) => point);
  const keyPoints = delegates.flatMap((delegate) =>
    uniqueNonEmpty(delegate.keyPoints).map((point) => `${delegate.authorId}: ${point}`));
  const limitations = delegates.flatMap((delegate) =>
    uniqueNonEmpty(delegate.limitations).map((item) => `${delegate.authorId}: ${item}`));

  const differences: CollaborationResult["differences"] = [];
  if (keyPoints.length > 0) differences.push({ topic: "Delegate keyPoints", perspectives: keyPoints });
  if (limitations.length > 0) {
    differences.push({ topic: "Delegate limitations", perspectives: limitations });
  }

  const statuses = delegates.map((delegate) =>
    `${delegate.authorId} (${delegate.canHelp ? "canHelp" : "cannotHelp"})`);
  return {
    summary: statuses.length > 0
      ? `成功收到 ${delegates.length} 个 Delegate：${statuses.join("、")}。`
      : "未收到成功的 Delegate 输出。",
    consensus,
    differences,
    recommendedActions: consensus,
    recommendedPeople: [],
  };
}

export async function runModerator(
  question: QuestionAnalysis,
  delegates: DelegateOutput[],
): Promise<CollaborationResult> {
  try {
    const result = await generateStructured<unknown>({
      system: MODERATOR_SYSTEM_PROMPT,
      prompt: promptFor(question, delegates),
      schema: COLLABORATION_SCHEMA,
    });
    return parseResult(result, delegates);
  } catch {
    return deterministicModeratorFallback(delegates);
  }
}

export const moderateCollaboration = runModerator;
