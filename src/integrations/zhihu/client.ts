import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import demoSearchData from "@/demo-data/zhihu-search.json";
import type { ZhihuEvidence } from "./types";

const execFileAsync = promisify(execFile);
const DEFAULT_RESULT_COUNT = 10;
const MAX_RESULT_COUNT = 10;
const OFFICIAL_SKILL_RUNNER = path.join(
  process.cwd(),
  ".codex",
  "skills",
  "zhihu",
  "scripts",
  "run.sh"
);

type RawRecord = Record<string, unknown>;

function isDemoMode(): boolean {
  return process.env.DEMO_MODE?.trim().toLowerCase() === "true";
}

function asRecord(value: unknown): RawRecord | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as RawRecord)
    : undefined;
}

function firstString(record: RawRecord, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
}

function optionalNumber(record: RawRecord, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }
  return undefined;
}

function normalizeContentType(value: string): ZhihuEvidence["contentType"] {
  const normalized = value.toLowerCase();
  if (normalized.includes("answer") || normalized.includes("回答")) return "answer";
  if (normalized.includes("article") || normalized.includes("文章")) return "article";
  return value ? "other" : undefined;
}

function normalizeEvidence(value: unknown): ZhihuEvidence {
  const record = asRecord(value) ?? {};
  const votes = optionalNumber(record, ["VoteUpCount", "voteUpCount", "votes", "赞同数"]);
  const comments = optionalNumber(record, ["CommentCount", "commentCount", "comments", "评论数"]);
  const evidence: ZhihuEvidence = {
    contentId: firstString(record, ["ContentID", "contentId", "id"]),
    title: firstString(record, ["Title", "title"]),
    excerpt: firstString(record, ["ContentText", "contentText", "excerpt", "summary"]),
    authorId: firstString(record, ["AuthorID", "AuthorId", "authorId"]),
    authorName: firstString(record, ["AuthorName", "authorName"]) || "知乎用户"
  };

  const url = firstString(record, ["Url", "URL", "url"]);
  const contentType = normalizeContentType(firstString(record, ["ContentType", "contentType"]));
  if (url) evidence.url = url;
  if (contentType) evidence.contentType = contentType;
  if (votes !== undefined || comments !== undefined) {
    evidence.metrics = { ...(votes !== undefined ? { votes } : {}), ...(comments !== undefined ? { comments } : {}) };
  }
  return evidence;
}

function normalizeResults(value: unknown): ZhihuEvidence[] {
  const root = asRecord(value);
  const data = asRecord(root?.Data ?? root?.data);
  const items = data?.Items ?? data?.items ?? root?.Items ?? root?.items ?? value;
  return Array.isArray(items) ? items.map(normalizeEvidence) : [];
}

function parseCliOutput(stdout: string): unknown {
  const trimmed = stdout.trim();
  if (!trimmed) throw new Error("Official Zhihu Skill returned empty output");
  try {
    return JSON.parse(trimmed);
  } catch {
    throw new Error("Official Zhihu Skill returned invalid JSON");
  }
}

function normalizeQuery(query: string): string {
  const normalized = query.trim();
  if (!normalized) throw new Error("Zhihu search query must not be empty");
  return normalized;
}

async function searchLive(query: string): Promise<ZhihuEvidence[]> {
  const runner = process.env.ZHIHU_SKILL_RUNNER?.trim() || OFFICIAL_SKILL_RUNNER;
  console.info(`[Zhihu] Live Mode: calling official Skill for "${query}"`);
  const { stdout, stderr } = await execFileAsync(
    runner,
    ["search", "zhihu", "--query", query, "--count", String(DEFAULT_RESULT_COUNT)],
    { cwd: process.cwd(), maxBuffer: 1024 * 1024 }
  );
  if (stderr.trim()) console.warn(`[Zhihu] Official Skill warning: ${stderr.trim()}`);
  const results = normalizeResults(parseCliOutput(stdout)).slice(0, MAX_RESULT_COUNT);
  console.info(`[Zhihu] Live Mode: normalized ${results.length} result(s)`);
  return results;
}

function searchDemo(query: string): ZhihuEvidence[] {
  const results = normalizeResults(demoSearchData);
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const matchingResults = results.filter((result) => {
    const searchable = `${result.title} ${result.excerpt}`.toLowerCase();
    return terms.length === 0 || terms.some((term) => searchable.includes(term));
  });
  const selected = (matchingResults.length > 0 ? matchingResults : results).slice(0, MAX_RESULT_COUNT);
  console.info(`[Zhihu] Demo Mode: normalized ${selected.length} result(s) for "${query}"`);
  return selected;
}

export async function searchZhihu(query: string): Promise<ZhihuEvidence[]> {
  let normalizedQuery: string;
  try {
    normalizedQuery = normalizeQuery(query);
  } catch (error) {
    console.error(`[Zhihu] Invalid query: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }

  if (isDemoMode()) return searchDemo(normalizedQuery);

  try {
    return await searchLive(normalizedQuery);
  } catch (error) {
    console.error(`[Zhihu] Live Mode failed; returning no results: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}
