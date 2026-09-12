import type { QuestionPlan } from "./types";

export function createDemoPlan(question: string): QuestionPlan {
  const text = question.trim();

  return {
    question: { text, mode: "demo" },
    tasks: [
      {
        id: "clarify",
        title: "明确问题范围",
        description: `提取“${text}”中的核心概念与判断标准。`,
        status: "complete"
      },
      {
        id: "retrieve",
        title: "整理相关资料",
        description: "为后续知乎内容检索准备关键词和来源范围。",
        status: "ready"
      },
      {
        id: "compare",
        title: "比较不同观点",
        description: "从相关性、证据和互补性三个维度整理候选观点。",
        status: "pending"
      }
    ]
  };
}
