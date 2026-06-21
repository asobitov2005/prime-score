export type LandingFeaturedTest = {
  id: string;
  slug: string;
  title: string;
  type: string;
  source: string;
  questionCount: number;
  estimatedMinutes: number;
  isPremiumLocked: boolean;
  createdAt: string;
};

export interface ReviewItem {
  id: string;
  name: string;
  band: string;
  text: string;
  date: string;
}
