export interface QuestionInput {
  text: string;
  mode: "demo" | "official";
}

export interface QuestionAnalysis {
  originalQuestion: string;
  problem: string;
  goal: string;
  userBackground?: string;
  needs: string[];
  idealExpertTraits: string[];
  searchQueries: string[];
  requiresHumanExperience: boolean;
  confidence: number;
}

export interface QuestionTask {
  id: string;
  title: string;
  description: string;
  status: "pending" | "ready" | "complete";
}

export interface QuestionPlan {
  question: QuestionInput;
  tasks: QuestionTask[];
}
