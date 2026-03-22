export interface SEOAgentState {
  targetKeyword: string;
  sourceUrls: string[];
  researchData: string;
  currentDraft: string | null;
  seoFeedback: string | null;
  seoScore: number;
  isApproved: boolean;
  iterationCount: number;
}
