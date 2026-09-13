import type { QuestionAnalysis } from "../question/types";
import type { ZhihuEvidence } from "../../integrations/zhihu/types";
import { MAX_SEARCH_QUERIES } from "../../config/limits.ts";

export interface RetrievalResult {
  query: string;
  evidence: ZhihuEvidence[];
}

export interface RetrievalSummary {
  evidence: ZhihuEvidence[];
  queryCount: number;
  evidenceCount: number;
}

type SearchZhihu = (query: string) => Promise<ZhihuEvidence[]>;

async function defaultSearch(query: string): Promise<ZhihuEvidence[]> {
  const { searchZhihu } = await import("../../integrations/zhihu/client");
  return searchZhihu(query);
}

function evidenceKey(evidence: ZhihuEvidence): string {
  if (evidence.contentId.trim()) return `id:${evidence.contentId.trim()}`;
  if (evidence.url?.trim()) return `url:${evidence.url.trim()}`;

  return [
    evidence.authorId.trim(),
    evidence.title.trim().toLowerCase(),
    evidence.excerpt.trim().toLowerCase(),
  ].join("|");
}

export async function retrieveEvidence(
  analysis: QuestionAnalysis,
  search: SearchZhihu = defaultSearch,
): Promise<RetrievalSummary> {
  const queries = analysis.searchQueries
    .filter((query): query is string => typeof query === "string")
    .map((query) => query.trim())
    .filter(Boolean)
    .slice(0, MAX_SEARCH_QUERIES);
  const results: RetrievalResult[] = [];

  for (const query of queries) {
    try {
      const evidence = await search(query);
      results.push({ query, evidence: Array.isArray(evidence) ? evidence : [] });
    } catch (error) {
      console.error(`[Retrieval] Search failed for "${query}":`, error);
      results.push({ query, evidence: [] });
    }
  }

  const seen = new Set<string>();
  const evidence = results.flatMap((result) =>
    result.evidence.filter((item) => {
      const key = evidenceKey(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }),
  );

  return {
    evidence,
    queryCount: queries.length,
    evidenceCount: evidence.length,
  };
}

export const retrieve = retrieveEvidence;
