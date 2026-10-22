'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Radar, 
  Flame, 
  Sparkles, 
  Kanban, 
  Play, 
  ExternalLink, 
  Plus, 
  X,
  Clock, 
  Eye, 
  ThumbsUp, 
  MessageSquare, 
  Search, 
  ChevronRight, 
  CheckCircle,
  Check,
  Video,
  Layers,
  Trash2,
  RefreshCw,
  TrendingUp,
  FileText,
  Bookmark,
  Share2,
  BarChart3,
  Hash,
  Music,
  User,
  HelpCircle,
  AlertCircle,
  SlidersHorizontal,
  Copy,
  Send,
  Phone,
  FileSpreadsheet,
  Users,
  AlertTriangle,
  Settings,
  Edit3,
  UserPlus
} from 'lucide-react';
import { OutlierCandidate, DetailedOutlierBreakdown, BoardItem, BoardStatus } from '@/types';
import { 
  DEFAULT_RADAR_KEYWORDS, 
  KeywordGroup, 
  AHL_CATEGORY_GROUPS, 
  ALCHEMANE_CATEGORY_GROUPS 
} from '@/keywords';

function WhatsAppIcon({ size = 16, color = '#25D366', style }: { size?: number; color?: string; style?: React.CSSProperties }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    >
      <path
        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.999-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.887 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c-.001 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.455 5.711 1.456h.005c6.554 0 11.89-5.336 11.893-11.893a11.82 11.82 0 00-3.48-8.411z"
        fill={color}
      />
    </svg>
  );
}

function buildWhatsAppMessage(
  breakdown?: DetailedOutlierBreakdown | null,
  candidate?: OutlierCandidate | null,
  note?: string,
  brand?: 'AHL' | 'Alchemane'
): string {
  const title = breakdown?.title || candidate?.title || 'Viral Hair Transformation Reel';
  const url = breakdown?.candidateUrl || candidate?.url || '';
  const platform = (breakdown?.platform || candidate?.platform) === 'youtube' ? 'YouTube Short / Video' : 'Instagram Reel';
  
  const creatorName = breakdown?.creator?.displayName || breakdown?.creator?.username || candidate?.creator?.displayName || candidate?.creator?.username || 'Creator';
  const username = breakdown?.creator?.username || candidate?.creator?.username || '';
  const followers = breakdown?.creator?.subscribersOrFollowers || candidate?.creator?.subscriberOrFollowerCount;
  const followerStr = followers 
    ? (followers >= 100000 ? `${(followers / 100000).toFixed(1)} Lakh` : `${(followers / 1000).toFixed(0)}k`) 
    : '';

  const views = breakdown?.metrics?.viewCount ?? candidate?.viewCount;
  const viewsStr = views ? views.toLocaleString() : 'N/A';
  const medianViews = breakdown?.creator?.medianViews ?? candidate?.creator?.medianViews;
  const medianStr = medianViews ? `~${medianViews.toLocaleString()}` : 'baseline';
  const multiplier = breakdown?.metrics?.outlierMultiplier ?? candidate?.outlierMultiplier;
  const viralityTier = breakdown?.metrics?.viralityTier || (multiplier && multiplier >= 10 ? 'Mega Outlier (10x+)' : multiplier && multiplier >= 5 ? 'Real Outlier (5x+)' : 'Notable Outlier (3x+)');
  
  const reachRatio = candidate?.viewToFollowerRatio || (views && followers ? Number((views / followers).toFixed(1)) : null);
  const engagement = breakdown?.metrics?.engagementRatePercent;
  const likes = breakdown?.metrics?.likeCount ?? candidate?.likeCount;
  const comments = breakdown?.metrics?.commentCount ?? candidate?.commentCount;
  const velocity = breakdown?.metrics?.velocityViewsPerDay;

  // Reasons & Hook Mechanics
  const hookHeadline = breakdown?.contentAnalysis?.hookHeadline || '';
  const hookMechanism = breakdown?.contentAnalysis?.hookMechanism || '';
  const visualHook = breakdown?.deepVisualAnalysis?.winningVisualHook?.whatIsShown || '';
  const scrollStopper = breakdown?.deepVisualAnalysis?.winningVisualHook?.whyItStopsTheScroll || '';
  const psychTrigger = breakdown?.strategistVerdict?.psychologicalTrigger || breakdown?.whyOutlierDiagnosis?.engagementTrigger || '';
  const retentionDriver = breakdown?.whyOutlierDiagnosis?.retentionHookReason || breakdown?.whyOutlierDiagnosis?.primaryDriver || candidate?.whyOutlier || '';
  const oneOutlierThing = breakdown?.aiAgentAudit?.theOneOutlierThing || breakdown?.strategistVerdict?.theUnfairAdvantage || '';
  const brandAngle = brand === 'Alchemane' ? 'Alchemane Hair Extensions' : 'American Hairline (AHL)';

  // Audio & Soundtrack Strategy Details
  const audioStrategy = breakdown?.deepVisualAnalysis?.audioAndMusicStrategy;
  const audioTrack = audioStrategy?.trackName || breakdown?.contentAnalysis?.audioOrMusicTrack || candidate?.musicOrAudio || '';
  const audioType = audioStrategy?.audioType || '';
  const audioSync = audioStrategy?.syncMomentWithVisuals || '';
  const audioImpact = audioStrategy?.trendingStatus || '';
  const audioRec = audioStrategy?.soundRecommendationForBrand || '';

  let msg = `🔥 *OUTLIER VIDEO INTELLIGENCE REPORT* 🔥\n`;
  msg += `_Reverse-engineered for Sir & Creative Leadership_\n`;

  if (note && note.trim()) {
    msg += `\n💬 *NOTE FOR SIR:* ${note.trim()}\n`;
  }

  msg += `\n📹 *Title:* ${title}\n`;
  if (url) {
    msg += `🔗 *Video Link:* ${url}\n`;
  }
  msg += `📱 *Platform:* ${platform}\n`;
  msg += `👤 *Creator:* ${creatorName}${username ? ` (@${username})` : ''}${followerStr ? ` • ${followerStr} followers` : ''}\n`;
  msg += `🏷️ *Target Brand:* ${brandAngle}\n`;

  msg += `\n📊 *WHY THIS IS A PROVEN OUTLIER:*\n`;
  if (multiplier) {
    msg += `• *Outlier Multiplier:* ${multiplier}x normal performance (${viralityTier})\n`;
  }
  msg += `• *Total Views:* ${viewsStr} (vs creator typical: ${medianStr})\n`;
  if (reachRatio) {
    msg += `• *Viral Reach Ratio:* 🚀 ${reachRatio}x follower base\n`;
  }
  if (engagement !== undefined) {
    msg += `• *Engagement Rate:* ${engagement}%`;
    if (likes !== undefined && comments !== undefined) {
      msg += ` (${likes.toLocaleString()} likes • ${comments.toLocaleString()} comments)`;
    }
    msg += `\n`;
  }
  if (velocity) {
    msg += `• *Velocity:* ~${velocity.toLocaleString()} views/day\n`;
  }

  msg += `\n🎯 *SECRET VIRAL HOOK & MECHANICS:*\n`;
  if (visualHook || hookHeadline) {
    msg += `• *Visual Hook:* ${visualHook || hookHeadline}\n`;
  }
  if (scrollStopper || hookMechanism) {
    msg += `• *Scroll-Stopper Secret:* ${scrollStopper || hookMechanism}\n`;
  }
  if (psychTrigger) {
    msg += `• *Psychological Trigger:* ${psychTrigger}\n`;
  }
  if (retentionDriver) {
    msg += `• *Retention Driver:* ${retentionDriver}\n`;
  }

  if (audioTrack || audioType || audioSync) {
    msg += `\n🎵 *AUDIO & SOUND STRATEGY:*\n`;
    msg += `• *Track / Sound:* ${audioTrack || 'Original Audio'}${audioType ? ` (${audioType})` : ''}\n`;
    if (audioSync) {
      msg += `• *Visual Sync Moment:* ${audioSync}\n`;
    }
    if (audioImpact) {
      msg += `• *Audio Virality:* ${audioImpact}\n`;
    }
    if (audioRec) {
      msg += `• *Brand Audio Play:* ${audioRec}\n`;
    }
  }

  if (oneOutlierThing) {
    msg += `\n💡 *EXECUTIVE TAKEAWAY / SHOOT ANGLE:*\n${oneOutlierThing}\n`;
  }

  msg += `\n⚡ _Sent via AHL Outlier Intelligence Radar_ 🚀`;

  return msg;
}

