import type { WorkflowMetrics } from "@/types/contracts";

export type SourceKind = "public" | "confirmed" | "organized";
export type DisclosureMode = "named" | "anonymous" | "questioner-only";

export interface CollaborationDemoResponse {
  scenarioId: string;
  question: string;
  analysis: {
    publicKnowledge: string[];
    experienceGaps: string[];
    requiresHumanExperience: boolean;
  };
  search: { evidenceCount: number; candidateCount: number; confidence: "high" | "low" };
  practitioner: {
    name: string;
    label: string;
    initials: string;
    reasons: string[];
    evidence: { id: string; title: string; excerpt: string }[];
  } | null;
  questionCard: {
    background: string[];
    concerns: string[];
    attempted: string[];
    decisions: string[];
  };
  experienceCard: {
    relevantExperience: string[];
    publicView: string;
    needsConfirmation: string[];
  };
  alignment: { questionerAgent: string; practitionerAgent: string };
  confirmation: {
    questions: string[];
    newExperience: string;
    partial: boolean;
  };
  draft: { source: SourceKind; title: string; content: string }[];
  metrics: WorkflowMetrics;
}

export type CollaborationFailure = "no-gap" | "no-match";
