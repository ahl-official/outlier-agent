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

export type BrandTarget = 'AHL' | 'Alchemane';

export interface SOPTaxonomy {
  outlierTier: 'Mega Outlier (10x+)' | 'Real Outlier (5x+)' | 'Notable Outlier (3x+)' | 'Emerging (<3x)';
  topicTag: 'Transformation' | 'Taboo & Social Anxiety' | 'Myth-Busting' | 'Celebrity Moment' | 'Cost & Quality' | 'Maintenance & Routine';
  formatTag: 'Before/After Reveal' | 'Talking Head Breakdown' | 'Reaction / Client Story' | 'Text-Led Reel';
  primaryEmotion: 'Curiosity' | 'Shock / Surprise' | 'Relief' | 'Aspiration';
  winningElement: 'Hook Mechanism' | 'Visual Format' | 'Core Topic';
  adaptationPlays: {
    winnerSummary: string;
    ahlAngle: string;
    ahlTone: string;
    ahlTabooCheck: string;
    alchemaneAngle: string;
    alchemaneTone: string;
    alchemaneTabooCheck: string;
  };
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
  viewToFollowerRatio?: number; // views / creator.subscriberOrFollowerCount (Viral Reach Ratio)
  outlierScore: number;      // composite 0-100 score
  matchedKeyword: string;
  formatType?: 'face-cam' | 'before-after' | 'transformation' | 'text-overlay' | 'pov' | 'unknown';
  whyOutlier: string;
  musicOrAudio?: string;
  isShortOrReel: boolean;
  tags?: string[];
  sopTaxonomy?: SOPTaxonomy;
  videoUrl?: string;
  mediaUrls?: string[];
  timeWindow?: '48h' | '4d' | '6d';
}

export interface RealComment {
  id: string;
  author: string;
  authorProfileImageUrl?: string;
  text: string;
  likeCount: number;
  publishedAt: string;
}

export interface ExtractedVideoFrame {
  index: number;
  timestamp: string;
  dataUrl: string;
  label?: string;
  visualTrigger?: string;
  retentionScore?: number;
}

export interface AIAgentAudit {
  status: 'ai_analyzed' | 'heuristic_engine' | 'ffmpeg_multimodal_analyzed';
  agentModel?: string;
  systemPrompt?: string;
  winningElement?: string;
  theOneOutlierThing?: string;
  framesExtractedCount?: number;
  extractedFrames?: ExtractedVideoFrame[];
  frameHighlights?: {
    frameIndex: number;
    timestamp: string;
    visualTrigger: string;
    retentionScore: number;
  }[];
  rawInsights?: string;
  timestamp: string;
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

  deepVisualAnalysis?: {
    winningVisualHook: {
      whatIsShown: string;
      cameraAngleAndFraming: string;
      exactTiming: string;
      howTheyUsedIt: string;
      whyItStopsTheScroll: string;
    };
    audioAndMusicStrategy: {
      trackName: string;
      audioType: 'Trending Viral Audio' | 'Original Voiceover + BGM' | 'Tactile ASMR Sound Design' | 'Meme Audio Loop';
      syncMomentWithVisuals: string;
      trendingStatus: string;
      soundRecommendationForBrand: string;
    };
    frameByFrameTimeline: {
      timestamp: string;
      phase: string;
      visualAction: string;
      cameraFraming: string;
      soundSync: string;
      whyItWorked: string;
    }[];
  };

  strategistVerdict?: {
    executiveVerdict: string;
    theUnfairAdvantage: string;
    psychologicalTrigger: string;
    viralScoreOut100: number;
    remakePlaybook: {
      exactOpeningShot: string;
      pacingRule: string;
      mustKeepVisuals: string[];
      whatToChangeForBrand: string[];
      callToActionScript: string;
    };
  };

  aiAgentAudit?: AIAgentAudit;

  sopTaxonomy?: SOPTaxonomy;

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
  minViews?: number;
  minFollowers?: number;
  minFollowerRatio?: number;
}

