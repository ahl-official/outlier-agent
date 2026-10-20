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
  SlidersHorizontal
} from 'lucide-react';
import { OutlierCandidate, DetailedOutlierBreakdown, BoardItem, BoardStatus } from '@/types';
import { 
  DEFAULT_RADAR_KEYWORDS, 
  KeywordGroup, 
  AHL_CATEGORY_GROUPS, 
  ALCHEMANE_CATEGORY_GROUPS 
} from '@/keywords';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<'radar' | 'breakdown' | 'board'>('radar');

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
  const [minFollowerRatio, setMinFollowerRatio] = useState<number>(0); // 0 = Any reach ratio
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

  // Initial load
  useEffect(() => {
    fetchRadarData();
    fetchBoardData();
    fetchKeywords();
  }, []);

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
        showToast('Saved to Outliers Library!');
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
                      flex: '1 1 190px',
                      minWidth: '160px',
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
                    <option value="0">Reach Ratio: Any Ratio</option>
                    <option value="2">Reach Ratio: 🚀 2x+ Followers</option>
                    <option value="5">Reach Ratio: 🔥 5x+ Followers</option>
                    <option value="10">Reach Ratio: ⚡ 10x+ Followers</option>
                    <option value="20">Reach Ratio: 👑 20x+ Followers</option>
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

                  <div style={{ display: 'flex', gap: '10px' }}>
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
                      <button
                        className="btn btn-outline btn-sm"
                        style={{ padding: '4px 8px', fontSize: '0.74rem' }}
                        onClick={() => handleAnalyzeUrl(item.candidate.url, item.candidate)}
                      >
                        <BarChart3 size={12} /> Deep Dive
                      </button>

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
                      <button
                        className="btn btn-outline btn-sm"
                        style={{ padding: '4px 8px', fontSize: '0.74rem' }}
                        onClick={() => handleAnalyzeUrl(item.candidate.url, item.candidate)}
                      >
                        <BarChart3 size={12} /> Deep Dive
                      </button>

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
    </div>
  );
}
