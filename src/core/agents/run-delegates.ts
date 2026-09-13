import { MAX_DELEGATES } from "../../config/limits.ts";
import type { DelegateOutput } from "../../types/contracts.ts";
import type { QuestionAnalysis } from "../question/types.ts";
import type { Candidate } from "../ranking/aggregate.ts";
import { runKnowledgeDelegate } from "./knowledge-delegate.ts";

export interface DelegateMetrics {
  delegateCount: number;
  successfulCount: number;
  failedCount: number;
  durationMs: number;
}

export interface DelegateError {
  authorId: string;
  message: string;
}

export interface DelegateRunResult {
  outputs: DelegateOutput[];
  errors: DelegateError[];
  metrics: DelegateMetrics;
}

function errorMessage(reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason);
}

export async function runDelegates(
  question: QuestionAnalysis,
  candidates: Candidate[],
): Promise<DelegateRunResult> {
  const startedAt = Date.now();
  const selected = candidates.slice(0, MAX_DELEGATES);
  const settled = await Promise.allSettled(
    selected.map((candidate) => runKnowledgeDelegate(question, candidate)),
  );
  const outputs: DelegateOutput[] = [];
  const errors: DelegateError[] = [];

  settled.forEach((result, index) => {
    if (result.status === "fulfilled") {
      outputs.push(result.value);
      return;
    }
    errors.push({
      authorId: selected[index].authorId,
      message: `Knowledge Delegate failed: ${errorMessage(result.reason)}`,
    });
  });

  return {
    outputs,
    errors,
    metrics: {
      delegateCount: selected.length,
      successfulCount: outputs.length,
      failedCount: errors.length,
      durationMs: Date.now() - startedAt,
    },
  };
}

export const runKnowledgeDelegates = runDelegates;
