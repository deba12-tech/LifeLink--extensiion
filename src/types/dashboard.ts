// src/types/dashboard.ts
export interface StatItem {
  title: string;
  value: number | string;
  icon: string; // Lucide icon name
}

export interface CategoryItem {
  name: string;
  value: number;
}

export interface AttentionFlowItem {
  time: string;
  event: string;
}

export interface ReceiptItem {
  site: string;
  amount: string;
  date: string;
  icon: string; // Lucide icon name
}

export interface ContinueItem {
  title: string;
  thumbnail: string; // path to image in assets
}

export interface IntelligenceItem {
  summary: string;
  icon: string; // Lucide icon name
}

export interface DashboardData {
  focusScore: number;
  stats: StatItem[];
  categories: CategoryItem[];
  categoryBreakdown: { category: string; time: number }[];
  attentionFlow: AttentionFlowItem[];
  receipt: ReceiptItem;
  continue: ContinueItem;
  intelligence: IntelligenceItem;
}

export interface CategoryRule {
  id: string;
  domain: string;
  category: string;
}

export interface AppSettings {
  gentleAwareness: boolean;
  respectIdle: boolean;
  sensitiveProtection: boolean;
  notifications: boolean;
  theme: string;
  ignoredSites: string[];
  categoryRules: CategoryRule[];
}

export interface TabSession {
  id: string;
  timestamp: string;
  tabsCount: number;
  tabs: { title: string; url: string }[];
}

