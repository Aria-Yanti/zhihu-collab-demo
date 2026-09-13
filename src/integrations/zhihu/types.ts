export interface ZhihuEvidence {
  contentId: string;
  title: string;
  excerpt: string;
  authorId: string;
  authorName: string;
  url?: string;
  contentType?: "answer" | "article" | "other";
  metrics?: {
    votes?: number;
    comments?: number;
  };
}
