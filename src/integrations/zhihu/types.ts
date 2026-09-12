export interface ZhihuSearchItem {
  title: string;
  contentText?: string;
  url?: string;
  contentType?: string;
  authorName?: string;
  authorAvatar?: string;
  rankingScore?: number;
}

export interface ZhihuSearchResponse {
  hasMore: boolean;
  searchHashId: string;
  items: ZhihuSearchItem[];
  emptyReason?: string;
}

export interface ZhihuSearchQuery {
  query: string;
  limit?: number;
}
