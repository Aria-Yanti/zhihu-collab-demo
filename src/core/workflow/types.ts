import type { QuestionPlan } from "@/core/question/types";

export type WorkflowStage = "question" | "retrieval" | "ranking" | "summary";

export interface WorkflowState {
  runId: string;
  stage: WorkflowStage;
  plan: QuestionPlan;
  error?: string;
}
