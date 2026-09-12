export interface QuestionInput {
  text: string;
  mode: "demo" | "official";
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
