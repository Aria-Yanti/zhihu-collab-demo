import type { ZhihuSearchItem, ZhihuSearchQuery, ZhihuSearchResponse } from "./types";

const ZHIHU_API_BASE_URL = "https://developer.zhihu.com/api/v1";

function getAccessSecret(): string {
  const accessSecret = process.env.ZHIHU_ACCESS_SECRET;
  if (!accessSecret) {
    throw new Error("ZHIHU_ACCESS_SECRET is not configured");
  }
  return accessSecret;
}

function buildHeaders(): HeadersInit {
  return {
    ["Authorization"]: "Bearer " + getAccessSecret(),
    "X-Request-Timestamp": Math.floor(Date.now() / 1000).toString(),
    "Content-Type": "application/json"
  };
}

async function request<T>(path: string, params: URLSearchParams): Promise<T> {
  const response = await fetch(`${ZHIHU_API_BASE_URL}${path}?${params.toString()}`, {
    headers: buildHeaders(),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Zhihu API request failed: HTTP ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function searchZhihu(query: ZhihuSearchQuery): Promise<ZhihuSearchResponse> {
  const searchQuery = query.query.trim();
  if (!searchQuery) {
    throw new Error("Zhihu search query must not be empty");
  }

  const limit = Math.min(Math.max(query.limit ?? 10, 1), 10);
  const params = new URLSearchParams({
    Query: searchQuery,
    Count: limit.toString()
  });

  const response = await request<{
    Data?: {
      HasMore?: boolean;
      SearchHashId?: string;
      Items?: Array<{
        Title?: string;
        ContentText?: string;
        Url?: string;
        ContentType?: string;
        AuthorName?: string;
        AuthorAvatar?: string;
        RankingScore?: number;
      }>;
      EmptyReason?: string;
    };
  }>("/content/zhihu_search", params);

  const data = response.Data;
  const items: ZhihuSearchItem[] = (data?.Items ?? []).map((item) => ({
    title: item.Title ?? "",
    contentText: item.ContentText,
    url: item.Url,
    contentType: item.ContentType,
    authorName: item.AuthorName,
    authorAvatar: item.AuthorAvatar,
    rankingScore: item.RankingScore
  }));

  return {
    hasMore: data?.HasMore ?? false,
    searchHashId: data?.SearchHashId ?? "",
    items,
    emptyReason: data?.EmptyReason
  };
}
