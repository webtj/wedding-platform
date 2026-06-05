export interface AiUsageSummary {
  totalGenerations: number;
  successRate: number;
  avgLatencyMs: number;
  totalTokensUsed: number;
  periodStart: string;
  periodEnd: string;
}

export interface ProviderUsage {
  provider: string;
  count: number;
  percentage: number;
  avgLatencyMs: number;
  tokensUsed: number;
}

export interface MaterialTypeUsage {
  materialType: string;
  count: number;
  percentage: number;
  successRate: number;
}

export interface DailyUsage {
  date: string;
  generations: number;
  successes: number;
  failures: number;
  tokensUsed: number;
}

export interface FeedbackSummary {
  totalFeedback: number;
  positiveRate: number;
  negativeRate: number;
  topIssues: { issue: string; count: number }[];
}

export interface AiUsageMetrics {
  summary: AiUsageSummary;
  byProvider: ProviderUsage[];
  byMaterialType: MaterialTypeUsage[];
  dailyTrend: DailyUsage[];
  feedback: FeedbackSummary;
}
