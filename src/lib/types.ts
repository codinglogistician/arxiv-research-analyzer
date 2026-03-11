// Types for arXiv Research Tool

export interface ArxivSearchResult {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  pdfUrl: string;
  arxivUrl: string;
  publishedDate: string;
  summary?: string;
}

export interface ResearchSessionInput {
  topic: string;
  focusArea: string;
  maxArticles?: number;
}

export interface ArticleAnalysis {
  articleId: string;
  relevanceScore: number;
  keyPoints: string[];
  methodology?: string;
  findings?: string[];
}

export interface ResearchAnalysis {
  sessionId: string;
  summary: string;
  keyFindings: string[];
  methodology: string;
  conclusions: string;
  recommendations: string;
  articleAnalyses: ArticleAnalysis[];
}

export interface SessionStatus {
  id: string;
  status: 'pending' | 'searching' | 'analyzing' | 'completed' | 'error';
  progress: number;
  message: string;
  articlesCount?: number;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
