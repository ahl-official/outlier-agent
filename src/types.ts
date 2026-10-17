export type Platform = 'youtube' | 'instagram';

export interface CreatorStats {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  medianViews: number;
  sampleVideoCount?: number;
  subscriberOrFollowerCount?: number;
  profileUrl?: string;
  recentUploads?: {
    title: string;
    views: number;
    publishedAt?: string;
  }[];
}

export interface OutlierCandidate {
  id: string;
  platform: Platform;
  url: string;
  title: string;
  caption: string;
  thumbnailUrl: string;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount?: number;
  durationSeconds?: number;
  creator: CreatorStats;
  outlierMultiplier: number; // views / creator.medianViews
  outlierScore: number;      // composite 0-100 score
  matchedKeyword: string;
  formatType?: 'face-cam' | 'before-after' | 'transformation' | 'text-overlay' | 'pov' | 'unknown';
  whyOutlier: string;
  musicOrAudio?: string;
  isShortOrReel: boolean;
  tags?: string[];
}

export interface RealComment {
  id: string;
  author: string;
  authorProfileImageUrl?: string;
  text: string;
  likeCount: number;
  publishedAt: string;
}

export interface DetailedOutlierBreakdown {
  id: string;
  candidateId: string;
  candidateUrl: string;
  platform: Platform;
  title: string;
  caption: string;
  thumbnailUrl: string;
  durationSeconds?: number;
  publishedAt: string;
  daysActive: number;

  creator: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    profileUrl?: string;
    subscribersOrFollowers?: number;
    medianViews: number;
    recentUploads?: {
      title: string;
      views: number;
      publishedAt?: string;
    }[];
  };

  metrics: {
    viewCount: number;
    likeCount: number;
    commentCount: number;
    outlierMultiplier: number;
    engagementRatePercent: number; // (likes + comments) / views * 100
    commentRatePercent: number;    // comments / views * 100
    velocityViewsPerDay: number;   // views / daysActive
    viralityTier: 'Mega Outlier (>10x)' | 'Breakout Outlier (5x-10x)' | 'Strong Performer (2x-5x)' | 'Baseline Performer (<2x)';
  };

  contentAnalysis: {
    coreTopic: string;
    hookHeadline: string;
    hookMechanism: string;
    formatType: string;
    extractedHashtags: string[];
    audioOrMusicTrack?: string;
    keyAnglesCovered: string[];
  };

  audienceVoice: {
    realComments: RealComment[];
    inquiryThemes: {
      category: string;
      sampleText: string;
      sentiment: 'question' | 'critique' | 'praise' | 'doubt';
    }[];
  };

  whyOutlierDiagnosis: {
    primaryDriver: string;
    retentionHookReason: string;
    engagementTrigger: string;
    algorithmSignal: string;
  };

  createdAt: string;
}

// Alias for backwards compatibility if needed
export type BreakdownAnalysis = DetailedOutlierBreakdown;

export type BoardStatus = 'saved' | 'analyzing' | 'benchmarked' | 'actionable' | 'new' | 'approved' | 'shot' | 'posted';

export interface BoardItem {
  id: string;
  candidate: OutlierCandidate;
  breakdown?: DetailedOutlierBreakdown;
  status: BoardStatus;
  assignedTo?: string;
  notes?: string;
  tags?: string[];
  scheduledShootDate?: string;
  postedUrl?: string;
  addedAt: string;
  updatedAt: string;
}

export interface RadarSearchParams {
  keywords?: string[];
  platforms?: Platform[];
  minMultiplier?: number;
  maxDaysOld?: number;
  limitPerKeyword?: number;
}
