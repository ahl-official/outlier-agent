import { OutlierCandidate } from '../types';

export interface ScoreBreakdown {
  multiplierScore: number; // 0 - 50 points
  freshnessScore: number;  // 0 - 20 points
  engagementScore: number; // 0 - 15 points
  shootabilityScore: number; // 0 - 15 points
  totalScore: number;      // 0 - 100
  whyOutlier: string;
}

/**
 * Calculates a robust outlier multiplier and 0-100 score.
 */
export function calculateOutlierScore(params: {
  viewCount: number;
  medianViews: number;
  publishedAt: string;
  likeCount: number;
  commentCount: number;
  titleOrCaption: string;
}): ScoreBreakdown {
  const { viewCount, medianViews, publishedAt, likeCount, commentCount, titleOrCaption } = params;

  // 1. Multiplier (Views / Creator Median)
  const safeMedian = Math.max(medianViews || 0, 100);
  const rawMultiplier = viewCount / safeMedian;
  const multiplier = Math.round(rawMultiplier * 10) / 10;

  // Multiplier score (max 50 points)
  // Multipliers >= 10x get top points; 2x is minimum notable outlier
  let multiplierScore = 0;
  if (multiplier >= 20) {
    multiplierScore = 50;
  } else if (multiplier >= 10) {
    multiplierScore = 42 + (multiplier - 10) * 0.8;
  } else if (multiplier >= 5) {
    multiplierScore = 30 + (multiplier - 5) * 2.4;
  } else if (multiplier >= 2) {
    multiplierScore = 15 + (multiplier - 2) * 5;
  } else if (multiplier >= 1.2) {
    multiplierScore = 5 + (multiplier - 1.2) * 12.5;
  }

  // 2. Freshness Score (max 20 points)
  // Posted in last 7 days = full points, degrading after 14 days
  const publishDate = new Date(publishedAt);
  const now = new Date();
  const daysOld = Math.max(0, (now.getTime() - publishDate.getTime()) / (1000 * 60 * 60 * 24));
  
  let freshnessScore = 0;
  if (daysOld <= 3) {
    freshnessScore = 20;
  } else if (daysOld <= 7) {
    freshnessScore = 18 - (daysOld - 3) * 1.5;
  } else if (daysOld <= 14) {
    freshnessScore = 12 - (daysOld - 7) * 1.0;
  } else if (daysOld <= 30) {
    freshnessScore = 5;
  } else {
    freshnessScore = 2;
  }

  // 3. Engagement Score (max 15 points)
  // High comments indicate buyer interest ("where can I get this?", "price?", "is it real?")
  const engagementRatio = viewCount > 0 ? (likeCount + commentCount * 3) / viewCount : 0;
  let engagementScore = 0;
  if (engagementRatio >= 0.08) {
    engagementScore = 15;
  } else if (engagementRatio >= 0.04) {
    engagementScore = 10;
  } else if (engagementRatio >= 0.02) {
    engagementScore = 6;
  } else {
    engagementScore = 3;
  }

  // High comment ratio bonus (buying intent)
  const commentRatio = viewCount > 0 ? commentCount / viewCount : 0;
  if (commentRatio > 0.005) {
    engagementScore = Math.min(15, engagementScore + 3);
  }

  // 4. Shootability & Format Hint (max 15 points)
  const lowerText = (titleOrCaption || '').toLowerCase();
  let shootabilityScore = 8; // baseline

  if (
    lowerText.includes('transformation') ||
    lowerText.includes('before') ||
    lowerText.includes('after') ||
    lowerText.includes('lagwane') ||
    lowerText.includes('fitting')
  ) {
    shootabilityScore += 5; // high-converting B/A
  }

  if (
    lowerText.includes('cost') ||
    lowerText.includes('price') ||
    lowerText.includes('truth') ||
    lowerText.includes('myth') ||
    lowerText.includes('vs')
  ) {
    shootabilityScore += 4; // great hook structure
  }

  shootabilityScore = Math.min(15, shootabilityScore);

  const totalScore = Math.min(100, Math.round(multiplierScore + freshnessScore + engagementScore + shootabilityScore));

  // Synthesize concise reason
  let reason = '';
  if (multiplier >= 5) {
    reason = `${multiplier}x creator baseline (${viewCount.toLocaleString()} vs ~${safeMedian.toLocaleString()} median)`;
  } else if (daysOld <= 5) {
    reason = `Fresh breakout (${Math.round(daysOld)}d old) at ${multiplier}x baseline with strong velocity`;
  } else {
    reason = `${multiplier}x creator views with active comment engagement`;
  }

  return {
    multiplierScore,
    freshnessScore,
    engagementScore,
    shootabilityScore,
    totalScore,
    whyOutlier: reason
  };
}

/**
 * Filter & sort candidates by outlier ranking
 */
export function rankOutlierCandidates(candidates: OutlierCandidate[]): OutlierCandidate[] {
  return [...candidates].sort((a, b) => b.outlierScore - a.outlierScore);
}
