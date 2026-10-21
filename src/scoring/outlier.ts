import { OutlierCandidate, SOPTaxonomy } from '../types';

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
  followerCount?: number;
}): ScoreBreakdown {
  const { viewCount, medianViews, publishedAt, likeCount, commentCount, titleOrCaption, followerCount } = params;

  // 1. Multiplier (Views / Creator Median)
  const safeMedian = Math.max(medianViews || 0, 100);
  const rawMultiplier = viewCount / safeMedian;
  const multiplier = Math.round(rawMultiplier * 10) / 10;

  // Multiplier score (max 50 points)
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

  // 1b. Follower Reach Multiplier (Views / Follower Count)
  // Reach ratio >= 2.5x is the standard outlier qualification threshold
  const safeFollowers = Math.max(followerCount || 0, 0);
  const followerRatio = safeFollowers > 0 ? Math.round((viewCount / safeFollowers) * 10) / 10 : 0;
  let followerBonus = 0;
  if (followerRatio >= 20) {
    followerBonus = 20; // Viral explosion beyond follower base
  } else if (followerRatio >= 10) {
    followerBonus = 16;
  } else if (followerRatio >= 5) {
    followerBonus = 12;
  } else if (followerRatio >= 2.5) {
    followerBonus = 8;
  } else if (followerRatio >= 1.0) {
    followerBonus = 2;
  } else if (followerRatio > 0 && followerRatio < 1.0) {
    followerBonus = -25; // Large account not even reaching its own follower count is NOT an outlier
  }

  // 2. Freshness Score (max 20 points)
  // Strictly rewards last 48 hours (<= 2 days)
  const publishDate = new Date(publishedAt);
  const now = new Date();
  const daysOld = Math.max(0, (now.getTime() - publishDate.getTime()) / (1000 * 60 * 60 * 24));
  
  let freshnessScore = 0;
  if (daysOld <= 2) {
    freshnessScore = 20; // Prime 48-hour viral window
  } else if (daysOld <= 4) {
    freshnessScore = 14;
  } else if (daysOld <= 7) {
    freshnessScore = 8;
  } else if (daysOld <= 14) {
    freshnessScore = 4;
  } else {
    freshnessScore = 1;
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

  const totalScore = Math.max(1, Math.min(100, Math.round(multiplierScore + freshnessScore + engagementScore + shootabilityScore + followerBonus)));

  // Synthesize concise reason
  let reason = '';
  if (followerRatio >= 3 && followerCount && followerCount > 0) {
    const formattedViews = viewCount >= 1000000 ? `${(viewCount / 1000000).toFixed(1)}M` : `${Math.round(viewCount / 1000)}k`;
    const formattedFollowers = followerCount >= 1000000 ? `${(followerCount / 1000000).toFixed(1)}M` : `${Math.round(followerCount / 1000)}k`;
    reason = `🚀 ${followerRatio}x Reach (${formattedViews} views on ${formattedFollowers} account) • ${multiplier}x baseline`;
  } else if (multiplier >= 5) {
    reason = `${multiplier}x creator baseline (${viewCount.toLocaleString()} vs ~${safeMedian.toLocaleString()} median)`;
  } else if (daysOld <= 5) {
    reason = `Fresh breakout (${Math.round(daysOld)}d old) at ${multiplier}x baseline with strong velocity`;
  } else {
    reason = `${multiplier}x creator views (${followerRatio > 0 ? followerRatio + 'x followers' : 'active engagement'})`;
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

/**
 * Derives SOP Taxonomy tags and brand adaptation plays for any outlier video
 */
export function deriveSOPTaxonomy(params: {
  title: string;
  caption?: string;
  multiplier: number;
  formatType?: string;
  likeCount?: number;
  commentCount?: number;
  viewCount?: number;
  followerCount?: number;
  viewToFollowerRatio?: number;
}): SOPTaxonomy {
  const { title, caption = '', multiplier, formatType, likeCount = 0, commentCount = 0, viewCount = 0, followerCount, viewToFollowerRatio } = params;
  const text = `${title} ${caption}`.toLowerCase();

  const reach = typeof viewToFollowerRatio === 'number'
    ? viewToFollowerRatio
    : (followerCount && followerCount > 0 && viewCount > 0 ? viewCount / followerCount : null);

  // 1. Tier based on BOTH Outlier Multiplier AND Follower Reach Ratio:
  // If a video has reach < 2.5x (views < 2.5x followers), it is NOT a true outlier
  let outlierTier: SOPTaxonomy['outlierTier'] = 'Emerging (<3x)';
  if (reach !== null && reach < 2.5) {
    outlierTier = 'Emerging (<3x)'; // Account audience view; not viral breakout
  } else if (multiplier >= 10 && (reach === null || reach >= 5.0)) {
    outlierTier = 'Mega Outlier (10x+)';
  } else if (multiplier >= 5 && (reach === null || reach >= 3.0)) {
    outlierTier = 'Real Outlier (5x+)';
  } else if (multiplier >= 3 && (reach === null || reach >= 2.5)) {
    outlierTier = 'Notable Outlier (3x+)';
  }

  // 2. Topic Tag: celebrity, myth-busting, transformation, taboo, cost/quality, maintenance
  let topicTag: SOPTaxonomy['topicTag'] = 'Transformation';
  if (
    text.includes('celebrity') ||
    text.includes('actor') ||
    text.includes('kapoor') ||
    text.includes('shahrukh') ||
    text.includes('khan') ||
    text.includes('cricketer') ||
    text.includes('dhoni') ||
    text.includes('bollywood')
  ) {
    topicTag = 'Celebrity Moment';
  } else if (
    text.includes('myth') ||
    text.includes('truth') ||
    text.includes('scam') ||
    text.includes('reality') ||
    text.includes('transplant vs') ||
    text.includes('side effect') ||
    text.includes('permanent') ||
    text.includes('vs')
  ) {
    topicTag = 'Myth-Busting';
  } else if (
    text.includes('shaadi') ||
    text.includes('rishta') ||
    text.includes('sharam') ||
    text.includes('confidence') ||
    text.includes('dating') ||
    text.includes('joke') ||
    text.includes('hiding') ||
    text.includes('baldness shame') ||
    text.includes('anxiety')
  ) {
    topicTag = 'Taboo & Social Anxiety';
  } else if (
    text.includes('cost') ||
    text.includes('price') ||
    text.includes('kitna') ||
    text.includes('budget') ||
    text.includes('expensive') ||
    text.includes('cheap')
  ) {
    topicTag = 'Cost & Quality';
  } else if (
    text.includes('washing') ||
    text.includes('maintenance') ||
    text.includes('glue') ||
    text.includes('tape') ||
    text.includes('cleaning') ||
    text.includes('service') ||
    text.includes('swimming') ||
    text.includes('gym')
  ) {
    topicTag = 'Maintenance & Routine';
  }

  // 3. Format Tag: before/after, talking head, reaction, text-led
  let formatTag: SOPTaxonomy['formatTag'] = 'Before/After Reveal';
  if (
    text.includes('story') ||
    text.includes('reaction') ||
    text.includes('client') ||
    text.includes('customer') ||
    text.includes('experience') ||
    text.includes('wife') ||
    text.includes('family')
  ) {
    formatTag = 'Reaction / Client Story';
  } else if (
    text.includes('pov') ||
    text.includes('text') ||
    text.includes('read caption') ||
    formatType === 'text-overlay'
  ) {
    formatTag = 'Text-Led Reel';
  } else if (
    text.includes('tips') ||
    text.includes('guide') ||
    text.includes('doctor') ||
    text.includes('expert') ||
    text.includes('reason') ||
    formatType === 'face-cam'
  ) {
    formatTag = 'Talking Head Breakdown';
  }

  // 4. Primary Emotion: curiosity, shock, relief, aspiration
  let primaryEmotion: SOPTaxonomy['primaryEmotion'] = 'Shock / Surprise';
  if (topicTag === 'Myth-Busting' || topicTag === 'Cost & Quality') {
    primaryEmotion = 'Curiosity';
  } else if (topicTag === 'Taboo & Social Anxiety') {
    primaryEmotion = 'Relief';
  } else if (text.includes('look') || text.includes('style') || text.includes('handsome') || text.includes('aesthetic') || text.includes('volume')) {
    primaryEmotion = 'Aspiration';
  }

  // 5. Winning Element (Hook Mechanism vs Visual Format vs Core Topic)
  const commentRate = viewCount > 0 ? (commentCount / viewCount) : 0;
  let winningElement: SOPTaxonomy['winningElement'] = 'Visual Format';
  let winnerSummary = '';

  if (commentRate > 0.005 || text.includes('vs') || text.includes('truth')) {
    winningElement = 'Hook Mechanism';
    winnerSummary = 'A winning hook provoked intense curiosity and audience debate. Reusable across completely different topics.';
  } else if (formatTag === 'Before/After Reveal' || text.includes('before') || text.includes('reveal') || text.includes('transformation')) {
    winningElement = 'Visual Format';
    winnerSummary = 'The visual transformation format (pacing + high-contrast before/after) drove massive watch time and algorithm retention.';
  } else {
    winningElement = 'Core Topic';
    winnerSummary = 'The core subject tapped into high latent anxiety or search demand. Needs a fresh angle if reshot for our brand.';
  }

  // 6. Brand Adaptation Plays (AHL vs Alchemane)
  let ahlAngle = '';
  let alchemaneAngle = '';

  if (topicTag === 'Celebrity Moment') {
    ahlAngle = 'Break down a male celebrity hairline transformation with bold confidence; show how high-grade lace systems deliver that exact undetectable hairline without surgical scarring.';
    alchemaneAngle = 'Analyze celebrity volume, red-carpet hair toppers, and extensions with warmth & elegance, demonstrating how discreet crown toppers achieve effortless red-carpet thickness.';
  } else if (topicTag === 'Myth-Busting') {
    ahlAngle = 'Directly tackle "Transplant vs Non-Surgical Patch" or "Will it fly off in wind/gym?". Show high-grip waterproof adhesion and zero recovery downtime.';
    alchemaneAngle = 'Debunk "Extensions damage thin female hair" by showcasing ultra-gentle, lightweight toppers specially engineered for diffuse crown thinning.';
  } else if (topicTag === 'Taboo & Social Anxiety') {
    ahlAngle = 'Shatter Indian male stigma around marriage/rishta & dating with hair loss. Position the hair system as modern grooming self-care (like designer eyewear or tailored suits).';
    alchemaneAngle = 'Normalize female crown thinning & widening partings with deep empathy. Restore peace of mind with feather-light, seamless silk-base toppers.';
  } else if (topicTag === 'Cost & Quality') {
    ahlAngle = 'Break down lifetime non-surgical patch maintenance vs expensive multiple failed surgeries. Emphasize transparent pricing and virgin human hair quality.';
    alchemaneAngle = 'Position premium 100% human hair toppers as an enduring luxury daily lifestyle upgrade for easy home styling.';
  } else {
    ahlAngle = 'High-contrast 7-second reveal: From severe receding hairline to sharp modern textured crop with zero visible lace.';
    alchemaneAngle = 'Crown-density before/after reveal: Instant natural parting density and bouncy volume in under 60 seconds.';
  }

  return {
    outlierTier,
    topicTag,
    formatTag,
    primaryEmotion,
    winningElement,
    adaptationPlays: {
      winnerSummary,
      ahlAngle,
      ahlTone: 'Bold, direct, masculine confidence, unapologetic taboo-busting.',
      ahlTabooCheck: 'Ensure the narrative directly clears Indian social hesitations (rishta, gym sweat, colleagues noticing).',
      alchemaneAngle,
      alchemaneTone: 'Warm, elegant, empathetic luxury salon aesthetic.',
      alchemaneTabooCheck: 'Keep tone gentle and respectful of female hair thinning sensitivity, emphasizing dignity and beauty.'
    }
  };
}
