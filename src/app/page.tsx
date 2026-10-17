'use client';

import React, { useState, useEffect } from 'react';
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
  AlertCircle
} from 'lucide-react';
import { OutlierCandidate, DetailedOutlierBreakdown, BoardItem, BoardStatus } from '@/types';
import { DEFAULT_RADAR_KEYWORDS } from '@/keywords';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<'radar' | 'breakdown' | 'board'>('radar');

  // Radar state
  const [keywordList, setKeywordList] = useState<string[]>(DEFAULT_RADAR_KEYWORDS);
  const [selectedKeyword, setSelectedKeyword] = useState<string>(DEFAULT_RADAR_KEYWORDS[0]);
  const [customKeyword, setCustomKeyword] = useState<string>('');
  const [isAddingKeyword, setIsAddingKeyword] = useState<boolean>(false);
  const [newKeywordInput, setNewKeywordInput] = useState<string>('');
  const [selectedPlatform, setSelectedPlatform] = useState<'all' | 'youtube' | 'instagram'>('all');
  const [minMultiplier, setMinMultiplier] = useState<number>(0);
  const [radarCandidates, setRadarCandidates] = useState<OutlierCandidate[]>([]);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanMessage, setScanMessage] = useState<string>('');

  // Breakdown state
  const [breakdownUrl, setBreakdownUrl] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [currentBreakdown, setCurrentBreakdown] = useState<DetailedOutlierBreakdown | null>(null);
  const [currentCandidate, setCurrentCandidate] = useState<OutlierCandidate | null>(null);

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
      if (data.keywords && Array.isArray(data.keywords) && data.keywords.length > 0) {
        setKeywordList(data.keywords);
      }
    } catch (err) {
      console.error('Error fetching keywords:', err);
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

  const fetchBoardData = async () => {
    try {
      const res = await fetch('/api/board');
      const data = await res.json();
      if (data.items) {
        setBoardItems(data.items);
      }
    } catch (err) {
      console.error('Error fetching board items:', err);
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
          minMultiplier
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
          candidateId: candidateToUse?.id
        })
      });

      const data = await res.json();
      if (data.success && data.analysis) {
        setCurrentBreakdown(data.analysis);
        if (data.candidate) {
          setCurrentCandidate(data.candidate);
        }
        showToast('Deep Outlier Intelligence loaded!');
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
    if (multiplier >= 5) return 'outlier-high';
    if (multiplier >= 2) return 'outlier-medium';
    return 'outlier-regular';
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
          <div className="brand-badge">
            <Flame size={14} /> Outlier Intelligence Radar
          </div>
          <h1 className="brand-title">Viral Outlier Discovery & Breakdown Desk</h1>
          <p className="brand-subtitle">
            Accurate discovery, creator baselines, engagement ratios, and deep diagnostic breakdown for viral hair system videos.
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Target Niche Keywords:
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
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        padding: '3px 12px',
                        borderRadius: '9999px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <Plus size={13} /> Add Target Keyword
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                  {keywordList.map((kw) => (
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

              {/* Filters Row */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center' }}>
                <div style={{ flex: '1 1 280px', position: 'relative' }}>
                  <Search size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                  <input
                    type="text"
                    placeholder="Or type custom search query (e.g. hair system before after, hair patch cost)..."
                    value={customKeyword}
                    onChange={(e) => setCustomKeyword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 38px',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid var(--border-highlight)',
                      borderRadius: 'var(--radius-md)',
                      color: '#fff',
                      fontSize: '0.88rem'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <select
                    value={selectedPlatform}
                    onChange={(e: any) => setSelectedPlatform(e.target.value)}
                    style={{
                      padding: '10px 14px',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid var(--border-highlight)',
                      borderRadius: 'var(--radius-md)',
                      color: '#fff',
                      fontSize: '0.86rem',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="all">Platforms: All (YouTube + IG)</option>
                    <option value="youtube">YouTube Data API</option>
                    <option value="instagram">Instagram Reels (Apify)</option>
                  </select>

                  <select
                    value={minMultiplier}
                    onChange={(e: any) => setMinMultiplier(Number(e.target.value))}
                    style={{
                      padding: '10px 14px',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid var(--border-highlight)',
                      borderRadius: 'var(--radius-md)',
                      color: '#fff',
                      fontSize: '0.86rem',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="0">All Multipliers</option>
                    <option value="1.5">Min 1.5x Baseline</option>
                    <option value="3">Min 3x Breakouts</option>
                    <option value="5">Min 5x Mega Outliers</option>
                  </select>

                  <button
                    className="btn btn-primary"
                    onClick={handleRunRadar}
                    disabled={isScanning}
                  >
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
              </div>

              {scanMessage && (
                <div style={{ fontSize: '0.84rem', color: 'var(--cyan-400)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <RefreshCw size={14} /> {scanMessage}
                </div>
              )}
            </div>
          </div>

          {/* Results Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={18} color="var(--gold-400)" />
              <span>Ranked Outliers ({radarCandidates.length})</span>
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Accurate mathematical outlier ratio (Views ÷ Creator Median)
            </div>
          </div>

          {/* Candidate Grid */}
          {radarCandidates.length === 0 ? (
            <div className="glass-panel" style={{ padding: '60px 20px', textAlign: 'center' }}>
              <Radar size={48} color="var(--text-dim)" style={{ margin: '0 auto 16px auto', display: 'block' }} />
              <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>No cached radar scans yet</h3>
              <p style={{ color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto 20px auto', fontSize: '0.9rem' }}>
                Click "Scan Radar" to find viral hair system and patch videos across YouTube and Instagram.
              </p>
              <button className="btn btn-primary" onClick={handleRunRadar}>
                <Radar size={16} /> Launch Scan
              </button>
            </div>
          ) : (
            <div className="radar-grid">
              {radarCandidates.map((c) => (
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
                        <Flame size={12} /> {c.outlierMultiplier}x Outlier
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                        Rank Score: <strong>{c.outlierScore}</strong>/100
                      </span>
                    </div>

                    <h3 className="card-title" title={c.title}>{c.title}</h3>

                    <div className="card-creator-row">
                      <div className="creator-info">
                        <span>@{c.creator.username || c.creator.displayName}</span>
                      </div>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                        Channel Median: ~{c.creator.medianViews?.toLocaleString()}
                      </span>
                    </div>

                    <div className="card-stats-grid">
                      <div className="stat-item">
                        <span className="stat-label">Views</span>
                        <span className="stat-value">{c.viewCount.toLocaleString()}</span>
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
                    <RefreshCw size={16} className="spin" /> Analyzing Real Data...
                  </>
                ) : (
                  <>
                    <BarChart3 size={16} /> Get Deep Dive
                  </>
                )}
              </button>
            </div>
          </div>

          {!currentBreakdown ? (
            <div className="glass-panel" style={{ padding: '80px 20px', textAlign: 'center' }}>
              <BarChart3 size={48} color="var(--gold-400)" style={{ margin: '0 auto 16px auto', display: 'block' }} />
              <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>Paste a Video URL or Select from Radar</h3>
              <p style={{ color: 'var(--text-muted)', maxWidth: '480px', margin: '0 auto', fontSize: '0.9rem' }}>
                Fetches real video metrics, creator upload benchmarks, real audience comments, and accurate algorithmic diagnosis for that specific post.
              </p>
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

                {/* 4 Core Quantitative Metrics Tiles */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginTop: '20px', paddingTop: '18px', borderTop: '1px solid var(--border-subtle)' }}>
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

              {/* Bottom Card: Why This Specific Video Popped Off (Diagnosis) */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--gold-400)', textTransform: 'uppercase', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <TrendingUp size={16} /> Algorithmic Outlier Diagnostic
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                  <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--gold-400)', textTransform: 'uppercase' }}>
                      1. Primary Outlier Driver
                    </div>
                    <p style={{ fontSize: '0.86rem', color: '#e2e8f0', marginTop: '6px', lineHeight: 1.45 }}>
                      {currentBreakdown.whyOutlierDiagnosis.primaryDriver}
                    </p>
                  </div>

                  <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--cyan-400)', textTransform: 'uppercase' }}>
                      2. Retention & Drop-off Barrier
                    </div>
                    <p style={{ fontSize: '0.86rem', color: '#e2e8f0', marginTop: '6px', lineHeight: 1.45 }}>
                      {currentBreakdown.whyOutlierDiagnosis.retentionHookReason}
                    </p>
                  </div>

                  <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--emerald-500)', textTransform: 'uppercase' }}>
                      3. Viewer Engagement Signal
                    </div>
                    <p style={{ fontSize: '0.86rem', color: '#e2e8f0', marginTop: '6px', lineHeight: 1.45 }}>
                      {currentBreakdown.whyOutlierDiagnosis.engagementTrigger}
                    </p>
                  </div>

                  <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--purple-500)', textTransform: 'uppercase' }}>
                      4. Algorithmic Distribution
                    </div>
                    <p style={{ fontSize: '0.86rem', color: '#e2e8f0', marginTop: '6px', lineHeight: 1.45 }}>
                      {currentBreakdown.whyOutlierDiagnosis.algorithmSignal}
                    </p>
                  </div>
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
                onClick={fetchBoardData}
              >
                <RefreshCw size={14} /> Refresh Library
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
                      <span className="outlier-badge outlier-high" style={{ fontSize: '0.7rem' }}>
                        {item.candidate.outlierMultiplier}x
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
                      <span className="outlier-badge outlier-high" style={{ fontSize: '0.7rem' }}>
                        {item.candidate.outlierMultiplier}x
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
    </div>
  );
}
