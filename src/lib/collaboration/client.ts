import { runMockCollaboration } from "./mock-provider";
import type { CollaborationDemoResponse } from "./types";

export async function runExperienceCollaboration(question: string): Promise<CollaborationDemoResponse> {
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";
  if (demoMode) return runMockCollaboration(question);

  const response = await fetch("/api/collaboration", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question })
  });
  if (!response.ok) throw new Error("经验协作服务暂时不可用");
  return response.json() as Promise<CollaborationDemoResponse>;
}
