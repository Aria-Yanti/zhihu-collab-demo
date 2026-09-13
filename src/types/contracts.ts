export interface RankedCandidate {
  authorId: string;
  authorName: string;
  fitScore: number;
  reason: string;
  evidenceIds: string[];
}

export interface DelegateOutput {
  authorId: string;
  canHelp: boolean;
  perspective: string;
  keyPoints: string[];
  limitations: string[];
  evidenceIds: string[];
  confidence: number;
}

export interface CollaborationResult {
  summary: string;
  consensus: string[];
  differences: {
    topic: string;
    perspectives: string[];
  }[];
  recommendedActions: string[];
  recommendedPeople: {
    authorId: string;
    reason: string;
  }[];
}

export interface WorkflowMetrics {
  llmCalls: number;
  queryCount: number;
  evidenceCount: number;
  candidateCount: number;
  delegateCount: number;
  durationMs: number;
}