function normalizeUrlClient(url: string): string {
  if (!url) return '';
  try {
    const raw = url.trim();
    const parsed = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
    if (parsed.hostname.includes('youtube.com') || parsed.hostname.includes('youtu.be')) {
      if (parsed.hostname.includes('youtu.be')) {
        const videoId = parsed.pathname.replace(/^\//, '').split('/')[0]?.split('?')[0];
        if (videoId) return `yt:${videoId}`;
      }
      if (parsed.pathname.includes('/shorts/')) {
        const shortId = parsed.pathname.split('/shorts/')[1]?.split('/')[0]?.split('?')[0];
        if (shortId) return `yt:${shortId}`;
      }
      const v = parsed.searchParams.get('v');
      if (v) return `yt:${v}`;
    }
    if (parsed.hostname.includes('instagram.com')) {
      const match = parsed.pathname.match(/\/(reel|p)\/([A-Za-z0-9_-]+)/);
      if (match && match[2]) return `ig:${match[2]}`;
    }
    return (parsed.origin + parsed.pathname).replace(/\/$/, '').toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<'radar' | 'breakdown' | 'board' | 'tracker'>('radar');

  // Radar state
  const [keywordList, setKeywordList] = useState<string[]>(DEFAULT_RADAR_KEYWORDS);
  const [selectedKeyword, setSelectedKeyword] = useState<string>(DEFAULT_RADAR_KEYWORDS[0]);
  const [categoryGroups, setCategoryGroups] = useState<KeywordGroup[]>(AHL_CATEGORY_GROUPS);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [customKeyword, setCustomKeyword] = useState<string>('');
  const [isAddingKeyword, setIsAddingKeyword] = useState<boolean>(false);
  const [newKeywordInput, setNewKeywordInput] = useState<string>('');
  const [selectedPlatform, setSelectedPlatform] = useState<'all' | 'youtube' | 'instagram'>('all');
  const [minMultiplier, setMinMultiplier] = useState<number>(0);
  const [minViews, setMinViews] = useState<number>(100_000); // 1 Lakh+ default
  const [minFollowers, setMinFollowers] = useState<number>(14_000); // >14k default
  const [minFollowerRatio, setMinFollowerRatio] = useState<number>(2.5); // Default >= 2.5x reach (views > 2.5x followers)
  const [radarCandidates, setRadarCandidates] = useState<OutlierCandidate[]>([]);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanMessage, setScanMessage] = useState<string>('');

  // Real-time client-side filtered candidates based on active Reach Ratio & View thresholds
  const filteredCandidates = useMemo(() => {
    return radarCandidates.filter((c) => {
      // 1. Follower reach ratio filter (Views / Followers or Subs)
      if (minFollowerRatio > 0) {
        const ratio = c.viewToFollowerRatio ?? (
          c.creator?.subscriberOrFollowerCount && c.creator.subscriberOrFollowerCount > 0
            ? c.viewCount / c.creator.subscriberOrFollowerCount
            : 0
        );
        if (ratio < minFollowerRatio) return false;
      }
      // 2. Minimum views threshold
      if (minViews > 0 && c.viewCount < minViews) return false;
      // 3. Minimum creator followers threshold
      if (minFollowers > 0 && (c.creator?.subscriberOrFollowerCount || 0) < minFollowers) return false;
      // 4. Minimum multiplier threshold
      if (minMultiplier > 0 && c.outlierMultiplier < minMultiplier) return false;
      return true;
    });
  }, [radarCandidates, minFollowerRatio, minViews, minFollowers, minMultiplier]);

  // Breakdown state
  const [breakdownUrl, setBreakdownUrl] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [currentBreakdown, setCurrentBreakdown] = useState<DetailedOutlierBreakdown | null>(null);
  const [currentCandidate, setCurrentCandidate] = useState<OutlierCandidate | null>(null);
  const [aiApiKey, setAiApiKey] = useState<string>('');
  const [showAiKeyInput, setShowAiKeyInput] = useState<boolean>(false);
  const [selectedFramePreview, setSelectedFramePreview] = useState<{ dataUrl: string; label?: string; visualTrigger?: string; timestamp?: string } | null>(null);
  const [showSystemPrompt, setShowSystemPrompt] = useState<boolean>(false);

  // Brand context state: AHL vs Alchemane
  const [currentBrand, setCurrentBrand] = useState<'AHL' | 'Alchemane'>('AHL');

  // Board state
  const [boardItems, setBoardItems] = useState<BoardItem[]>([]);
  const [editingItemNotes, setEditingItemNotes] = useState<{ id: string; notes: string } | null>(null);

  // Toast state
  const [toast, setToast] = useState<string | null>(null);

  // WhatsApp forward to Sir state (Default: +91 98201 88505)
  const DEFAULT_SIR_PHONE = '+91 98201 88505';
  const [showWhatsAppModal, setShowWhatsAppModal] = useState<boolean>(false);
  const [sirPhone, setSirPhone] = useState<string>(DEFAULT_SIR_PHONE);
  const [sirNote, setSirNote] = useState<string>('');
  const [copiedWhatsApp, setCopiedWhatsApp] = useState<boolean>(false);
  const [whatsAppTarget, setWhatsAppTarget] = useState<{
    breakdown?: DetailedOutlierBreakdown | null;
    candidate?: OutlierCandidate | null;
  } | null>(null);

  // Google Sheets & Team Quota Tracker state
  interface TeamMemberConfig {
    id: string;
    name: string;
    role: string;
    dailyTarget: number;
    phone?: string;
    notes?: string;
  }

  const DEFAULT_TEAM_LIST: TeamMemberConfig[] = [
    { id: 'member-1', name: 'Member 1 (Aman)', role: 'Social Media Specialist', dailyTarget: 10, notes: 'YouTube Shorts & Outlier Discovery' },
    { id: 'member-2', name: 'Member 2 (Rahul)', role: 'Content Strategist', dailyTarget: 10, notes: 'Viral Transformation Hooks' },
    { id: 'member-3', name: 'Member 3 (Priya)', role: 'Reels & Creative Researcher', dailyTarget: 10, notes: 'AHL & Alchemane Outliers' }
  ];

  const [teamMembers, setTeamMembers] = useState<TeamMemberConfig[]>(DEFAULT_TEAM_LIST);
  const [teamMember, setTeamMember] = useState<string>('Member 1 (Aman)');
  const [isEditingTeam, setIsEditingTeam] = useState<boolean>(false);
  const [editingMembers, setEditingMembers] = useState<TeamMemberConfig[]>(DEFAULT_TEAM_LIST);
  const [isSavingTeam, setIsSavingTeam] = useState<boolean>(false);

  const [trackerData, setTrackerData] = useState<{
    sheetUrl: string;
    folderUrl: string;
    totalLogged: number;
    todayCount: number;
    todayIST: string;
    memberCounts: Record<string, number>;
    existingUrls: string[];
    existingRecords: Array<{
      normalizedUrl: string;
      rawUrl: string;
      submittedBy: string;
      timestamp: string;
      brand?: string;
      platform?: string;
      videoTitle: string;
      creator?: string;
      followers?: string;
      views?: string;
      reachRatio?: string;
      outlierMultiplier?: string;
      tier?: string;
      visualHook?: string;
      audioStrategy?: string;
      secretFormula?: string;
      status: string;
      feedback?: string;
      rowNumber: number;
    }>;
  }>({
    sheetUrl: 'https://docs.google.com/spreadsheets/d/14nj56PxfqLHcv8xTB03_RKSfyDD2s-C9Psk3LMnWGdU/edit',
    folderUrl: 'https://drive.google.com/drive/folders/0AIG06pZpg4KBUk9PVA',
    totalLogged: 0,
    todayCount: 0,
    todayIST: '',
    memberCounts: {},
    existingUrls: [],
    existingRecords: []
  });
  const [trackerFilterMember, setTrackerFilterMember] = useState<string>('All');
  const [trackerSearchQuery, setTrackerSearchQuery] = useState<string>('');
  const [isLoggingToSheet, setIsLoggingToSheet] = useState<boolean>(false);
  const [sheetDuplicateInfo, setSheetDuplicateInfo] = useState<{
    isDuplicate: boolean;
    message: string;
    existingRecord?: any;
  } | null>(null);

  // Initial load
  useEffect(() => {
    fetchRadarData();
    fetchBoardData();
    fetchKeywords();
    fetchTeamMembers();
    fetchTrackerData();
    if (typeof window !== 'undefined') {
      const savedPhone = localStorage.getItem('sir_whatsapp_phone');
      if (savedPhone) {
        setSirPhone(savedPhone);
      } else {
        setSirPhone(DEFAULT_SIR_PHONE);
        localStorage.setItem('sir_whatsapp_phone', DEFAULT_SIR_PHONE);
      }
      const savedMember = localStorage.getItem('social_member_name');
      if (savedMember) {
        setTeamMember(savedMember);
      }
    }
  }, []);

  const fetchTeamMembers = async () => {
    try {
      const res = await fetch('/api/team');
      const data = await res.json();
      if (data.success && Array.isArray(data.members) && data.members.length > 0) {
        setTeamMembers(data.members);
      }
    } catch (err) {
      console.error('Error fetching team members:', err);
    }
  };

  const handleOpenEditTeamModal = () => {
    setEditingMembers(JSON.parse(JSON.stringify(teamMembers)));
    setIsEditingTeam(true);
  };

  const handleSaveTeamMembers = async () => {
    // Validate that at least one member has a name
    const valid = editingMembers.filter(m => m.name.trim().length > 0);
    if (valid.length === 0) {
      showToast('Please keep at least one team member with a valid name');
      return;
    }

    setIsSavingTeam(true);
    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ members: valid })
      });
      const data = await res.json();
      setIsSavingTeam(false);
      if (data.success && data.members) {
        setTeamMembers(data.members);
        setIsEditingTeam(false);
        showToast('Team members & daily quotas updated! 🎉');
        if (!data.members.some((m: TeamMemberConfig) => m.name === teamMember)) {
          const first = data.members[0]?.name || 'Member 1';
          setTeamMember(first);
          if (typeof window !== 'undefined') localStorage.setItem('social_member_name', first);
        }
        fetchTrackerData();
      } else {
        showToast(data.error || 'Failed to update team members');
      }
    } catch (err: any) {
      setIsSavingTeam(false);
      showToast(err.message || 'Error saving team members');
    }
  };

  const fetchTrackerData = async () => {
    try {
      const res = await fetch('/api/tracker');
      const data = await res.json();
      if (data.success) {
        if (data.teamMembers && Array.isArray(data.teamMembers) && data.teamMembers.length > 0) {
          setTeamMembers(data.teamMembers);
          // If active teamMember is default placeholder or not in the real team list, auto-select first real member
          setTeamMember(prev => {
            const exists = data.teamMembers.some((m: TeamMemberConfig) => m.name.toLowerCase() === (prev || '').toLowerCase());
            if (!exists && data.teamMembers[0]?.name) {
              const firstMember = data.teamMembers[0].name;
              if (typeof window !== 'undefined') localStorage.setItem('social_member_name', firstMember);
              return firstMember;
            }
            return prev;
          });
        }
        setTrackerData({
          sheetUrl: data.sheetUrl,
          folderUrl: data.folderUrl,
          totalLogged: data.totalLogged || 0,
          todayCount: data.todayCount || 0,
          todayIST: data.todayIST || '',
          memberCounts: data.memberCounts || {},
          existingUrls: data.existingUrls || [],
          existingRecords: data.existingRecords || []
        });
      }
    } catch (err) {
      console.error('Error fetching tracker data:', err);
    }
  };

  const handleOpenWhatsAppModal = (breakdown?: DetailedOutlierBreakdown | null, candidate?: OutlierCandidate | null) => {
    const b = breakdown || currentBreakdown || undefined;
    const c = candidate || currentCandidate || undefined;
    setWhatsAppTarget({ breakdown: b, candidate: c });
    setCopiedWhatsApp(false);

    // Instant duplicate check against known sheet URLs
    const targetUrl = c?.url || b?.candidateUrl || '';
    if (targetUrl && trackerData.existingUrls.length > 0) {
      const norm = normalizeUrlClient(targetUrl);
      if (trackerData.existingUrls.includes(norm)) {
        setSheetDuplicateInfo({
          isDuplicate: true,
          message: '⚠️ This outlier was already logged into Sir\'s Google Sheet! Duplicates will not be re-added.'
        });
      } else {
        setSheetDuplicateInfo(null);
      }
    } else {
      setSheetDuplicateInfo(null);
    }

    setShowWhatsAppModal(true);
  };

  const handleLogToSheet = async (
    b?: DetailedOutlierBreakdown | null,
    c?: OutlierCandidate | null,
    silent: boolean = false
  ): Promise<{ success: boolean; duplicate?: boolean; message?: string }> => {
    const breakdown = b || whatsAppTarget?.breakdown || currentBreakdown;
    const candidate = c || whatsAppTarget?.candidate || currentCandidate;
    const videoUrl = candidate?.url || breakdown?.candidateUrl;

    if (!videoUrl) {
      if (!silent) showToast('No video URL found to save to Google Sheet');
      return { success: false, message: 'No video URL found' };
    }

    setIsLoggingToSheet(true);
    try {
      const title = candidate?.title || breakdown?.title || 'Untitled Outlier';
      const creator = candidate?.creator?.displayName || candidate?.creator?.username || breakdown?.creator?.displayName || breakdown?.creator?.username || 'Unknown';
      const followers = candidate?.creator?.subscriberOrFollowerCount || breakdown?.creator?.subscribersOrFollowers || 0;
      const views = candidate?.viewCount || breakdown?.metrics?.viewCount || 0;
      const reachRatio = candidate?.viewToFollowerRatio || (followers > 0 ? views / followers : 0);
      const multiplier = candidate?.outlierMultiplier || breakdown?.metrics?.outlierMultiplier || 0;
      const tier = candidate?.sopTaxonomy?.outlierTier || breakdown?.sopTaxonomy?.outlierTier || 'Notable Outlier (3x+)';
      const visualHook = breakdown?.deepVisualAnalysis?.winningVisualHook?.whatIsShown || breakdown?.contentAnalysis?.hookHeadline || 'High-contrast visual hook with immediate payoff';
      const audioStrategy = breakdown?.deepVisualAnalysis?.audioAndMusicStrategy?.trackName 
        ? `${breakdown.deepVisualAnalysis.audioAndMusicStrategy.trackName} (${breakdown.deepVisualAnalysis.audioAndMusicStrategy.audioType || 'Original Audio'})`
        : (breakdown?.contentAnalysis?.audioOrMusicTrack || candidate?.musicOrAudio || 'High-engagement dialogue / original speech');
      const secretFormula = breakdown?.strategistVerdict?.executiveVerdict || breakdown?.whyOutlierDiagnosis?.primaryDriver || candidate?.whyOutlier || 'Relatable problem-solution hook with immediate transformation';

      const res = await fetch('/api/tracker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submittedBy: teamMember,
          brand: currentBrand === 'AHL' ? 'AHL Hair Systems' : 'Alchemane Hair Extensions',
          platform: (candidate?.platform || 'youtube').toLowerCase().includes('instagram') ? 'Instagram Reels' : 'YouTube Shorts',
          videoTitle: title,
          videoUrl,
          creator,
          followers,
          views,
          reachRatio,
          outlierMultiplier: multiplier,
          outlierTier: tier,
          visualHook,
          audioStrategy,
          secretFormula
        })
      });

      const data = await res.json();
      setIsLoggingToSheet(false);

      if (data.duplicate) {
        setSheetDuplicateInfo({
          isDuplicate: true,
          message: data.message,
          existingRecord: data.existingRecord
        });
        if (!silent) {
          showToast(`⚠️ Duplicate blocked! Already logged by ${data.existingRecord?.submittedBy || 'team member'}`);
        }
        return { success: false, duplicate: true, message: data.message };
      }

      if (data.success) {
        setSheetDuplicateInfo(null);
        await fetchTrackerData();
        if (!silent) {
          showToast(`✅ Saved to Google Sheet! (${data.memberTodayCount}/${data.quotaTarget || 10} completed today by ${teamMember})`);
        }
        return { success: true, duplicate: false, message: data.message };
      } else {
        const errorMsg = data.error || data.message || 'Failed to save to Google Sheet';
        if (!silent) showToast(errorMsg);
        return { success: false, message: errorMsg };
      }
    } catch (err: any) {
      setIsLoggingToSheet(false);
      const errText = err.message || 'Error connecting to Google Sheets';
      if (!silent) showToast(errText);
      return { success: false, message: errText };
    }
  };

  const handleSendToSirOnWhatsApp = async () => {
    const b = whatsAppTarget?.breakdown || currentBreakdown;
    const c = whatsAppTarget?.candidate || currentCandidate;
    if (!b && !c) {
      showToast('No outlier video selected to share');
      return;
    }

    const currentPhone = sirPhone.trim() || DEFAULT_SIR_PHONE;
    if (typeof window !== 'undefined') {
      localStorage.setItem('sir_whatsapp_phone', currentPhone);
    }

    let rawDigits = currentPhone.replace(/[^0-9]/g, '');
    if (rawDigits.length === 10) {
      rawDigits = `91${rawDigits}`; // Prepend India country code if 10 digits provided
    }
    const cleanPhone = rawDigits;

    const message = buildWhatsAppMessage(b, c, sirNote, currentBrand);
    const encoded = encodeURIComponent(message);

    const url = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encoded}`
      : `https://api.whatsapp.com/send?text=${encoded}`;

    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
    // Auto-save to Google Sheet for team quota tracking and duplicate check
    showToast('Redirecting to WhatsApp & saving to Google Sheet... 🚀');
    await handleLogToSheet(b, c, false);
    setShowWhatsAppModal(false);
  };

  const handleCopyWhatsAppMessage = async () => {
    const b = whatsAppTarget?.breakdown || currentBreakdown;
    const c = whatsAppTarget?.candidate || currentCandidate;
    const message = buildWhatsAppMessage(b, c, sirNote, currentBrand);
    try {
      await navigator.clipboard.writeText(message);
      setCopiedWhatsApp(true);
      showToast('WhatsApp report copied to clipboard!');
      setTimeout(() => setCopiedWhatsApp(false), 2500);
    } catch {
      showToast('Failed to copy text');
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchKeywords = async () => {
    try {
      const res = await fetch('/api/keywords');
      const data = await res.json();
      if (data.brand) {
        setCurrentBrand(data.brand);
      }
      if (data.categoryGroups && Array.isArray(data.categoryGroups) && data.categoryGroups.length > 0) {
        setCategoryGroups(data.categoryGroups);
      } else {
        setCategoryGroups(data.brand === 'Alchemane' ? ALCHEMANE_CATEGORY_GROUPS : AHL_CATEGORY_GROUPS);
      }
      if (data.keywords && Array.isArray(data.keywords) && data.keywords.length > 0) {
        setKeywordList(data.keywords);
        if (!selectedKeyword || !data.keywords.includes(selectedKeyword)) {
          setSelectedKeyword(data.keywords[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching keywords:', err);
    }
  };

  const handleSwitchBrand = async (newBrand: 'AHL' | 'Alchemane') => {
    if (newBrand === currentBrand) return;
    try {
      const res = await fetch('/api/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'switchBrand', brand: newBrand })
      });
      const data = await res.json();
      if (data.success && data.keywords) {
        setCurrentBrand(newBrand);
        setKeywordList(data.keywords);
        if (data.categoryGroups && Array.isArray(data.categoryGroups)) {
          setCategoryGroups(data.categoryGroups);
        } else {
          setCategoryGroups(newBrand === 'Alchemane' ? ALCHEMANE_CATEGORY_GROUPS : AHL_CATEGORY_GROUPS);
        }
        setSelectedCategory('All');
        setSelectedKeyword(data.keywords[0] || '');
        setCustomKeyword('');
        showToast(`Switched brand focus to: ${newBrand === 'AHL' ? 'American Hairline (Men)' : 'Alchemane (Women)'}`);
      }
    } catch (err: any) {
      showToast(err.message || 'Error switching brand');
    }
  };

  const handleAddTargetKeyword = async () => {
    const trimmed = newKeywordInput.trim();
    if (!trimmed) return;
    try {
      const res = await fetch('/api/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', keyword: trimmed })
      });
      const data = await res.json();
      if (data.success && data.keywords) {
        setKeywordList(data.keywords);
        setSelectedKeyword(trimmed);
        setCustomKeyword('');
        setNewKeywordInput('');
        setIsAddingKeyword(false);
        showToast(`Target keyword added: "${trimmed}"`);
      }
    } catch (err: any) {
      showToast(err.message || 'Error adding keyword');
    }
  };

  const handleRemoveTargetKeyword = async (e: React.MouseEvent, kw: string) => {
    e.stopPropagation();
    try {
      const res = await fetch('/api/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove', keyword: kw })
      });
      const data = await res.json();
      if (data.success && data.keywords) {
        setKeywordList(data.keywords);
        if (selectedKeyword === kw) {
          setSelectedKeyword(data.keywords[0] || '');
        }
        showToast(`Removed keyword: "${kw}"`);
      }
    } catch (err: any) {
      showToast(err.message || 'Error removing keyword');
    }
  };

  const fetchRadarData = async () => {
    try {
      const res = await fetch('/api/radar');
      const data = await res.json();
      if (data.cached && data.cached.length > 0) {
        setRadarCandidates(data.cached);
      }
    } catch (err) {
      console.error('Error fetching radar cache:', err);
    }
  };

  const [isRefreshingBoard, setIsRefreshingBoard] = useState<boolean>(false);

  const fetchBoardData = async (showFeedback: boolean = false) => {
    setIsRefreshingBoard(true);
    try {
      const res = await fetch(`/api/board?refresh=true&t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      const data = await res.json();
      if (data.items) {
        setBoardItems(data.items);
        if (showFeedback) {
          showToast(`Library refreshed (${data.items.length} saved outliers)`);
        }
      } else if (showFeedback) {
        showToast('Library refreshed');
      }
    } catch (err: any) {
      console.error('Error fetching board items:', err);
      if (showFeedback) {
        showToast('Error refreshing library');
      }
    } finally {
      setIsRefreshingBoard(false);
    }
  };

  const handleRunRadar = async () => {
    setIsScanning(true);
    const kw = customKeyword.trim() || selectedKeyword;
    setScanMessage(`Scanning YouTube & Instagram for "${kw}"...`);

    try {
      const res = await fetch('/api/radar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords: [kw],
          platform: selectedPlatform,
          minMultiplier,
          minViews,
          minFollowers,
          minFollowerRatio
        })
      });

      const data = await res.json();
      if (data.success && data.candidates) {
        setRadarCandidates(data.candidates);
        showToast(`Discovered ${data.candidates.length} ranked videos!`);
      } else {
        showToast(data.error || 'Failed to scan radar');
      }
    } catch (err: any) {
      showToast(err.message || 'Network error scanning radar');
    } finally {
      setIsScanning(false);
      setScanMessage('');
    }
  };

  const handleAnalyzeUrl = async (urlToAnalyze?: string, candidateToUse?: OutlierCandidate) => {
    const targetUrl = urlToAnalyze || breakdownUrl;
    if (!targetUrl && !candidateToUse) {
      showToast('Please enter a URL or choose a candidate');
      return;
    }

    setIsAnalyzing(true);
    setActiveTab('breakdown');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (candidateToUse) {
      setCurrentCandidate(candidateToUse);
      setBreakdownUrl(candidateToUse.url);
    }

    try {
      const res = await fetch('/api/breakdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: targetUrl,
          candidateId: candidateToUse?.id,
          aiApiKey: aiApiKey.trim() || undefined,
          forceRefresh: true
        })
      });

      const data = await res.json();
      if (data.success && data.analysis) {
        setCurrentBreakdown(data.analysis);
        if (data.candidate) {
          setCurrentCandidate(data.candidate);
        }
        showToast('Deep Frame-by-Frame & Strategist Intelligence Loaded!');
      } else {
        showToast(data.error || 'Could not analyze video');
      }
    } catch (err: any) {
      showToast(err.message || 'Error running breakdown');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddToBoard = async (candidate: OutlierCandidate, breakdown?: DetailedOutlierBreakdown) => {
    try {
      const res = await fetch('/api/board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          candidate,
          breakdown
        })
      });
      const data = await res.json();
      if (data.success && data.items) {
        setBoardItems(data.items);
        // Automatically sync to Google Sheet so outliers are never missed
        handleLogToSheet(breakdown, candidate, true);
        showToast('Saved to Outliers Library & syncing to Google Sheet! 🚀');
      } else {
        showToast(data.error || 'Failed to add to library');
      }
    } catch (err: any) {
      showToast(err.message || 'Error saving to library');
    }
  };

  const handleUpdateBoardStatus = async (id: string, newStatus: BoardStatus) => {
    try {
      const res = await fetch('/api/board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateStatus',
          id,
          status: newStatus
        })
      });
      const data = await res.json();
      if (data.success && data.items) {
        setBoardItems(data.items);
        showToast(`Moved to ${newStatus.toUpperCase()}`);
      }
    } catch (err: any) {
      showToast(err.message);
    }
  };

  const handleDeleteBoardItem = async (id: string) => {
    try {
      const res = await fetch('/api/board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id })
      });
      const data = await res.json();
      if (data.success && data.items) {
        setBoardItems(data.items);
        showToast('Removed from library');
      }
    } catch (err: any) {
      showToast(err.message);
    }
  };

  const handleSaveNotes = async (id: string, notes: string) => {
    try {
      const res = await fetch('/api/board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateDetails', id, notes })
      });
      const data = await res.json();
      setEditingItemNotes(null);
      if (data.success && data.items) {
        setBoardItems(data.items);
        showToast('Research notes saved');
      }
    } catch (err: any) {
      showToast(err.message);
    }
  };

  const getOutlierBadgeClass = (multiplier: number) => {
    if (multiplier >= 10) return 'outlier-mega';
    if (multiplier >= 5) return 'outlier-real';
    if (multiplier >= 3) return 'outlier-notable';
    return 'outlier-regular';
  };

  const getOutlierTierLabel = (c: OutlierCandidate) => {
    if (c.sopTaxonomy?.outlierTier) return c.sopTaxonomy.outlierTier;
    const m = c.outlierMultiplier;
    if (m >= 10) return `Mega Outlier (${m}x)`;
    if (m >= 5) return `Real Outlier (${m}x)`;
    if (m >= 3) return `Notable Outlier (${m}x)`;
    return `Emerging (${m}x)`;
  };

  return (
    <div className="app-container">
      {/* Toast Notification */}
      {toast && (
        <div className="toast-banner">
          <CheckCircle size={18} color="var(--gold-400)" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header */}
      <header className="app-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' }}>
            <div className="brand-badge">
              <Flame size={14} /> Outlier Intelligence Radar
            </div>

            {/* Brand Toggle Group: AHL vs Alchemane */}
            <div className="brand-toggle-group">
              <button
                type="button"
                className={`brand-toggle-btn ${currentBrand === 'AHL' ? 'active-ahl' : ''}`}
                onClick={() => handleSwitchBrand('AHL')}
                title="Switch to American Hairline (Men's Systems & Grooming)"
              >
                <span>💈 American Hairline (AHL)</span>
              </button>
              <button
                type="button"
                className={`brand-toggle-btn ${currentBrand === 'Alchemane' ? 'active-alchemane' : ''}`}
                onClick={() => handleSwitchBrand('Alchemane')}
                title="Switch to Alchemane (Women's Hair Toppers & Extensions)"
              >
                <span>✨ Alchemane</span>
              </button>
            </div>

            <a
              href={trackerData.sheetUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-sheet"
              style={{ fontSize: '0.78rem', padding: '6px 14px', textDecoration: 'none' }}
              title="Open Sir's Outlier Tracker Sheet in Google Drive"
            >
              <FileSpreadsheet size={14} /> Open Google Sheet ↗
            </a>
          </div>

          <h1 className="brand-title">
            {currentBrand === 'AHL' ? 'AHL Viral Outlier Discovery & Strategy Desk' : 'Alchemane Viral Outlier & Hair Toppers Desk'}
          </h1>
          <p className="brand-subtitle">
            {currentBrand === 'AHL'
              ? "Men's Non-Surgical Hair Systems, Hair Patches & Grooming • Median Baselines (15-30 videos) • 3x/5x Multipliers • Indian Taboo-Busting Adaptation."
              : "Women's Hair Toppers, Clip-in Extensions & Volume Solutions • Median Baselines • 3x/5x Multipliers • Elegant Luxury Aesthetics."}
          </p>
        </div>

        <nav className="nav-tabs">
          <button
            className={`nav-tab-btn ${activeTab === 'radar' ? 'active' : ''}`}
            onClick={() => setActiveTab('radar')}
          >
            <Radar size={16} /> Discovery Radar
          </button>
          <button
            className={`nav-tab-btn ${activeTab === 'breakdown' ? 'active' : ''}`}
            onClick={() => setActiveTab('breakdown')}
          >
            <BarChart3 size={16} /> Outlier Deep Dive
          </button>
          <button
            className={`nav-tab-btn ${activeTab === 'board' ? 'active' : ''}`}
            onClick={() => setActiveTab('board')}
          >
            <Bookmark size={16} /> Saved Outliers
            {boardItems.length > 0 && <span className="nav-badge">{boardItems.length}</span>}
          </button>
          <button
            className={`nav-tab-btn ${activeTab === 'tracker' ? 'active' : ''}`}
            onClick={() => {
              fetchTrackerData();
              setActiveTab('tracker');
            }}
          >
            <FileSpreadsheet size={16} /> Team Tracker & Google Sheet
            <span
              className="nav-badge"
              style={{
                background: trackerData.todayCount >= teamMembers.reduce((s, m) => s + (m.dailyTarget || 10), 0) ? 'var(--emerald-500)' : '#0f9d58',
                color: '#fff',
                fontWeight: 700
              }}
              title="Today's total logged outliers across team members"
            >
              {trackerData.todayCount}/{teamMembers.reduce((s, m) => s + (m.dailyTarget || 10), 0)}
            </span>
          </button>
        </nav>
      </header>

      {/* ========================================================
          TAB 1: DISCOVERY RADAR
         ======================================================== */}
      {activeTab === 'radar' && (
        <main>
          {/* Controls Bar */}
          <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Company Filter Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', paddingBottom: '14px', borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    🏢 Company Filter:
                  </span>
                  <div style={{ display: 'inline-flex', background: 'rgba(0, 0, 0, 0.4)', padding: '3px', borderRadius: '10px', border: '1px solid var(--border-highlight)' }}>
                    <button
                      type="button"
                      onClick={() => handleSwitchBrand('AHL')}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 16px',
                        borderRadius: '7px',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.84rem',
                        fontWeight: 700,
                        transition: 'all 0.2s',
                        background: currentBrand === 'AHL' ? 'var(--gold-400)' : 'transparent',
                        color: currentBrand === 'AHL' ? '#000' : 'var(--text-muted)'
                      }}
                    >
                      💈 American Hairline (Men)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSwitchBrand('Alchemane')}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 16px',
                        borderRadius: '7px',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.84rem',
                        fontWeight: 700,
                        transition: 'all 0.2s',
                        background: currentBrand === 'Alchemane' ? '#f472b6' : 'transparent',
                        color: currentBrand === 'Alchemane' ? '#000' : 'var(--text-muted)'
                      }}
                    >
                      ✨ Alchemane (Women)
                    </button>
                  </div>
                </div>

                <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                  {currentBrand === 'AHL'
                    ? "✓ 10 specific keywords + spelling variations (toupee & topee) on IG Reels & YT Shorts"
                    : "✓ 5 product categories: Wigs, Toppers, Permanent & Clip-In Extensions, Bangs"}
                </div>
              </div>

              {/* Category Filter & Target Keywords */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.80rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Niche Categories:
                    </span>
                  </div>
                  {!isAddingKeyword && (
                    <button
                      onClick={() => setIsAddingKeyword(true)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: 'rgba(245, 158, 11, 0.08)',
                        border: '1px dashed var(--gold-400)',
                        color: 'var(--gold-400)',
                        fontSize: '0.76rem',
                        fontWeight: 600,
                        padding: '3px 12px',
                        borderRadius: '9999px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <Plus size={13} /> Add Custom Keyword
                    </button>
                  )}
                </div>

                {/* Category Selector Tabs */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('All')}
                    style={{
                      padding: '4px 12px',
                      borderRadius: '9999px',
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      border: selectedCategory === 'All' ? '1px solid var(--gold-400)' : '1px solid var(--border-subtle)',
                      background: selectedCategory === 'All' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                      color: selectedCategory === 'All' ? 'var(--gold-400)' : 'var(--text-dim)',
                      cursor: 'pointer'
                    }}
                  >
                    All Keywords ({keywordList.length})
                  </button>
                  {categoryGroups.map((g) => (
                    <button
                      key={g.category}
                      type="button"
                      onClick={() => setSelectedCategory(g.category)}
                      style={{
                        padding: '4px 12px',
                        borderRadius: '9999px',
                        fontSize: '0.76rem',
                        fontWeight: 600,
                        border: selectedCategory === g.category ? '1px solid var(--gold-400)' : '1px solid var(--border-subtle)',
                        background: selectedCategory === g.category ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                        color: selectedCategory === g.category ? 'var(--gold-400)' : 'var(--text-dim)',
                        cursor: 'pointer'
                      }}
                    >
                      {g.category} ({g.keywords.length})
                    </button>
                  ))}
                </div>

                {/* Keyword Pills Under Selected Category */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                  {(selectedCategory === 'All'
                    ? keywordList
                    : (categoryGroups.find((g) => g.category === selectedCategory)?.keywords || keywordList)
                  ).map((kw) => (
                    <div
                      key={kw}
                      onClick={() => {
                        setSelectedKeyword(kw);
                        setCustomKeyword('');
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 14px',
                        borderRadius: '9999px',
                        fontSize: '0.84rem',
                        fontWeight: 600,
                        border: selectedKeyword === kw && !customKeyword ? '1px solid var(--gold-400)' : '1px solid var(--border-subtle)',
                        background: selectedKeyword === kw && !customKeyword ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                        color: selectedKeyword === kw && !customKeyword ? 'var(--gold-400)' : 'var(--text-muted)',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <span>{kw}</span>
                      {keywordList.length > 1 && (
                        <span
                          onClick={(e) => handleRemoveTargetKeyword(e, kw)}
                          title="Remove keyword"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--text-dim)',
                            padding: '1px',
                            marginLeft: '2px',
                            borderRadius: '50%',
                            transition: 'color 0.2s'
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#fb7185')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-dim)')}
                        >
                          <X size={12} />
                        </span>
                      )}
                    </div>
                  ))}

                  {/* Inline Add Keyword Box */}
                  {isAddingKeyword && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(0, 0, 0, 0.5)', padding: '3px 8px 3px 12px', borderRadius: '9999px', border: '1px solid var(--gold-400)' }}>
                      <input
                        type="text"
                        autoFocus
                        placeholder="Type new niche keyword..."
                        value={newKeywordInput}
                        onChange={(e) => setNewKeywordInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddTargetKeyword();
                          if (e.key === 'Escape') setIsAddingKeyword(false);
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#fff',
                          fontSize: '0.84rem',
                          outline: 'none',
                          width: '190px'
                        }}
                      />
                      <button
                        onClick={handleAddTargetKeyword}
                        className="btn btn-primary btn-sm"
                        style={{ padding: '2px 10px', fontSize: '0.74rem' }}
                      >
                        Add
                      </button>
                      <button
                        onClick={() => { setIsAddingKeyword(false); setNewKeywordInput(''); }}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px' }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Search & Primary Scan Action Bar */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'stretch' }}>
                <div style={{ flex: '1 1 320px', position: 'relative' }}>
                  <Search size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    placeholder={`Search custom query (or active: "${selectedKeyword}")...`}
                    value={customKeyword}
                    onChange={(e) => setCustomKeyword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleRunRadar();
                      }
                    }}
                    style={{
                      width: '100%',
                      height: '100%',
                      minHeight: '44px',
                      padding: '10px 38px 10px 40px',
                      background: 'rgba(0, 0, 0, 0.35)',
                      border: '1px solid var(--border-highlight)',
                      borderRadius: 'var(--radius-md)',
                      color: '#fff',
                      fontSize: '0.9rem',
                      outline: 'none',
                      transition: 'border-color 0.2s'
                    }}
                  />
                  {customKeyword && (
                    <button
                      type="button"
                      onClick={() => setCustomKeyword('')}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-dim)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '4px'
                      }}
                      title="Clear custom query"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleRunRadar}
                  disabled={isScanning}
                  style={{
                    flexShrink: 0,
                    minHeight: '44px',
                    padding: '0 24px',
                    fontSize: '0.92rem',
                    fontWeight: 700,
                    letterSpacing: '0.01em',
                    boxShadow: '0 4px 18px rgba(245, 158, 11, 0.35)',
                    whiteSpace: 'nowrap'
                  }}
                  title="Scan YouTube and Instagram for viral outliers"
                >
                  {isScanning ? (
                    <>
                      <RefreshCw size={18} className="spin" /> Scanning...
                    </>
                  ) : (
                    <>
                      <Radar size={18} /> Scan Radar
                    </>
                  )}
                </button>
              </div>

              {/* Filters Strip */}
              <div 
                style={{ 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: '10px', 
                  alignItems: 'center',
                  background: 'rgba(0, 0, 0, 0.22)',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(255, 255, 255, 0.06)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '4px' }}>
                  <SlidersHorizontal size={14} color="var(--text-dim)" />
                  <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Filters:
                  </span>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', flex: '1 1 auto', alignItems: 'center' }}>
                  <select
                    value={selectedPlatform}
                    onChange={(e: any) => setSelectedPlatform(e.target.value)}
                    className="radar-filter-select"
                    style={{
                      flex: '1 1 165px',
                      minWidth: '145px',
                      padding: '8px 12px',
                      background: 'rgba(15, 23, 42, 0.7)',
                      border: '1px solid var(--border-highlight)',
                      borderRadius: 'var(--radius-sm)',
                      color: '#fff',
                      fontSize: '0.84rem',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="all">Platform: All (YT + IG)</option>
                    <option value="youtube">Platform: YouTube</option>
                    <option value="instagram">Platform: Instagram Reels</option>
                  </select>

                  <select
                    value={minMultiplier}
                    onChange={(e: any) => setMinMultiplier(Number(e.target.value))}
                    className="radar-filter-select"
                    style={{
                      flex: '1 1 150px',
                      minWidth: '135px',
                      padding: '8px 12px',
                      background: 'rgba(15, 23, 42, 0.7)',
                      border: minMultiplier > 0 ? '1px solid var(--gold-400)' : '1px solid var(--border-highlight)',
                      borderRadius: 'var(--radius-sm)',
                      color: minMultiplier > 0 ? 'var(--gold-400)' : '#fff',
                      fontSize: '0.84rem',
                      fontWeight: minMultiplier > 0 ? 600 : 400,
                      cursor: 'pointer'
                    }}
                  >
                    <option value="0">Multiplier: All</option>
                    <option value="1.5">Multiplier: Min 1.5x</option>
                    <option value="3">Multiplier: Min 3x Breakout</option>
                    <option value="5">Multiplier: Min 5x Mega Outlier</option>
                  </select>

                  <select
                    value={minViews}
                    onChange={(e: any) => setMinViews(Number(e.target.value))}
                    className="radar-filter-select"
                    style={{
                      flex: '1 1 170px',
                      minWidth: '150px',
                      padding: '8px 12px',
                      background: 'rgba(15, 23, 42, 0.7)',
                      border: minViews > 0 ? '1px solid var(--gold-400)' : '1px solid var(--border-highlight)',
                      borderRadius: 'var(--radius-sm)',
                      color: minViews > 0 ? 'var(--gold-400)' : '#fff',
                      fontSize: '0.84rem',
                      fontWeight: minViews > 0 ? 600 : 400,
                      cursor: 'pointer'
                    }}
                    title="Minimum outlier views threshold"
                  >
                    <option value="100000">Views: 1 Lakh+ (0.1M)</option>
                    <option value="500000">Views: 5 Lakhs+ (0.5M)</option>
                    <option value="1000000">Views: 10 Lakhs+ (1M+)</option>
                    <option value="0">Views: Any Views</option>
                  </select>

                  <select
                    value={minFollowers}
                    onChange={(e: any) => setMinFollowers(Number(e.target.value))}
                    className="radar-filter-select"
                    style={{
                      flex: '1 1 170px',
                      minWidth: '150px',
                      padding: '8px 12px',
                      background: 'rgba(15, 23, 42, 0.7)',
                      border: minFollowers > 0 ? '1px solid var(--gold-400)' : '1px solid var(--border-highlight)',
                      borderRadius: 'var(--radius-sm)',
                      color: minFollowers > 0 ? 'var(--gold-400)' : '#fff',
                      fontSize: '0.84rem',
                      fontWeight: minFollowers > 0 ? 600 : 400,
                      cursor: 'pointer'
                    }}
                    title="Minimum creator followers / subscribers"
                  >
                    <option value="14000">Followers: &gt; 14k+ (Target)</option>
                    <option value="50000">Followers: &gt; 50k+</option>
                    <option value="100000">Followers: &gt; 100k+ (1 Lakh+)</option>
                    <option value="0">Followers: Any Size</option>
                  </select>

                  <select
                    value={minFollowerRatio}
                    onChange={(e: any) => setMinFollowerRatio(Number(e.target.value))}
                    className="radar-filter-select"
                    style={{
                      flex: '1 1 200px',
                      minWidth: '170px',
                      padding: '8px 12px',
                      background: 'rgba(15, 23, 42, 0.7)',
                      border: minFollowerRatio > 0 ? '1px solid var(--gold-400)' : '1px solid var(--border-highlight)',
                      borderRadius: 'var(--radius-sm)',
                      color: minFollowerRatio > 0 ? 'var(--gold-400)' : '#fff',
                      fontSize: '0.84rem',
                      fontWeight: minFollowerRatio > 0 ? 700 : 400,
                      cursor: 'pointer'
                    }}
                    title="Filter by Views-to-Followers / Subscribers Reach Ratio"
                  >
                    <option value="2.5">Reach: 🚀 Min 2.5x+ Followers (Default)</option>
                    <option value="5">Reach: 🔥 Min 5x+ Followers</option>
                    <option value="10">Reach: ⚡ Min 10x+ Followers</option>
                    <option value="1">Reach: Min 1.0x+ Followers</option>
                    <option value="0">Reach: All (Include Below Followers)</option>
                  </select>

                  {(minFollowerRatio > 0 || minViews !== 100000 || minFollowers !== 14000 || minMultiplier > 0 || selectedPlatform !== 'all') && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPlatform('all');
                        setMinMultiplier(0);
                        setMinViews(0);
                        setMinFollowers(0);
                        setMinFollowerRatio(0);
                      }}
                      style={{
                        background: 'transparent',
                        border: '1px dashed rgba(255, 255, 255, 0.25)',
                        color: 'var(--text-dim)',
                        fontSize: '0.78rem',
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        whiteSpace: 'nowrap'
                      }}
                      title="Reset all filters to default"
                    >
                      Reset Filters
                    </button>
                  )}
                </div>
              </div>

              {scanMessage && (
                <div style={{ fontSize: '0.84rem', color: 'var(--cyan-400)', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'rgba(6, 182, 212, 0.08)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
                  <RefreshCw size={14} className="spin" /> {scanMessage}
                </div>
              )}
            </div>
          </div>

          {/* Results Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={18} color="var(--gold-400)" />
              <span>Ranked Outliers ({filteredCandidates.length})</span>
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Accurate mathematical outlier ratio (Views ÷ Creator Median)
            </div>
          </div>

          {/* Candidate Grid */}
          {filteredCandidates.length === 0 ? (
            <div className="glass-panel" style={{ padding: '60px 20px', textAlign: 'center' }}>
              <Radar size={48} color="var(--text-dim)" style={{ margin: '0 auto 16px auto', display: 'block' }} />
              <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>No matching outlier videos found</h3>
              <p style={{ color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto 20px auto', fontSize: '0.9rem' }}>
                {radarCandidates.length > 0 
                  ? 'No videos match the current Reach Ratio or View filters. Try adjusting the dropdowns or click "Scan Radar".'
                  : 'Click "Scan Radar" to find viral hair system and patch videos across YouTube and Instagram.'}
              </p>
              <button className="btn btn-primary" onClick={handleRunRadar} disabled={isScanning}>
                {isScanning ? (
                  <>
                    <RefreshCw size={16} className="spin" /> Scanning...
                  </>
                ) : (
                  <>
                    <Radar size={16} /> Scan Radar
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="radar-grid">
              {filteredCandidates.map((c) => (
                <div key={c.id} className="video-card">
                  <div className="card-thumbnail-container">
                    {c.thumbnailUrl ? (
                      <img src={c.thumbnailUrl} alt={c.title} className="card-thumbnail" />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0f1d' }}>
                        <Play size={32} color="var(--text-dim)" />
                      </div>
                    )}

                    <div className="card-overlay-badges">
                      <span className={`platform-pill ${c.platform}`}>
                        {c.platform === 'youtube' ? '▶ YouTube' : '📸 IG Reel'}
                      </span>
                      {c.timeWindow && (
                        <span style={{
                          padding: '2px 7px',
                          borderRadius: '4px',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          background: c.timeWindow === '48h' ? 'rgba(16, 185, 129, 0.9)' : 'rgba(234, 179, 8, 0.9)',
                          color: '#000',
                          letterSpacing: '0.04em'
                        }}>
                          {c.timeWindow === '48h' ? '⚡ 48h' : c.timeWindow === '4d' ? '⏳ 4d' : '⏳ 6d'}
                        </span>
                      )}
                      {c.durationSeconds ? (
                        <span className="duration-tag">{c.durationSeconds}s</span>
                      ) : null}
                    </div>
                  </div>

                  <div className="card-body">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', gap: '8px' }}>
                      <span className={`outlier-badge ${getOutlierBadgeClass(c.outlierMultiplier)}`}>
                        <Flame size={12} /> {getOutlierTierLabel(c)}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                        Rank Score: <strong>{c.outlierScore}</strong>/100
                      </span>
                    </div>

                    {/* SOP Taxonomy Tags */}
                    {c.sopTaxonomy && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                        <span className="sop-tag" style={{ color: 'var(--cyan-400)', borderColor: 'rgba(6, 182, 212, 0.3)' }}>
                          🎯 {c.sopTaxonomy.topicTag}
                        </span>
                        <span className="sop-tag" style={{ color: 'var(--gold-400)', borderColor: 'rgba(245, 158, 11, 0.3)' }}>
                          🎬 {c.sopTaxonomy.formatTag}
                        </span>
                        <span className="sop-tag" style={{ color: '#f472b6', borderColor: 'rgba(236, 72, 153, 0.3)' }}>
                          ⚡ {c.sopTaxonomy.primaryEmotion}
                        </span>
                      </div>
                    )}

                    <h3 className="card-title" title={c.title}>{c.title}</h3>

                    <div className="card-creator-row">
                      <div className="creator-info" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span>@{c.creator.username || c.creator.displayName}</span>
                        {c.creator.subscriberOrFollowerCount ? (
                          <span style={{ fontSize: '0.72rem', background: 'rgba(255, 255, 255, 0.08)', padding: '2px 8px', borderRadius: '9999px', color: 'var(--text-muted)' }}>
                            👥 {c.creator.subscriberOrFollowerCount >= 100000 ? `${(c.creator.subscriberOrFollowerCount / 100000).toFixed(1)} Lakh` : `${(c.creator.subscriberOrFollowerCount / 1000).toFixed(0)}k`} {c.platform === 'youtube' ? 'subs' : 'followers'}
                          </span>
                        ) : null}
                        {(() => {
                          const ratio = c.viewToFollowerRatio ?? (
                            c.creator?.subscriberOrFollowerCount && c.creator.subscriberOrFollowerCount > 0
                              ? c.viewCount / c.creator.subscriberOrFollowerCount
                              : null
                          );
                          if (!ratio) return null;
                          return (
                            <span 
                              style={{ 
                                fontSize: '0.72rem', 
                                background: ratio >= 10 ? 'rgba(245, 158, 11, 0.18)' : 'rgba(6, 182, 212, 0.15)', 
                                border: ratio >= 10 ? '1px solid rgba(245, 158, 11, 0.45)' : '1px solid rgba(6, 182, 212, 0.35)',
                                padding: '2px 8px', 
                                borderRadius: '9999px', 
                                color: ratio >= 10 ? 'var(--gold-400)' : 'var(--cyan-400)',
                                fontWeight: 700 
                              }}
                              title={`Reach Ratio: Views (${c.viewCount.toLocaleString()}) ÷ Followers (${c.creator.subscriberOrFollowerCount?.toLocaleString()}) = ${ratio.toFixed(1)}x Reach`}
                            >
                              🚀 {ratio.toFixed(1)}x Reach
                            </span>
                          );
                        })()}
                      </div>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                        Channel Median: ~{c.creator.medianViews >= 100000 ? `${(c.creator.medianViews / 100000).toFixed(1)}L` : c.creator.medianViews?.toLocaleString()}
                      </span>
                    </div>

                    <div className="card-stats-grid">
                      <div className="stat-item">
                        <span className="stat-label">Views</span>
                        <span className="stat-value" style={{ color: 'var(--gold-400)' }} title={`${c.viewCount.toLocaleString()} total views`}>
                          {c.viewCount >= 1000000
                            ? `${(c.viewCount / 1000000).toFixed(1)}M`
                            : c.viewCount >= 100000
                            ? `${(c.viewCount / 100000).toFixed(1)} Lakh`
                            : c.viewCount.toLocaleString()}
                        </span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Reach Ratio</span>
                        <span 
                          className="stat-value" 
                          style={{ 
                            color: (() => {
                              const r = c.viewToFollowerRatio ?? (c.creator?.subscriberOrFollowerCount ? c.viewCount / c.creator.subscriberOrFollowerCount : 0);
                              return r >= 10 ? 'var(--gold-400)' : r >= 2 ? 'var(--cyan-400)' : 'var(--text-main)';
                            })()
                          }}
                        >
                          {(() => {
                            const r = c.viewToFollowerRatio ?? (c.creator?.subscriberOrFollowerCount ? c.viewCount / c.creator.subscriberOrFollowerCount : null);
                            return r !== null ? `🚀 ${r.toFixed(1)}x` : 'N/A';
                          })()}
                        </span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Likes</span>
                        <span className="stat-value">{c.likeCount.toLocaleString()}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Comments</span>
                        <span className="stat-value">{c.commentCount.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="signal-banner">
                      ⚡ {c.whyOutlier}
                    </div>

                    <div className="card-actions">
                      <button
                        className="btn btn-primary btn-sm"
                        style={{ flex: 1 }}
                        onClick={() => handleAnalyzeUrl(c.url, c)}
                      >
                        <BarChart3 size={14} /> Deep Dive
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        style={{ padding: '6px 9px', color: '#25D366' }}
                        title="Send this outlier to Sir on WhatsApp"
                        onClick={() => handleOpenWhatsAppModal(null, c)}
                      >
                        <WhatsAppIcon size={14} color="#25D366" />
                      </button>
                      {(() => {
                        const norm = normalizeUrlClient(c.url);
                        const isInSheet = trackerData.existingUrls.includes(norm);
                        return (
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            style={isInSheet ? { color: '#34d399', borderColor: '#059669', background: 'rgba(16, 185, 129, 0.1)' } : { color: '#34d399' }}
                            title={isInSheet ? "Already logged in Sir's Google Sheet" : "Save this outlier to Sir's Google Sheet"}
                            onClick={() => handleLogToSheet(null, c, false)}
                          >
                            <FileSpreadsheet size={13} /> {isInSheet ? 'Logged' : 'Sheet'}
                          </button>
                        );
                      })()}
                      {(() => {
                        const isSaved = boardItems.some((b) => b.candidate.url === c.url || b.candidate.id === c.id);
                        return (
                          <button
                            className="btn btn-outline btn-sm"
                            style={isSaved ? { color: 'var(--emerald-500)', borderColor: 'var(--emerald-500)' } : {}}
                            title={isSaved ? 'Saved in Library' : 'Save to Outliers Library'}
                            onClick={() => handleAddToBoard(c)}
                          >
                            {isSaved ? <Check size={14} /> : <Bookmark size={14} />} {isSaved ? 'Saved' : 'Save'}
                          </button>
                        );
                      })()}
                      <a
                        href={c.url}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-outline btn-sm"
                        title="Open original video"
                      >
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      )}

      {/* ========================================================
          TAB 2: OUTLIER DEEP DIVE & DETAILED BREAKDOWN
         ======================================================== */}
      {activeTab === 'breakdown' && (
        <main>
          {/* URL Input Bar */}
          <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <Search size={18} color="var(--text-dim)" style={{ position: 'absolute', left: '14px', top: '13px' }} />
                <input
                  type="text"
                  placeholder="Paste any YouTube Short/Video or Instagram Reel URL to get exact outlier intelligence..."
                  value={breakdownUrl}
                  onChange={(e) => setBreakdownUrl(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 42px',
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid var(--border-highlight)',
                    borderRadius: 'var(--radius-md)',
                    color: '#fff',
                    fontSize: '0.92rem'
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleAnalyzeUrl()}
                />
              </div>

              <button
                className="btn btn-primary"
                onClick={() => handleAnalyzeUrl()}
                disabled={isAnalyzing}
                style={{ padding: '12px 24px' }}
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw size={16} className="spin" /> Frame-by-Frame Analysis...
                  </>
                ) : (
                  <>
                    <BarChart3 size={16} /> Get Deep Dive
                  </>
                )}
              </button>

              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setShowAiKeyInput(!showAiKeyInput)}
                title="Configure Gemini Multimodal AI Agent API key"
                style={{ padding: '12px 14px' }}
              >
                <Sparkles size={16} color={aiApiKey ? 'var(--cyan-400)' : 'var(--text-dim)'} />
              </button>
            </div>

            {/* Optional Gemini AI Agent Key Bar */}
            {showAiKeyInput && (
              <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.80rem', color: 'var(--cyan-400)', fontWeight: 600 }}>
                  🤖 Multimodal AI Agent Key (Gemini):
                </span>
                <input
                  type="password"
                  placeholder="Paste Gemini API Key (optional - free from aistudio.google.com)..."
                  value={aiApiKey}
                  onChange={(e) => setAiApiKey(e.target.value)}
                  style={{
                    flex: '1 1 300px',
                    padding: '8px 12px',
                    background: 'rgba(0,0,0,0.4)',
                    border: '1px solid var(--border-highlight)',
                    borderRadius: 'var(--radius-sm)',
                    color: '#fff',
                    fontSize: '0.82rem'
                  }}
                />
                <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                  {aiApiKey ? '✓ AI Key Active' : 'Heuristic frame engine runs automatically if empty.'}
                </span>
              </div>
            )}
          </div>

          {!currentBreakdown ? (
            <div className="glass-panel" style={{ padding: '60px 20px', textAlign: 'center' }}>
              <BarChart3 size={48} color="var(--gold-400)" style={{ margin: '0 auto 16px auto', display: 'block' }} />
              <h3 style={{ fontSize: '1.35rem', marginBottom: '8px', fontWeight: 800 }}>Paste Video URL or Select Any Outlier</h3>
              <p style={{ color: 'var(--text-muted)', maxWidth: '580px', margin: '0 auto 24px auto', fontSize: '0.92rem', lineHeight: 1.55 }}>
                Analyzes the entire video frame-by-frame and second-by-second before making decisions. Pinpoints the exact visual hook, audio sync moments, psychological viral triggers, and generates an executive Social Media Director Remake Playbook.
              </p>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleAnalyzeUrl('https://www.instagram.com/p/Dbvj6ykiBgi/')}
                  disabled={isAnalyzing}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  <Flame size={16} /> 💈 AHL Outlier: 1.3 Lakh Views Scalp Masterpiece
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    const firstRadarCandidate = radarCandidates.find((c) => c.viewCount >= 100000) || radarCandidates[0];
                    if (firstRadarCandidate) {
                      handleAnalyzeUrl(firstRadarCandidate.url, firstRadarCandidate);
                    } else {
                      handleAnalyzeUrl('https://www.instagram.com/p/Dbvj6ykiBgi/');
                    }
                  }}
                  disabled={isAnalyzing}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  <Sparkles size={16} /> ✨ Analyze Top Radar Candidate
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Header Banner */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                  <div style={{ flex: '1 1 500px' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                      <span className={`platform-pill ${currentBreakdown.platform}`}>
                        {currentBreakdown.platform === 'youtube' ? '▶ YouTube' : '📸 Instagram Reel'}
                      </span>
                      <span className={`outlier-badge ${getOutlierBadgeClass(currentBreakdown.metrics.outlierMultiplier)}`}>
                        <Flame size={12} /> {currentBreakdown.metrics.outlierMultiplier}x Outlier ({currentBreakdown.metrics.viralityTier})
                      </span>
                      <span style={{ fontSize: '0.76rem', color: 'var(--text-dim)' }}>
                        Active for {currentBreakdown.daysActive} days
                      </span>
                    </div>

                    <h2 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '6px', lineHeight: 1.35 }}>
                      {currentBreakdown.title}
                    </h2>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                      <span>Creator: <strong>@{currentBreakdown.creator.username}</strong> ({currentBreakdown.creator.displayName})</span>
                      {currentBreakdown.creator.subscribersOrFollowers ? (
                        <>
                          <span>•</span>
                          <span>{currentBreakdown.creator.subscribersOrFollowers.toLocaleString()} Subscribers</span>
                        </>
                      ) : null}
                      <span>•</span>
                      <span>Published {new Date(currentBreakdown.publishedAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn btn-whatsapp"
                      onClick={() => handleOpenWhatsAppModal(currentBreakdown, currentCandidate || undefined)}
                      title="Send detailed outlier report to Sir on WhatsApp"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                    >
                      <WhatsAppIcon size={16} color="#fff" /> Send to Sir on WhatsApp
                    </button>

                    {currentCandidate && (() => {
                      const isSaved = boardItems.some((b) => b.candidate.url === currentCandidate.url || b.candidate.id === currentCandidate.id);
                      return (
                        <button
                          className={`btn ${isSaved ? 'btn-outline' : 'btn-primary'}`}
                          style={isSaved ? { color: 'var(--emerald-500)', borderColor: 'var(--emerald-500)' } : {}}
                          onClick={() => handleAddToBoard(currentCandidate, currentBreakdown)}
                        >
                          {isSaved ? <Check size={16} /> : <Bookmark size={16} />} {isSaved ? 'Saved in Library' : 'Save to Library'}
                        </button>
                      );
                    })()}
                    <a
                      href={currentBreakdown.candidateUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-outline"
                    >
                      <ExternalLink size={16} /> Open Video
                    </a>
                  </div>
                </div>

                {/* 5 Core Quantitative Metrics Tiles */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginTop: '20px', paddingTop: '18px', borderTop: '1px solid var(--border-subtle)' }}>
                  <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>Total Views vs Baseline</div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fff', marginTop: '4px' }}>
                      {currentBreakdown.metrics.viewCount.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--gold-400)', marginTop: '2px' }}>
                      Baseline: ~{currentBreakdown.creator.medianViews.toLocaleString()} ({currentBreakdown.metrics.outlierMultiplier}x multiplier)
                    </div>
                  </div>

                  <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>Follower Reach Multiplier</div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--gold-400)', marginTop: '4px' }}>
                      {(() => {
                        const subs = currentBreakdown.creator.subscribersOrFollowers || currentCandidate?.creator.subscriberOrFollowerCount;
                        const ratio = currentCandidate?.viewToFollowerRatio || (subs ? Number((currentBreakdown.metrics.viewCount / subs).toFixed(1)) : null);
                        return ratio ? `🚀 ${ratio}x Reach` : 'N/A';
                      })()}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--cyan-400)', marginTop: '2px' }}>
                      {(() => {
                        const subs = currentBreakdown.creator.subscribersOrFollowers || currentCandidate?.creator.subscriberOrFollowerCount;
                        return subs 
                          ? `Views ÷ ${subs >= 100000 ? `${(subs / 100000).toFixed(1)} Lakh` : `${(subs / 1000).toFixed(0)}k`} audience`
                          : 'Views ÷ Follower count';
                      })()}
                    </div>
                  </div>

                  <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>Engagement Rate</div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--cyan-400)', marginTop: '4px' }}>
                      {currentBreakdown.metrics.engagementRatePercent}%
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {currentBreakdown.metrics.likeCount.toLocaleString()} likes • {currentBreakdown.metrics.commentCount.toLocaleString()} comments
                    </div>
                  </div>

                  <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>View Velocity</div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--emerald-500)', marginTop: '4px' }}>
                      ~{currentBreakdown.metrics.velocityViewsPerDay.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Average views per day since release
                    </div>
                  </div>

                  <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>Comment Intensity</div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--purple-500)', marginTop: '4px' }}>
                      {currentBreakdown.metrics.commentRatePercent}%
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Comments ÷ Views (high = strong buying/curiosity intent)
                    </div>
                  </div>
                </div>
              </div>

              {/* Creator Recent Uploads Benchmark (if available) */}
              {currentBreakdown.creator.recentUploads && currentBreakdown.creator.recentUploads.length > 0 && (
                <div className="glass-panel" style={{ padding: '24px' }}>
                  <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--gold-400)', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <User size={15} /> Creator's Recent Uploads vs This Outlier Video
                  </div>
                  <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
                    True outlier verification: Comparing this video's {currentBreakdown.metrics.viewCount.toLocaleString()} views against the creator's other recent uploads.
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
                    {currentBreakdown.creator.recentUploads.slice(0, 6).map((upload, idx) => (
                      <div key={idx} style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255, 255, 255, 0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '0.82rem', color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                          {upload.title}
                        </span>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: upload.views > currentBreakdown.creator.medianViews ? 'var(--gold-400)' : 'var(--text-dim)' }}>
                          {upload.views.toLocaleString()} views
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Content Decomposition & Narrative Breakdown */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                {/* Left Card: Hook & Content Mechanics */}
                <div className="glass-panel" style={{ padding: '24px' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--cyan-400)', textTransform: 'uppercase', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Flame size={15} /> Content & Hook Architecture
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>Hook Headline / Opening Line</span>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', marginTop: '2px' }}>
                      "{currentBreakdown.contentAnalysis.hookHeadline}"
                    </div>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>Hook Mechanism</span>
                    <div style={{ fontSize: '0.88rem', color: 'var(--gold-400)', marginTop: '2px', fontWeight: 600 }}>
                      {currentBreakdown.contentAnalysis.hookMechanism}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                    <div>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>Core Topic</span>
                      <div style={{ fontSize: '0.86rem', color: '#f1f5f9', marginTop: '2px' }}>
                        {currentBreakdown.contentAnalysis.coreTopic}
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>Format Classification</span>
                      <div style={{ fontSize: '0.86rem', color: '#f1f5f9', marginTop: '2px' }}>
                        {currentBreakdown.contentAnalysis.formatType}
                      </div>
                    </div>
                  </div>

                  {/* Audio info */}
                  <div style={{ marginBottom: '16px' }}>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>Audio / Music Track</span>
                    <div style={{ fontSize: '0.86rem', color: 'var(--purple-500)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Music size={14} /> {currentBreakdown.contentAnalysis.audioOrMusicTrack}
                    </div>
                  </div>

                  {/* Key Angles */}
                  <div>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>Key Value Angles Highlighted</span>
                    <ul style={{ fontSize: '0.84rem', color: 'var(--text-muted)', paddingLeft: '18px', marginTop: '6px', lineHeight: 1.5 }}>
                      {currentBreakdown.contentAnalysis.keyAnglesCovered.map((angle, idx) => (
                        <li key={idx} style={{ marginBottom: '4px' }}>{angle}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Hashtags */}
                  {currentBreakdown.contentAnalysis.extractedHashtags.length > 0 && (
                    <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--border-subtle)' }}>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>Extracted Hashtags</span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                        {currentBreakdown.contentAnalysis.extractedHashtags.map((tag, idx) => (
                          <span key={idx} style={{ fontSize: '0.76rem', background: 'rgba(255, 255, 255, 0.05)', padding: '3px 8px', borderRadius: '4px', color: 'var(--cyan-400)' }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Card: Real Audience Voice & Comments */}
                <div className="glass-panel" style={{ padding: '24px' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--emerald-500)', textTransform: 'uppercase', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MessageSquare size={15} /> Real Audience Voice & Inquiries
                  </div>

                  {/* Real Comments Section */}
                  {currentBreakdown.audienceVoice.realComments.length > 0 ? (
                    <div style={{ marginBottom: '20px' }}>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '8px' }}>
                        Real Top Comments ({currentBreakdown.audienceVoice.realComments.length} loaded):
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {currentBreakdown.audienceVoice.realComments.map((comment) => (
                          <div key={comment.id} style={{ background: 'rgba(0, 0, 0, 0.35)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255, 255, 255, 0.04)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--cyan-400)' }}>
                                {comment.author}
                              </span>
                              {comment.likeCount > 0 && (
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                  <ThumbsUp size={11} /> {comment.likeCount}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.84rem', color: '#f1f5f9', lineHeight: 1.35 }}>
                              {comment.text}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '16px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      Comments are disabled or parsed directly from caption engagement.
                    </div>
                  )}

                  {/* Inquiry Themes */}
                  <div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '8px' }}>
                      Key Viewer Themes & Curiosity Triggers:
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {currentBreakdown.audienceVoice.inquiryThemes.map((theme, idx) => (
                        <div key={idx} style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '10px', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--gold-500)' }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff' }}>
                            {theme.category}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px', fontStyle: 'italic' }}>
                            {theme.sampleText}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* FFmpeg Sequential Frame Stream & AI Social Media Expert Agent */}
              {currentBreakdown.strategistVerdict && (
                <div className="glass-panel" style={{ padding: '24px', border: '1px solid rgba(6, 182, 212, 0.4)', background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.05), rgba(0, 0, 0, 0.4))' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Video size={18} color="var(--cyan-400)" />
                      <span style={{ fontSize: '0.96rem', fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        FFmpeg Frame Stream & AI Social Media Expert
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.74rem', background: 'rgba(6, 182, 212, 0.15)', color: 'var(--cyan-400)', border: '1px solid rgba(6, 182, 212, 0.4)', padding: '3px 10px', borderRadius: '9999px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: (currentBreakdown.aiAgentAudit?.extractedFrames?.length || 0) > 1 ? 'var(--cyan-400)' : 'var(--gold-400)', display: 'inline-block' }} />
                        🎬 {(currentBreakdown.aiAgentAudit?.extractedFrames?.length || 0) > 1 
                          ? `${currentBreakdown.aiAgentAudit?.extractedFrames?.length} Frames (FFmpeg)` 
                          : '1 Cover Frame (Direct Stream Restricted)'}
                      </span>
                      <span style={{ fontSize: '0.74rem', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.4)', padding: '3px 10px', borderRadius: '9999px', fontWeight: 700 }}>
                        🤖 {currentBreakdown.aiAgentAudit?.agentModel || 'Gemini Social Media Director'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowSystemPrompt(!showSystemPrompt)}
                        style={{
                          fontSize: '0.74rem',
                          background: showSystemPrompt ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                          color: '#fff',
                          border: '1px solid var(--border-subtle)',
                          padding: '3px 10px',
                          borderRadius: '9999px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <FileText size={12} /> {showSystemPrompt ? 'Hide System Prompt' : 'View System Prompt'}
                      </button>
                      <span style={{ fontSize: '0.78rem', background: 'rgba(245, 158, 11, 0.15)', color: 'var(--gold-400)', border: '1px solid rgba(245, 158, 11, 0.4)', padding: '3px 10px', borderRadius: '9999px', fontWeight: 700 }}>
                        Viral Score: {currentBreakdown.strategistVerdict.viralScoreOut100}/100
                      </span>
                    </div>
                  </div>

                  {/* Collapsible System Prompt Inspector */}
                  {showSystemPrompt && (
                    <div style={{ background: 'rgba(0, 0, 0, 0.6)', border: '1px solid rgba(6, 182, 212, 0.3)', borderRadius: 'var(--radius-sm)', padding: '14px', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--cyan-400)', textTransform: 'uppercase' }}>
                          📜 AI Agent Active System Prompt (Social Media Director)
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Strict Multimodal Frame Directive</span>
                      </div>
                      <pre style={{ fontSize: '0.78rem', color: '#cbd5e1', whiteSpace: 'pre-wrap', fontFamily: 'monospace', lineHeight: 1.5, margin: 0 }}>
                        {currentBreakdown.aiAgentAudit?.systemPrompt || `You are a world-class Short-Form Social Media Expert, Creative Director, and Viral Growth Strategist.
You analyze video frames extracted via FFmpeg along with retention metrics to reverse-engineer viral outlier performance.
Your mission:
Carefully inspect all frames extracted through FFmpeg from this short-form video.
1. The Winning Element: A single, sharp statement identifying the visual hook, camera angle, or high-contrast mechanism seen in these frames that stopped the viewer from scrolling.
2. The One Thing That Makes This An Outlier: In EXACTLY 2 to 3 concise, punchy sentences, define the single deciding factor that made this video an outlier compared to ordinary content on the platform.`}
                      </pre>
                    </div>
                  )}

                  {/* FFmpeg Extracted Keyframes Reel */}
                  {currentBreakdown.aiAgentAudit?.extractedFrames && currentBreakdown.aiAgentAudit.extractedFrames.length > 0 && (
                    <div style={{ marginBottom: '22px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Layers size={14} color="var(--cyan-400)" />
                          {currentBreakdown.aiAgentAudit.extractedFrames.length > 1
                            ? `Sequential FFmpeg Extracted Frames (${currentBreakdown.aiAgentAudit.extractedFrames.length} Analyzed)`
                            : `Platform Cover Poster Frame (Direct video stream restricted by platform)`}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                          Click any frame to inspect high-res trigger
                        </span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
                        {currentBreakdown.aiAgentAudit.extractedFrames.map((frame, idx) => (
                          <div
                            key={idx}
                            onClick={() => setSelectedFramePreview(frame)}
                            style={{
                              background: 'rgba(0, 0, 0, 0.45)',
                              border: '1px solid rgba(255, 255, 255, 0.08)',
                              borderRadius: 'var(--radius-sm)',
                              overflow: 'hidden',
                              cursor: 'pointer',
                              transition: 'transform 0.15s ease, border-color 0.15s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.borderColor = 'var(--cyan-400)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                            }}
                          >
                            <div style={{ position: 'relative', width: '100%', height: '110px', background: '#0a0a0a' }}>
                              <img
                                src={frame.dataUrl}
                                alt={`FFmpeg Frame ${frame.index}`}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                              <div style={{ position: 'absolute', top: '4px', left: '4px', background: 'rgba(0,0,0,0.75)', color: '#fff', fontSize: '0.68rem', fontWeight: 700, padding: '2px 5px', borderRadius: '3px' }}>
                                {frame.timestamp}
                              </div>
                              {frame.retentionScore && (
                                <div style={{ position: 'absolute', bottom: '4px', right: '4px', background: 'rgba(16, 185, 129, 0.85)', color: '#fff', fontSize: '0.64rem', fontWeight: 800, padding: '1px 5px', borderRadius: '3px' }}>
                                  {frame.retentionScore}%
                                </div>
                              )}
                            </div>
                            <div style={{ padding: '6px 8px' }}>
                              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {frame.label || `Frame ${frame.index}`}
                              </div>
                              <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)', marginTop: '2px', lineHeight: 1.25, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {frame.visualTrigger || 'Key visual trigger'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Core Deliverable 1: The Winning Element */}
                  <div style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(0, 0, 0, 0.4))', border: '1px solid rgba(245, 158, 11, 0.4)', borderRadius: 'var(--radius-sm)', padding: '16px 18px', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <Flame size={16} color="var(--gold-400)" />
                      <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--gold-400)', letterSpacing: '0.05em' }}>
                        🎯 The Winning Element (Identified from FFmpeg Frames)
                      </span>
                    </div>
                    <div style={{ fontSize: '1.02rem', fontWeight: 700, color: '#fff', lineHeight: 1.45 }}>
                      {currentBreakdown.aiAgentAudit?.winningElement || currentBreakdown.strategistVerdict.theUnfairAdvantage}
                    </div>
                  </div>

                  {/* Core Deliverable 2: The One Thing That Makes This Video An Outlier (2-3 Sentences) */}
                  <div style={{ background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1), rgba(147, 51, 234, 0.1))', border: '1px solid rgba(6, 182, 212, 0.4)', borderRadius: 'var(--radius-sm)', padding: '18px 20px', marginBottom: '18px', position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <Sparkles size={16} color="var(--cyan-400)" />
                      <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--cyan-400)', letterSpacing: '0.05em' }}>
                        ⚡ The One Thing That Makes This An Outlier (Social Media Expert Verdict — 2-3 Sentences)
                      </span>
                    </div>
                    <p style={{ fontSize: '0.98rem', color: '#f8fafc', lineHeight: 1.65, fontWeight: 500, margin: 0, fontStyle: 'italic' }}>
                      "{currentBreakdown.aiAgentAudit?.theOneOutlierThing || currentBreakdown.strategistVerdict.executiveVerdict}"
                    </p>
                  </div>

                  {/* Supporting Strategic Advantage Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                    <div style={{ background: 'rgba(0, 0, 0, 0.35)', padding: '16px', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--cyan-400)' }}>
                      <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--cyan-400)' }}>
                        ⚡ The Unfair Advantage (Secret Sauce)
                      </span>
                      <p style={{ fontSize: '0.86rem', color: '#e2e8f0', marginTop: '6px', lineHeight: 1.5 }}>
                        {currentBreakdown.strategistVerdict.theUnfairAdvantage}
                      </p>
                    </div>

                    <div style={{ background: 'rgba(0, 0, 0, 0.35)', padding: '16px', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--purple-400)' }}>
                      <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--purple-400)' }}>
                        🧠 Viewer Psychological Trigger
                      </span>
                      <p style={{ fontSize: '0.86rem', color: '#e2e8f0', marginTop: '6px', lineHeight: 1.5 }}>
                        {currentBreakdown.strategistVerdict.psychologicalTrigger}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Second-by-Second Frame Timeline & Audio Analysis */}
              {currentBreakdown.deepVisualAnalysis && (
                <div className="glass-panel" style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Layers size={18} color="var(--gold-400)" />
                      <span style={{ fontSize: '0.96rem', fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Second-By-Second Frame Analysis & Sound Design
                      </span>
                    </div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                      Analyzed across key algorithmic watch-time phases
                    </span>
                  </div>

                  {/* Visual Hook & Audio Strategy Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginBottom: '22px' }}>
                    {/* Visual Hook Box */}
                    <div style={{ background: 'rgba(0, 0, 0, 0.35)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--gold-400)', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Eye size={15} /> Primary Visual Hook (Where & How Used)
                      </div>
                      <div style={{ marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>What Is Shown On Screen:</span>
                        <div style={{ fontSize: '0.86rem', color: '#f1f5f9', fontWeight: 600, marginTop: '2px' }}>
                          {currentBreakdown.deepVisualAnalysis.winningVisualHook.whatIsShown}
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '8px' }}>
                        <div>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>Camera Framing:</span>
                          <div style={{ fontSize: '0.82rem', color: '#cbd5e1', marginTop: '2px' }}>
                            {currentBreakdown.deepVisualAnalysis.winningVisualHook.cameraAngleAndFraming}
                          </div>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>Exact Timing:</span>
                          <div style={{ fontSize: '0.82rem', color: 'var(--cyan-400)', fontWeight: 600, marginTop: '2px' }}>
                            {currentBreakdown.deepVisualAnalysis.winningVisualHook.exactTiming}
                          </div>
                        </div>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>Why It Stops The Thumb:</span>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {currentBreakdown.deepVisualAnalysis.winningVisualHook.whyItStopsTheScroll}
                        </div>
                      </div>
                    </div>

                    {/* Audio Strategy Box */}
                    <div style={{ background: 'rgba(0, 0, 0, 0.35)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--purple-400)', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Music size={15} /> Audio & Song Strategy
                      </div>
                      <div style={{ marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>Track & Audio Type:</span>
                        <div style={{ fontSize: '0.86rem', color: '#f1f5f9', fontWeight: 600, marginTop: '2px' }}>
                          🎵 {currentBreakdown.deepVisualAnalysis.audioAndMusicStrategy.trackName} ({currentBreakdown.deepVisualAnalysis.audioAndMusicStrategy.audioType})
                        </div>
                      </div>
                      <div style={{ marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>Audio-Visual Sync Moment:</span>
                        <div style={{ fontSize: '0.82rem', color: '#cbd5e1', marginTop: '2px' }}>
                          {currentBreakdown.deepVisualAnalysis.audioAndMusicStrategy.syncMomentWithVisuals}
                        </div>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>Algorithmic Audio Impact:</span>
                        <div style={{ fontSize: '0.82rem', color: 'var(--purple-300, #c084fc)', marginTop: '2px' }}>
                          {currentBreakdown.deepVisualAnalysis.audioAndMusicStrategy.trendingStatus}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Frame Timeline Cards */}
                  <div style={{ fontSize: '0.80rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '10px' }}>
                    Frame Progression (Timeline):
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {currentBreakdown.deepVisualAnalysis.frameByFrameTimeline.map((seg, idx) => (
                      <div key={idx} style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '14px 18px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255, 255, 255, 0.05)', display: 'grid', gridTemplateColumns: '130px 180px 1fr', gap: '14px', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontSize: '0.80rem', fontWeight: 800, color: 'var(--gold-400)', background: 'rgba(245, 158, 11, 0.1)', padding: '3px 8px', borderRadius: '4px' }}>
                            ⏱ {seg.timestamp}
                          </span>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff' }}>
                            {seg.phase}
                          </span>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                            {seg.cameraFraming}
                          </div>
                        </div>
                        <div style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.45 }}>
                          <div><strong>Visual Action:</strong> {seg.visualAction}</div>
                          <div style={{ color: 'var(--text-dim)', fontSize: '0.78rem', marginTop: '2px' }}><strong>Sound Design:</strong> {seg.soundSync}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* WhatsApp Forward to Sir Banner */}
              <div className="whatsapp-callout-panel">
                <div style={{ flex: '1 1 360px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <WhatsAppIcon size={22} color="#25D366" />
                    <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff' }}>
                      Forward Outlier Intelligence Brief to Sir
                    </span>
                    <span style={{ fontSize: '0.72rem', background: 'rgba(37, 211, 102, 0.2)', color: '#25D366', padding: '2px 8px', borderRadius: '9999px', fontWeight: 700 }}>
                      Direct WhatsApp Redirect
                    </span>
                  </div>
                  <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                    Share this video's exact viral reverse-engineering breakdown with Sir — including video link, follower reach multiplier, scroll-stopping visual hook, and strategic remake takeaway.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={handleCopyWhatsAppMessage}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    {copiedWhatsApp ? <Check size={16} color="var(--emerald-500)" /> : <Copy size={16} />}
                    {copiedWhatsApp ? 'Copied Brief' : 'Copy Text'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-sheet"
                    onClick={() => handleLogToSheet(currentBreakdown, currentCandidate || undefined, false)}
                    disabled={isLoggingToSheet}
                    style={{ padding: '12px 18px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                    title="Save this outlier record into Sir's Google Sheet"
                  >
                    <FileSpreadsheet size={16} /> Save to Google Sheet
                  </button>
                  <button
                    type="button"
                    className="btn btn-whatsapp"
                    onClick={() => handleOpenWhatsAppModal(currentBreakdown, currentCandidate || undefined)}
                    style={{ padding: '12px 22px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                  >
                    <WhatsAppIcon size={18} color="#fff" /> Send to Sir on WhatsApp →
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      )}

      {/* ========================================================
          TAB 3: SAVED OUTLIERS LIBRARY (RESEARCH BOARD)
         ======================================================== */}
      {activeTab === 'board' && (
        <main>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Saved Outliers Research Library</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                Curate, benchmark, and categorize high-performing viral videos across niches.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => fetchBoardData(true)}
                disabled={isRefreshingBoard}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <RefreshCw size={14} className={isRefreshingBoard ? 'spin' : ''} />
                {isRefreshingBoard ? 'Refreshing...' : 'Refresh Library'}
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setActiveTab('radar')}
              >
                <Plus size={14} /> Discover More Outliers
              </button>
            </div>
          </div>

          <div className="kanban-grid">
            {/* COLUMN 1: SAVED */}
            <div className="kanban-col">
              <div className="kanban-col-header">
                <div className="kanban-title" style={{ color: 'var(--cyan-400)' }}>
                  <Bookmark size={16} /> Saved Outliers
                </div>
                <span className="kanban-count">
                  {boardItems.filter((it) => it.status === 'saved' || it.status === 'new').length}
                </span>
              </div>

              <div className="kanban-cards">
                {boardItems.filter((it) => it.status === 'saved' || it.status === 'new').map((item) => (
                  <div key={item.id} className="board-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <span className={`platform-pill ${item.candidate.platform}`}>
                        {item.candidate.platform}
                      </span>
                      <span className={`outlier-badge ${getOutlierBadgeClass(item.candidate.outlierMultiplier)}`} style={{ fontSize: '0.7rem' }}>
                        {getOutlierTierLabel(item.candidate)}
                      </span>
                    </div>

                    <div style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: '6px', lineHeight: 1.35 }}>
                      {item.candidate.title}
                    </div>

                    <div style={{ fontSize: '0.76rem', color: 'var(--text-dim)', marginBottom: '10px' }}>
                      @{item.candidate.creator.username} • {item.candidate.viewCount.toLocaleString()} views
                    </div>

                    {item.notes && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--gold-400)', background: 'rgba(245, 158, 11, 0.08)', padding: '6px 8px', borderRadius: '4px', marginBottom: '8px' }}>
                        📝 {item.notes}
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          className="btn btn-outline btn-sm"
                          style={{ padding: '4px 8px', fontSize: '0.74rem' }}
                          onClick={() => handleAnalyzeUrl(item.candidate.url, item.candidate)}
                        >
                          <BarChart3 size={12} /> Deep Dive
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          style={{ padding: '4px 7px', color: '#25D366' }}
                          title="Send to Sir on WhatsApp"
                          onClick={() => handleOpenWhatsAppModal(item.breakdown, item.candidate)}
                        >
                          <WhatsAppIcon size={12} color="#25D366" />
                        </button>
                        {(() => {
                          const norm = normalizeUrlClient(item.candidate.url);
                          const isInSheet = trackerData.existingUrls.includes(norm);
                          return (
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              style={isInSheet ? { padding: '4px 7px', color: '#34d399', borderColor: '#059669', background: 'rgba(16, 185, 129, 0.1)' } : { padding: '4px 7px', color: '#34d399' }}
                              title={isInSheet ? "Logged in Sir's Google Sheet" : "Save this outlier to Sir's Google Sheet"}
                              onClick={() => handleLogToSheet(item.breakdown, item.candidate, false)}
                            >
                              <FileSpreadsheet size={12} /> {isInSheet ? 'Logged' : 'Sheet'}
                            </button>
                          );
                        })()}
                      </div>

                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          className="btn btn-primary btn-sm"
                          style={{ padding: '4px 10px', fontSize: '0.74rem' }}
                          onClick={() => handleUpdateBoardStatus(item.id, 'analyzing')}
                        >
                          Analyze →
                        </button>
                        <button
                          style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '4px' }}
                          onClick={() => handleDeleteBoardItem(item.id)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* COLUMN 2: ANALYZING */}
            <div className="kanban-col">
              <div className="kanban-col-header">
                <div className="kanban-title" style={{ color: 'var(--gold-400)' }}>
                  <BarChart3 size={16} /> Under Analysis
                </div>
                <span className="kanban-count">
                  {boardItems.filter((it) => it.status === 'analyzing' || it.status === 'approved').length}
                </span>
              </div>

              <div className="kanban-cards">
                {boardItems.filter((it) => it.status === 'analyzing' || it.status === 'approved').map((item) => (
                  <div key={item.id} className="board-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <span className={`platform-pill ${item.candidate.platform}`}>
                        {item.candidate.platform}
                      </span>
                      <span className={`outlier-badge ${getOutlierBadgeClass(item.candidate.outlierMultiplier)}`} style={{ fontSize: '0.7rem' }}>
                        {getOutlierTierLabel(item.candidate)}
                      </span>
                    </div>

                    <div style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: '6px', lineHeight: 1.35 }}>
                      {item.candidate.title}
                    </div>

                    {/* Notes editing */}
                    {editingItemNotes?.id === item.id ? (
                      <div style={{ marginBottom: '8px' }}>
                        <textarea
                          value={editingItemNotes.notes}
                          onChange={(e) => setEditingItemNotes({ id: item.id, notes: e.target.value })}
                          rows={2}
                          style={{ width: '100%', fontSize: '0.78rem', background: '#000', color: '#fff', border: '1px solid var(--border-highlight)', borderRadius: '4px', padding: '6px' }}
                        />
                        <button
                          className="btn btn-primary btn-sm"
                          style={{ padding: '3px 8px', fontSize: '0.72rem', marginTop: '4px' }}
                          onClick={() => handleSaveNotes(item.id, editingItemNotes.notes)}
                        >
                          Save Notes
                        </button>
                      </div>
                    ) : (
                      <div
                        style={{ fontSize: '0.76rem', color: item.notes ? 'var(--gold-400)' : 'var(--text-dim)', marginBottom: '8px', cursor: 'pointer' }}
                        onClick={() => setEditingItemNotes({ id: item.id, notes: item.notes || '' })}
                      >
                        {item.notes ? `📝 ${item.notes}` : '+ Add research notes / observation...'}
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          className="btn btn-outline btn-sm"
                          style={{ padding: '4px 8px', fontSize: '0.74rem' }}
                          onClick={() => handleAnalyzeUrl(item.candidate.url, item.candidate)}
                        >
                          <BarChart3 size={12} /> Deep Dive
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          style={{ padding: '4px 7px', color: '#25D366' }}
                          title="Send to Sir on WhatsApp"
                          onClick={() => handleOpenWhatsAppModal(item.breakdown, item.candidate)}
                        >
                          <WhatsAppIcon size={12} color="#25D366" />
                        </button>
                        {(() => {
                          const norm = normalizeUrlClient(item.candidate.url);
                          const isInSheet = trackerData.existingUrls.includes(norm);
                          return (
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              style={isInSheet ? { padding: '4px 7px', color: '#34d399', borderColor: '#059669', background: 'rgba(16, 185, 129, 0.1)' } : { padding: '4px 7px', color: '#34d399' }}
                              title={isInSheet ? "Logged in Sir's Google Sheet" : "Save this outlier to Sir's Google Sheet"}
                              onClick={() => handleLogToSheet(item.breakdown, item.candidate, false)}
                            >
                              <FileSpreadsheet size={12} /> {isInSheet ? 'Logged' : 'Sheet'}
                            </button>
                          );
                        })()}
                      </div>

                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          className="btn btn-outline btn-sm"
                          style={{ padding: '4px 6px', fontSize: '0.74rem' }}
                          onClick={() => handleUpdateBoardStatus(item.id, 'saved')}
                        >
                          ←
                        </button>
                        <button
                          className="btn btn-cyan btn-sm"
                          style={{ padding: '4px 10px', fontSize: '0.74rem' }}
                          onClick={() => handleUpdateBoardStatus(item.id, 'benchmarked')}
                        >
                          Benchmark →
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* COLUMN 3: BENCHMARKED */}
            <div className="kanban-col">
              <div className="kanban-col-header">
                <div className="kanban-title" style={{ color: 'var(--purple-500)' }}>
                  <TrendingUp size={16} /> Benchmarked
                </div>
                <span className="kanban-count">
                  {boardItems.filter((it) => it.status === 'benchmarked' || it.status === 'shot').length}
                </span>
              </div>

              <div className="kanban-cards">
                {boardItems.filter((it) => it.status === 'benchmarked' || it.status === 'shot').map((item) => (
                  <div key={item.id} className="board-card">
                    <div style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: '6px', lineHeight: 1.35 }}>
                      {item.candidate.title}
                    </div>

                    <div style={{ fontSize: '0.76rem', color: 'var(--text-dim)', marginBottom: '8px' }}>
                      Baseline comparison verified ({item.candidate.outlierMultiplier}x).
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
                      <button
                        className="btn btn-outline btn-sm"
                        style={{ padding: '4px 6px', fontSize: '0.74rem' }}
                        onClick={() => handleUpdateBoardStatus(item.id, 'analyzing')}
                      >
                        ←
                      </button>
                      <button
                        className="btn btn-primary btn-sm"
                        style={{ padding: '4px 10px', fontSize: '0.74rem', background: 'var(--emerald-500)' }}
                        onClick={() => handleUpdateBoardStatus(item.id, 'actionable')}
                      >
                        Actionable →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* COLUMN 4: ACTIONABLE */}
            <div className="kanban-col">
              <div className="kanban-col-header">
                <div className="kanban-title" style={{ color: 'var(--emerald-500)' }}>
                  <CheckCircle size={16} /> Actionable Formats
                </div>
                <span className="kanban-count">
                  {boardItems.filter((it) => it.status === 'actionable' || it.status === 'posted').length}
                </span>
              </div>

              <div className="kanban-cards">
                {boardItems.filter((it) => it.status === 'actionable' || it.status === 'posted').map((item) => (
                  <div key={item.id} className="board-card" style={{ borderLeft: '3px solid var(--emerald-500)' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: '6px', lineHeight: 1.35 }}>
                      {item.candidate.title}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--emerald-500)', fontWeight: 600 }}>
                      ✓ High Outlier Pattern Verified
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      )}

      {/* ========================================================
          TAB 4: TEAM TRACKER & GOOGLE SHEET
         ======================================================== */}
      {activeTab === 'tracker' && (
        <main>
          {/* Top Banner */}
          <div className="glass-panel" style={{ padding: '28px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '1.4rem' }}>📊</span>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                    Social Media Team Daily Outlier Tracker
                  </h2>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: 0, maxWidth: '780px', lineHeight: 1.6 }}>
                  Sir’s directive: 3 social media team members must identify & submit <strong>10 viral outliers daily</strong> (Total target: <strong>30 outliers/day</strong>).
                  All submissions are synced directly to Sir's Google Sheet in the shared Drive folder. Duplicates are strictly prevented across the entire team!
                </p>
              </div>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={handleOpenEditTeamModal}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', borderColor: 'var(--gold-400)', color: 'var(--gold-400)' }}
                  title="Update member names, roles, or add team members"
                >
                  <Settings size={15} /> Edit Team & Quotas
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    fetchTrackerData();
                    fetchTeamMembers();
                    showToast('Tracker data synced with Google Sheets! 🔄');
                  }}
                  title="Sync latest rows from Google Sheet"
                >
                  <RefreshCw size={15} /> Refresh
                </button>
              </div>
            </div>

            {/* Active User Selector Strip */}
            <div style={{ background: 'rgba(0, 0, 0, 0.35)', padding: '16px 20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-highlight)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Users size={18} color="var(--cyan-400)" />
                <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#e2e8f0' }}>
                  Current Active Team Member:
                </span>
                <select
                  value={teamMember}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTeamMember(val);
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('social_member_name', val);
                    }
                    showToast(`Active member set to: ${val}`);
                  }}
                  style={{
                    padding: '8px 14px',
                    background: 'rgba(15, 23, 42, 0.9)',
                    border: '1px solid var(--border-highlight)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--gold-400)',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {teamMembers.map(m => (
                    <option key={m.id || m.name} value={m.name}>{m.name} ({m.dailyTarget}/day)</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleOpenEditTeamModal}
                  style={{ background: 'transparent', border: 'none', color: 'var(--cyan-400)', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'underline' }}
                >
                  <Edit3 size={13} /> Edit Roster
                </button>
              </div>

              <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>
                Target: {teamMembers.find(m => m.name === teamMember)?.dailyTarget || 10} daily outliers sent to Sir on WhatsApp & logged into Sheet
              </div>
            </div>
          </div>

          {/* Daily Quota Progress Cards (Dynamic Members + Team Total) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px', marginBottom: '28px' }}>
            {teamMembers.map((m) => {
              const count = trackerData.memberCounts[m.name] || 0;
              const target = m.dailyTarget || 10;
              const pct = Math.min(100, Math.round((count / target) * 100));
              const isMe = teamMember === m.name;
              return (
                <div
                  key={m.id || m.name}
                  className="tracker-card"
                  style={{
                    border: isMe ? '1px solid var(--gold-400)' : '1px solid var(--border-subtle)',
                    background: isMe ? 'rgba(245, 158, 11, 0.06)' : 'rgba(15, 23, 42, 0.65)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '1rem' }}>👤</span>
                        <span style={{ fontSize: '0.92rem', fontWeight: 700, color: isMe ? 'var(--gold-400)' : '#fff' }}>
                          {m.name}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                        {m.role || 'Social Media Specialist'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {isMe && (
                        <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: '9999px', background: 'var(--gold-400)', color: '#000', fontWeight: 800 }}>
                          YOU
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={handleOpenEditTeamModal}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '2px' }}
                        title="Edit this member's details"
                      >
                        <Edit3 size={13} />
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '8px 0 4px 0' }}>
                    <span style={{ fontSize: '2rem', fontWeight: 800, color: count >= target ? 'var(--emerald-500)' : '#fff' }}>
                      {count}
                    </span>
                    <span style={{ fontSize: '0.92rem', color: 'var(--text-dim)' }}>
                      / {target} outliers today
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${pct}%`,
                        height: '100%',
                        background: count >= target ? 'linear-gradient(90deg, #10b981, #059669)' : 'linear-gradient(90deg, #f59e0b, #d97706)',
                        borderRadius: '9999px',
                        transition: 'width 0.4s ease'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                    <span>{pct}% Quota Done</span>
                    <span>{count >= target ? '✅ Target Met!' : `${target - count} remaining`}</span>
                  </div>

                  {m.notes && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontStyle: 'italic', marginTop: '6px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '6px' }}>
                      🎯 {m.notes}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Total Team Aggregate Card */}
            {(() => {
              const totalTarget = teamMembers.reduce((sum, item) => sum + (item.dailyTarget || 10), 0);
              const totalPct = totalTarget > 0 ? Math.min(100, Math.round((trackerData.todayCount / totalTarget) * 100)) : 0;
              return (
                <div className="tracker-card" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(5, 150, 105, 0.05) 100%)', border: '1px solid rgba(16, 185, 129, 0.35)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#34d399' }}>
                      🎯 Total Team Daily Quota
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                      Target: {totalTarget} / day
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '8px 0 4px 0' }}>
                    <span style={{ fontSize: '2rem', fontWeight: 800, color: '#34d399' }}>
                      {trackerData.todayCount}
                    </span>
                    <span style={{ fontSize: '0.92rem', color: 'var(--text-dim)' }}>
                      / {totalTarget} Outliers Sent
                    </span>
                  </div>

                  <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${totalPct}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #10b981, #34d399)',
                        borderRadius: '9999px',
                        transition: 'width 0.4s ease'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: '#a7f3d0', marginTop: '4px' }}>
                    <span>{totalPct}% Overall Progress</span>
                    <span>{trackerData.todayCount >= totalTarget ? '🎉 Sir\'s Daily Goal Reached!' : `${totalTarget - trackerData.todayCount} to go`}</span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Sir's Approval Workflow & Anti-Duplicate Architecture */}
          <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🛡️</span> Sir's Approval & Anti-Duplicate System Details
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              <div style={{ background: 'rgba(0, 0, 0, 0.35)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--emerald-400)', marginBottom: '6px' }}>
                  1. Automatic Duplicate Prevention
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                  Every video URL is automatically normalized (extracting clean YouTube Video IDs and Instagram Shortcodes). If Member 1 already logged or sent a video to Sir, Member 2 & 3 cannot submit the same video. The system immediately alerts who submitted it and when.
                </p>
              </div>

              <div style={{ background: 'rgba(0, 0, 0, 0.35)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--gold-400)', marginBottom: '6px' }}>
                  2. Sir's Approval Dropdown in Sheet
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                  Column P in the Google Sheet is pre-formatted with an interactive dropdown: <strong>Pending Review</strong> (Yellow), <strong>Approved by Sir</strong> (Green), <strong>Rejected by Sir</strong> (Red), <strong>Under Discussion</strong>, and <strong>Already Shot</strong> (Purple).
                </p>
              </div>

              <div style={{ background: 'rgba(0, 0, 0, 0.35)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--cyan-400)', marginBottom: '6px' }}>
                  3. Sir's Reason & Feedback Column
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                  Column Q is reserved for Sir's feedback (e.g. why rejected, what angle to shoot, or modification needed for American Hairline / Alchemane branding).
                </p>
              </div>
            </div>
          </div>

          {/* Live Google Sheet Outliers Feed Table */}
          <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '18px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.25rem' }}>📋</span>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                    Live Google Sheet Outliers Log
                  </h3>
                  <span
                    style={{
                      background: 'rgba(16, 185, 129, 0.15)',
                      color: '#34d399',
                      border: '1px solid rgba(16, 185, 129, 0.35)',
                      padding: '2px 10px',
                      borderRadius: '9999px',
                      fontSize: '0.74rem',
                      fontWeight: 700
                    }}
                  >
                    🟢 {trackerData.existingRecords.length} Outliers Recorded
                  </span>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                  Real-time sync from Sir's shared spreadsheet ('Outliers Tracker' tab).
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="Filter by title or creator..."
                  value={trackerSearchQuery}
                  onChange={(e) => setTrackerSearchQuery(e.target.value)}
                  style={{
                    background: 'rgba(0, 0, 0, 0.45)',
                    border: '1px solid var(--border-highlight)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '6px 12px',
                    color: '#fff',
                    fontSize: '0.82rem',
                    width: '200px'
                  }}
                />
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    fetchTrackerData();
                    showToast('Refreshed live rows from Google Sheet! 🔄');
                  }}
                  title="Reload rows from Google Sheet"
                >
                  <RefreshCw size={13} /> Refresh
                </button>
                <a
                  href={trackerData.sheetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-sheet"
                  style={{ fontSize: '0.78rem', padding: '6px 12px', textDecoration: 'none' }}
                >
                  <FileSpreadsheet size={13} /> Open Sheet ↗
                </a>
              </div>
            </div>

            {/* Member filter tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Filter Member:</span>
              <button
                type="button"
                onClick={() => setTrackerFilterMember('All')}
                style={{
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  border: trackerFilterMember === 'All' ? '1px solid var(--gold-400)' : '1px solid var(--border-subtle)',
                  background: trackerFilterMember === 'All' ? 'var(--gold-400)' : 'rgba(0,0,0,0.3)',
                  color: trackerFilterMember === 'All' ? '#000' : 'var(--text-muted)',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                All Members ({trackerData.existingRecords.length})
              </button>
              {teamMembers.map(m => {
                const count = trackerData.existingRecords.filter(r => r.submittedBy.toLowerCase().includes(m.name.toLowerCase())).length;
                const isSelected = trackerFilterMember.toLowerCase() === m.name.toLowerCase();
                return (
                  <button
                    key={m.id || m.name}
                    type="button"
                    onClick={() => setTrackerFilterMember(m.name)}
                    style={{
                      padding: '4px 12px',
                      borderRadius: '9999px',
                      border: isSelected ? '1px solid var(--cyan-400)' : '1px solid var(--border-subtle)',
                      background: isSelected ? 'var(--cyan-400)' : 'rgba(0,0,0,0.3)',
                      color: isSelected ? '#000' : 'var(--text-muted)',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {m.name} ({count})
                  </button>
                );
              })}
            </div>

            {/* Records Table */}
            {(() => {
              const filtered = trackerData.existingRecords.filter(r => {
                const matchesMember = trackerFilterMember === 'All' || r.submittedBy.toLowerCase().includes(trackerFilterMember.toLowerCase());
                const query = trackerSearchQuery.toLowerCase().trim();
                const matchesSearch = !query || 
                  (r.videoTitle || '').toLowerCase().includes(query) || 
                  (r.creator || '').toLowerCase().includes(query) ||
                  (r.rawUrl || '').toLowerCase().includes(query);
                return matchesMember && matchesSearch;
              });

              if (filtered.length === 0) {
                return (
                  <div style={{ textAlign: 'center', padding: '40px 20px', background: 'rgba(0,0,0,0.25)', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border-subtle)' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', margin: '0 0 10px 0' }}>
                      {trackerData.existingRecords.length === 0
                        ? "No outliers have been saved to Google Sheets yet! Use the 'Sheet' or 'Save' button on any video in Discovery Radar or Deep Dive to log your first outlier."
                        : "No logged outliers match the current filter."}
                    </p>
                  </div>
                );
              }

              return (
                <div style={{ overflowX: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ background: 'rgba(15, 23, 42, 0.9)', borderBottom: '1px solid var(--border-highlight)', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '10px 12px', width: '40px' }}>#</th>
                        <th style={{ padding: '10px 12px' }}>Platform & Video Title</th>
                        <th style={{ padding: '10px 12px' }}>Creator</th>
                        <th style={{ padding: '10px 12px' }}>Reach / Views</th>
                        <th style={{ padding: '10px 12px' }}>Logged By</th>
                        <th style={{ padding: '10px 12px' }}>Timestamp</th>
                        <th style={{ padding: '10px 12px' }}>Sir's Status</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((r, i) => {
                        const isApproved = r.status.toLowerCase().includes('approved');
                        const isRejected = r.status.toLowerCase().includes('rejected');
                        const statusClass = isApproved ? 'sheet-status-approved' : (isRejected ? 'sheet-status-rejected' : 'sheet-status-pending');
                        const isIG = (r.platform || '').toLowerCase().includes('instagram') || (r.rawUrl || '').includes('instagram.com');

                        return (
                          <tr
                            key={r.rawUrl + i}
                            style={{
                              borderBottom: '1px solid var(--border-subtle)',
                              background: i % 2 === 0 ? 'rgba(0, 0, 0, 0.2)' : 'transparent',
                              transition: 'background 0.15s'
                            }}
                          >
                            <td style={{ padding: '10px 12px', color: 'var(--text-dim)', fontWeight: 600 }}>
                              {r.rowNumber || (i + 2)}
                            </td>
                            <td style={{ padding: '10px 12px', maxWidth: '320px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                                <span className={`platform-pill ${isIG ? 'instagram' : 'youtube'}`} style={{ fontSize: '0.66rem', padding: '1px 6px' }}>
                                  {isIG ? 'IG Reels' : 'YT Shorts'}
                                </span>
                                {r.tier && (
                                  <span style={{ fontSize: '0.68rem', color: 'var(--gold-400)', fontWeight: 600 }}>
                                    {r.tier}
                                  </span>
                                )}
                              </div>
                              <div style={{ fontWeight: 600, color: '#fff', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {r.videoTitle || 'Untitled Video'}
                              </div>
                            </td>
                            <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>
                              {r.creator || '—'}
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              <div style={{ fontWeight: 700, color: '#34d399' }}>
                                {r.reachRatio ? `${r.reachRatio} Reach` : (r.outlierMultiplier ? `${r.outlierMultiplier} Multiplier` : '—')}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                                {r.views || '—'} views
                              </div>
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              <span style={{ background: 'rgba(245, 158, 11, 0.12)', color: 'var(--gold-400)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.74rem', fontWeight: 700 }}>
                                {r.submittedBy}
                              </span>
                            </td>
                            <td style={{ padding: '10px 12px', color: 'var(--text-dim)', fontSize: '0.76rem', whiteSpace: 'nowrap' }}>
                              {r.timestamp}
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              <span className={`sheet-status-badge ${statusClass}`} style={{ fontSize: '0.7rem' }}>
                                {r.status}
                              </span>
                              {r.feedback && (
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                  💬 {r.feedback}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                              <a
                                href={r.rawUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-outline btn-sm"
                                style={{ padding: '3px 8px', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                title="Open original video"
                              >
                                Video <ExternalLink size={11} />
                              </a>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        </main>
      )}

      {/* FFmpeg Frame Preview Modal */}
      {selectedFramePreview && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
          onClick={() => setSelectedFramePreview(null)}
        >
          <div
            style={{
              background: '#0f172a',
              border: '1px solid rgba(6, 182, 212, 0.4)',
              borderRadius: 'var(--radius-md)',
              maxWidth: '680px',
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Video size={18} color="var(--cyan-400)" />
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>
                  {selectedFramePreview.label || 'FFmpeg Extracted Keyframe'}
                </span>
                <span style={{ fontSize: '0.74rem', background: 'rgba(6, 182, 212, 0.15)', color: 'var(--cyan-400)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                  {selectedFramePreview.timestamp || 'Keyframe'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFramePreview(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ position: 'relative', width: '100%', maxHeight: '420px', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img
                src={selectedFramePreview.dataUrl}
                alt="Enlarged FFmpeg Frame"
                style={{ maxWidth: '100%', maxHeight: '420px', objectFit: 'contain' }}
              />
            </div>

            <div style={{ padding: '16px 20px', background: 'rgba(0, 0, 0, 0.3)' }}>
              <div style={{ fontSize: '0.76rem', textTransform: 'uppercase', color: 'var(--cyan-400)', fontWeight: 800, marginBottom: '4px' }}>
                Frame Visual Trigger & Algorithmic Impact
              </div>
              <p style={{ fontSize: '0.88rem', color: '#e2e8f0', margin: 0, lineHeight: 1.5 }}>
                {selectedFramePreview.visualTrigger || 'Keyframe extracted via FFmpeg for multimodal visual analysis.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Forward to Sir Modal */}
      {showWhatsAppModal && (() => {
        const breakdown = whatsAppTarget?.breakdown || currentBreakdown;
        const candidate = whatsAppTarget?.candidate || currentCandidate;
        const previewMessage = buildWhatsAppMessage(breakdown, candidate, sirNote, currentBrand);

        return (
          <div 
            className="whatsapp-modal-overlay"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowWhatsAppModal(false);
            }}
          >
            <div className="whatsapp-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="whatsapp-modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ background: '#25D366', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <WhatsAppIcon size={18} color="#fff" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                      Send Outlier Intelligence to Sir
                    </h3>
                    <p style={{ fontSize: '0.74rem', color: 'var(--text-dim)', margin: 0 }}>
                      Pre-formatted viral breakdown, reach metrics & video link for instant WhatsApp sending
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowWhatsAppModal(false)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '6px' }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="whatsapp-modal-body">
                {/* Team Member Selector & Daily Quota Header */}
                <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users size={16} color="var(--gold-400)" />
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#e2e8f0' }}>Submitting As:</span>
                    <select
                      value={teamMember}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTeamMember(val);
                        if (typeof window !== 'undefined') localStorage.setItem('social_member_name', val);
                      }}
                      style={{
                        padding: '5px 10px',
                        background: 'rgba(15, 23, 42, 0.9)',
                        border: '1px solid var(--border-highlight)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--gold-400)',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {teamMembers.map(m => (
                        <option key={m.id || m.name} value={m.name}>{m.name}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    Daily Quota: <strong style={{ color: (trackerData.memberCounts[teamMember] || 0) >= (teamMembers.find(m => m.name === teamMember)?.dailyTarget || 10) ? 'var(--emerald-500)' : 'var(--gold-400)' }}>
                      {trackerData.memberCounts[teamMember] || 0}/{teamMembers.find(m => m.name === teamMember)?.dailyTarget || 10}
                    </strong> today
                  </div>
                </div>

                {/* Duplicate Alert Banner */}
                {sheetDuplicateInfo?.isDuplicate && (
                  <div className="duplicate-alert-banner">
                    <AlertTriangle size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <div style={{ fontWeight: 700, color: '#fca5a5', marginBottom: '2px' }}>
                        DUPLICATE VIDEO DETECTED — ALREADY IN SIR'S SHEET
                      </div>
                      <div style={{ fontSize: '0.82rem' }}>
                        {sheetDuplicateInfo.message}
                      </div>
                      <div style={{ marginTop: '6px' }}>
                        <a
                          href={trackerData.sheetUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: '#fff', textDecoration: 'underline', fontSize: '0.76rem', fontWeight: 600 }}
                        >
                          Check live Google Sheet record ↗
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {/* Target Video Badge Card */}
                {(breakdown || candidate) && (
                  <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                        <span className={`platform-pill ${breakdown?.platform || candidate?.platform}`} style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                          {(breakdown?.platform || candidate?.platform) === 'youtube' ? 'YouTube' : 'Instagram'}
                        </span>
                        <span className={`outlier-badge ${getOutlierBadgeClass(breakdown?.metrics.outlierMultiplier || candidate?.outlierMultiplier || 1)}`} style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                          🔥 {(breakdown?.metrics.outlierMultiplier || candidate?.outlierMultiplier || 1)}x Outlier
                        </span>
                      </div>
                      <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {breakdown?.title || candidate?.title}
                      </div>
                    </div>
                    <a
                      href={breakdown?.candidateUrl || candidate?.url}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-outline btn-sm"
                      style={{ padding: '4px 8px', fontSize: '0.74rem', whiteSpace: 'nowrap' }}
                    >
                      <ExternalLink size={12} /> Test Link
                    </a>
                  </div>
                )}

                {/* Sir's Phone Number Input */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#e2e8f0', margin: 0 }}>
                      📞 Sir's WhatsApp Number
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.72rem', color: '#25D366', fontWeight: 600 }}>
                        ✓ Default: 9820188505
                      </span>
                      {sirPhone !== DEFAULT_SIR_PHONE && (
                        <button
                          type="button"
                          onClick={() => {
                            setSirPhone(DEFAULT_SIR_PHONE);
                            if (typeof window !== 'undefined') {
                              localStorage.setItem('sir_whatsapp_phone', DEFAULT_SIR_PHONE);
                            }
                          }}
                          style={{ background: 'transparent', border: 'none', color: 'var(--cyan-400)', fontSize: '0.72rem', cursor: 'pointer', textDecoration: 'underline' }}
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>
                  <input
                    type="text"
                    placeholder="+91 98201 88505 (Sir's Number)"
                    value={sirPhone}
                    onChange={(e) => {
                      setSirPhone(e.target.value);
                      if (typeof window !== 'undefined') {
                        localStorage.setItem('sir_whatsapp_phone', e.target.value);
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: 'rgba(0, 0, 0, 0.45)',
                      border: '1px solid var(--border-highlight)',
                      borderRadius: 'var(--radius-sm)',
                      color: '#fff',
                      fontSize: '0.88rem'
                    }}
                  />
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', margin: '4px 0 0 0' }}>
                    💡 Pre-set to Sir's number (9820188505). You can change it anytime; your updates are automatically saved.
                  </p>
                </div>

                {/* Quick Note for Sir */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '6px' }}>
                    💬 Add a Personal Note for Sir (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sir, check this 0:02 scalp reveal hook — perfect for our weekend shoot!"
                    value={sirNote}
                    onChange={(e) => setSirNote(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: 'rgba(0, 0, 0, 0.45)',
                      border: '1px solid var(--border-highlight)',
                      borderRadius: 'var(--radius-sm)',
                      color: '#fff',
                      fontSize: '0.88rem'
                    }}
                  />
                </div>

                {/* WhatsApp Message Preview */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--cyan-400)', textTransform: 'uppercase' }}>
                      📄 Live WhatsApp Message Preview
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                      Includes video link, audio analysis & core outlier formula
                    </span>
                  </div>
                  <div className="whatsapp-preview-box">
                    {previewMessage}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="whatsapp-modal-footer">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowWhatsAppModal(false)}
                >
                  Cancel
                </button>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={handleCopyWhatsAppMessage}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    {copiedWhatsApp ? <Check size={16} color="var(--emerald-500)" /> : <Copy size={16} />}
                    {copiedWhatsApp ? 'Copied' : 'Copy Text'}
                  </button>

                  <button
                    type="button"
                    className="btn btn-sheet"
                    onClick={() => handleLogToSheet(breakdown, candidate, false)}
                    disabled={isLoggingToSheet}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    title="Save this record to Google Sheet without opening WhatsApp"
                  >
                    <FileSpreadsheet size={15} />
                    {isLoggingToSheet ? 'Saving...' : 'Save to Sheet Only'}
                  </button>

                  <button
                    type="button"
                    className="btn btn-whatsapp"
                    onClick={handleSendToSirOnWhatsApp}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}
                  >
                    <WhatsAppIcon size={16} color="#fff" /> Send to Sir on WhatsApp →
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================
          MANAGE TEAM MEMBERS & QUOTAS MODAL
         ======================================================== */}
      {isEditingTeam && (
        <div
          className="whatsapp-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsEditingTeam(false);
          }}
        >
          <div className="whatsapp-modal" style={{ maxWidth: '740px' }} onClick={(e) => e.stopPropagation()}>
            <div className="whatsapp-modal-header" style={{ background: 'rgba(245, 158, 11, 0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: 'var(--gold-400)', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={18} color="#000" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                    Manage Social Media Team Members & Quotas
                  </h3>
                  <p style={{ fontSize: '0.74rem', color: 'var(--text-dim)', margin: 0 }}>
                    Update member names, roles, and daily outlier quotas. Updates display live across the web app and Google Sheets!
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingTeam(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '6px' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="whatsapp-modal-body" style={{ maxHeight: '65vh' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#e2e8f0', textTransform: 'uppercase' }}>
                  Team Roster ({editingMembers.length} Members)
                </span>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    setEditingMembers([
                      ...editingMembers,
                      {
                        id: `member-${Date.now()}`,
                        name: `Member ${editingMembers.length + 1}`,
                        role: 'Social Media Specialist',
                        dailyTarget: 10,
                        notes: 'Outlier Research'
                      }
                    ]);
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', padding: '5px 12px' }}
                >
                  <UserPlus size={14} /> + Add Team Member
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {editingMembers.map((member, idx) => (
                  <div
                    key={member.id || idx}
                    style={{
                      background: 'rgba(0, 0, 0, 0.45)',
                      border: '1px solid var(--border-highlight)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '14px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--gold-400)' }}>
                        Member #{idx + 1}
                      </span>
                      {editingMembers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingMembers(editingMembers.filter((_, i) => i !== idx));
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#f87171',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.74rem'
                          }}
                          title="Delete this team member"
                        >
                          <Trash2 size={13} /> Remove
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: '4px', fontWeight: 600 }}>
                          Full Name / Display Name:
                        </label>
                        <input
                          type="text"
                          value={member.name}
                          placeholder="e.g. Aman Sharma / Rahul V."
                          onChange={(e) => {
                            const updated = [...editingMembers];
                            updated[idx].name = e.target.value;
                            setEditingMembers(updated);
                          }}
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            background: 'rgba(15, 23, 42, 0.8)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-sm)',
                            color: '#fff',
                            fontSize: '0.84rem'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: '4px', fontWeight: 600 }}>
                          Role / Specialization:
                        </label>
                        <input
                          type="text"
                          value={member.role}
                          placeholder="e.g. Reels Specialist / Content Strategist"
                          onChange={(e) => {
                            const updated = [...editingMembers];
                            updated[idx].role = e.target.value;
                            setEditingMembers(updated);
                          }}
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            background: 'rgba(15, 23, 42, 0.8)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-sm)',
                            color: '#fff',
                            fontSize: '0.84rem'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: '4px', fontWeight: 600 }}>
                          Daily Quota Target (Outliers / Day):
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="50"
                          value={member.dailyTarget}
                          onChange={(e) => {
                            const updated = [...editingMembers];
                            updated[idx].dailyTarget = Number(e.target.value) || 10;
                            setEditingMembers(updated);
                          }}
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            background: 'rgba(15, 23, 42, 0.8)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--emerald-400)',
                            fontWeight: 700,
                            fontSize: '0.84rem'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: '4px', fontWeight: 600 }}>
                          Focus Area / Brand Notes:
                        </label>
                        <input
                          type="text"
                          value={member.notes || ''}
                          placeholder="e.g. Men's Hair Patch Transformation"
                          onChange={(e) => {
                            const updated = [...editingMembers];
                            updated[idx].notes = e.target.value;
                            setEditingMembers(updated);
                          }}
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            background: 'rgba(15, 23, 42, 0.8)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-sm)',
                            color: '#fff',
                            fontSize: '0.84rem'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="whatsapp-modal-footer">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  setEditingMembers(DEFAULT_TEAM_LIST);
                  showToast('Reset to default 3 members');
                }}
              >
                Reset to Defaults
              </button>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setIsEditingTeam(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSaveTeamMembers}
                  disabled={isSavingTeam}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 22px' }}
                >
                  {isSavingTeam ? <RefreshCw size={15} className="spin" /> : <Check size={16} />}
                  {isSavingTeam ? 'Saving Changes...' : 'Save & Update All'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

