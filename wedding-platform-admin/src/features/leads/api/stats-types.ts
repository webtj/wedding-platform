export interface FunnelItem {
  status: string;
  count: number;
}

export interface SourceItem {
  source: string;
  count: number;
}

export interface TimelineItem {
  date: string;
  total: number;
  won: number;
}

export interface ConversionRate {
  total: number;
  won: number;
  rate: number;
}

export interface AvgConversionTime {
  avgDays: number;
  sampleSize: number;
}

export interface StatsOverview {
  funnel: FunnelItem[];
  bySource: SourceItem[];
  conversionRate: ConversionRate;
  avgConversionTime: AvgConversionTime;
}

export interface StatsDateRange {
  startDate?: string;
  endDate?: string;
}
