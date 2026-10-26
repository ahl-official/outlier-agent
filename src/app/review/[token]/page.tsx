'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';

interface ReviewLinkData {
  id: string;
  videoUrl: string;
  videoTitle?: string;
  status: 'pending' | 'approved' | 'disapproved';
  candidate: {
    thumbnailUrl?: string;
    creator?: { displayName?: string; username?: string };
    platform?: string;
    viewCount?: number;
  };
  sixReasons: {
    reelCategory: string;
    firstSixSeconds: { textHook: string; visualHook: string; audioHook: string };
    sixReasons: { heading: string; paragraph: string }[];
    creativeAdaptation: string;
    closingLesson: string;
  };
}

function formatViews(n?: number): string {
  if (!n) return '';
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M views`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}k views`;
  return `${n} views`;
}

export default function ReviewPage() {
  const params = useParams();
  const token = (params?.token as string) || '';

  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'decided'>('loading');
  const [link, setLink] = useState<ReviewLinkData | null>(null);
  const [cardIndex, setCardIndex] = useState(0); // 0..N-1 = reason cards, N = hook card, N+1 = decision screen
  const [dragX, setDragX] = useState(0);
  const [deciding, setDeciding] = useState(false);
  const [finalDecision, setFinalDecision] = useState<'approved' | 'disapproved' | null>(null);
  const touchStartX = useRef<number | null>(null);
  const dragging = useRef(false);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/review/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setLink(data.link);
          if (data.link.status !== 'pending') {
            setFinalDecision(data.link.status);
            setStatus('decided');
          } else {
            setStatus('ready');
          }
        } else {
          setStatus('error');
        }
      })
      .catch(() => setStatus('error'));
  }, [token]);

  const reasons = link?.sixReasons.sixReasons || [];
  // Card 0 = first-6-seconds hook breakdown, cards 1..6 = the six reasons, card 7 = decision
  const totalContentCards = reasons.length + 1;

  function clampIndex(i: number) {
    return Math.max(0, Math.min(i, totalContentCards));
  }
  function goNext() {
    setCardIndex((i) => clampIndex(i + 1));
  }
  function goPrev() {
    setCardIndex((i) => clampIndex(i - 1));
  }

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    dragging.current = true;
  }
  function onTouchMove(e: React.TouchEvent) {
    if (!dragging.current || touchStartX.current === null) return;
    setDragX(e.touches[0].clientX - touchStartX.current);
  }
  function onTouchEnd() {
    if (dragX < -50) goNext();
    else if (dragX > 50) goPrev();
    setDragX(0);
    touchStartX.current = null;
    dragging.current = false;
  }

  async function submitDecision(decision: 'approved' | 'disapproved') {
    if (deciding) return;
    setDeciding(true);
    try {
      const res = await fetch(`/api/review/${token}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision })
      });
      const data = await res.json();
      if (data.success || data.link) {
        setFinalDecision(decision);
        setStatus('decided');
      }
    } catch {
      // swallow - button stays active to retry
    } finally {
      setDeciding(false);
    }
  }

  if (status === 'loading') {
    return (
      <FullScreen>
        <div style={{ color: '#94a3b8', fontSize: '0.95rem' }}>Loading…</div>
      </FullScreen>
    );
  }

  if (status === 'error' || !link) {
    return (
      <FullScreen>
        <div style={{ textAlign: 'center', padding: '24px' }}>
          <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🔗</div>
          <div style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 700, marginBottom: '6px' }}>Link not found</div>
          <div style={{ color: '#64748b', fontSize: '0.86rem' }}>This review link may have expired or is invalid.</div>
        </div>
      </FullScreen>
    );
  }

  if (status === 'decided') {
    const approved = finalDecision === 'approved';
    return (
      <FullScreen>
        <div style={{ textAlign: 'center', padding: '24px', maxWidth: '360px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '14px' }}>{approved ? '✅' : '❌'}</div>
          <div style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 800, marginBottom: '8px' }}>
            Marked as {approved ? 'Approved' : 'Disapproved'}
          </div>
          <div style={{ color: '#94a3b8', fontSize: '0.88rem', lineHeight: 1.6 }}>
            Thank you! This has been recorded in the tracker sheet for "{link.videoTitle || link.videoUrl}".
          </div>
        </div>
      </FullScreen>
    );
  }

  const onHookCard = cardIndex === 0;
  const onDecisionCard = cardIndex === totalContentCards;
  const reasonIdx = cardIndex - 1;
  const rotate = Math.max(-8, Math.min(8, dragX / 15));

  return (
    <FullScreen noPadding>
      {/* Header: video context */}
      <div style={{ padding: '16px 16px 10px', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        {link.candidate.thumbnailUrl && (
          <img
            src={link.candidate.thumbnailUrl}
            alt=""
            style={{ width: '38px', height: '38px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }}
          />
        )}
        <div style={{ overflow: 'hidden' }}>
          <div style={{ color: '#fff', fontSize: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {link.videoTitle || 'Outlier Reel'}
          </div>
          <div style={{ color: '#64748b', fontSize: '0.72rem' }}>
            {link.candidate.creator?.displayName || link.candidate.creator?.username} · {formatViews(link.candidate.viewCount)}
          </div>
        </div>
      </div>

      {/* Progress dots */}
      <div style={{ display: 'flex', gap: '5px', padding: '0 16px 14px', flexShrink: 0 }}>
        {Array.from({ length: totalContentCards + 1 }).map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: '3px',
              borderRadius: '2px',
              background: i <= cardIndex ? '#fbbf24' : 'rgba(255,255,255,0.12)',
              transition: 'background 0.2s'
            }}
          />
        ))}
      </div>

      {/* Card area */}
      <div
        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px 16px', touchAction: 'pan-y' }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '420px',
            minHeight: '320px',
            background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.08), rgba(16, 24, 40, 0.9))',
            border: '1px solid rgba(251, 191, 36, 0.25)',
            borderRadius: '20px',
            padding: '26px 22px',
            display: 'flex',
            flexDirection: 'column',
            transform: `translateX(${dragX}px) rotate(${rotate}deg)`,
            transition: dragging.current ? 'none' : 'transform 0.25s ease'
          }}
        >
          {onDecisionCard ? (
            <div style={{ textAlign: 'center', margin: 'auto' }}>
              <div style={{ fontSize: '2.2rem', marginBottom: '12px' }}>🎬</div>
              <div style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 800, marginBottom: '20px' }}>
                That's the full breakdown. What's the call?
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  onClick={() => submitDecision('disapproved')}
                  disabled={deciding}
                  style={{
                    flex: 1,
                    padding: '14px 10px',
                    borderRadius: '12px',
                    border: '1px solid rgba(244, 63, 94, 0.4)',
                    background: 'rgba(244, 63, 94, 0.12)',
                    color: '#fb7185',
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    cursor: deciding ? 'wait' : 'pointer'
                  }}
                >
                  ❌ Disapprove
                </button>
                <button
                  onClick={() => submitDecision('approved')}
                  disabled={deciding}
                  style={{
                    flex: 1,
                    padding: '14px 10px',
                    borderRadius: '12px',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#34d399',
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    cursor: deciding ? 'wait' : 'pointer'
                  }}
                >
                  ✅ Approve
                </button>
              </div>
            </div>
          ) : onHookCard ? (
            <>
              <div style={{ fontSize: '0.72rem', color: '#fbbf24', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '14px' }}>
                First 6 Seconds — {link.sixReasons.reelCategory}
              </div>
              <HookRow label="📝 Text Hook" value={link.sixReasons.firstSixSeconds.textHook} />
              <HookRow label="🎬 Visual Hook" value={link.sixReasons.firstSixSeconds.visualHook} />
              <HookRow label="🔊 Audio Hook" value={link.sixReasons.firstSixSeconds.audioHook} />
            </>
          ) : (
            <>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: 'rgba(251, 191, 36, 0.15)', border: '1px solid rgba(251, 191, 36, 0.4)',
                color: '#fbbf24', fontWeight: 800, fontSize: '0.9rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px'
              }}>
                {reasonIdx + 1}
              </div>
              <div style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 800, marginBottom: '12px', lineHeight: 1.35 }}>
                {reasons[reasonIdx]?.heading}
              </div>
              <div style={{ color: '#cbd5e1', fontSize: '0.92rem', lineHeight: 1.65, flex: 1, overflowY: 'auto' }}>
                {reasons[reasonIdx]?.paragraph}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Nav controls */}
      {!onDecisionCard && (
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 24px 28px', flexShrink: 0 }}>
          <button
            onClick={goPrev}
            disabled={cardIndex === 0}
            style={navBtnStyle(cardIndex === 0)}
          >
            ← Back
          </button>
          <div style={{ color: '#64748b', fontSize: '0.74rem', alignSelf: 'center' }}>Swipe or tap</div>
          <button onClick={goNext} style={navBtnStyle(false)}>
            Next →
          </button>
        </div>
      )}
    </FullScreen>
  );
}

function navBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: '10px 18px',
    borderRadius: '9999px',
    border: '1px solid rgba(255,255,255,0.12)',
    background: disabled ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.08)',
    color: disabled ? '#475569' : '#e2e8f0',
    fontWeight: 700,
    fontSize: '0.84rem',
    cursor: disabled ? 'default' : 'pointer'
  };
}

function HookRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '0.9rem', color: '#e2e8f0', lineHeight: 1.5 }}>{value}</div>
    </div>
  );
}

function FullScreen({ children, noPadding }: { children: React.ReactNode; noPadding?: boolean }) {
  return (
    <div
      style={{
        minHeight: '100dvh',
        width: '100%',
        background: '#070a12',
        display: 'flex',
        flexDirection: noPadding ? 'column' : 'column',
        alignItems: noPadding ? 'stretch' : 'center',
        justifyContent: noPadding ? 'flex-start' : 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}
    >
      {children}
    </div>
  );
}
