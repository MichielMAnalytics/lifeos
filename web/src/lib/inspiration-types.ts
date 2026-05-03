export type InspirationIdea = {
  id: string;
  title: string;
  category: string;
  source_commits?: string[];
  description: string;
  rationale?: string;
  lifeai_relevance?: string;
};

export type InspirationData = {
  generated_at: string;
  diff_period: { from: string; to: string };
  ideas: InspirationIdea[];
};
