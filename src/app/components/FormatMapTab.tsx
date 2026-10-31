'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Grid3x3, RefreshCw, Sparkles, ExternalLink, Info, Target, FlaskConical } from 'lucide-react';
import type { FormatMapResult, MapCell, AxisStat } from '@/scoring/format-map';
import { isIncompatible } from '@/scoring/format-taxonomy';

type BrandFilter = 'AHL' | 'Alchemane' | 'all';
type PlatformFilter = 'all' | 'youtube' | 'instagram';

interface Props {
  currentBrand: 'AHL' | 'Alchemane';
}

const MULTIPLIER_OPTIONS = [1.5, 3, 5];

export default function FormatMapTab({ currentBrand }: Props) {
  const [brand, setBrand] = useState<BrandFilter>(currentBrand);
  const [platform, setPlatform] = useState<PlatformFilter>('all');
  const [minMultiplier, setMinMultiplier] = useState(3);
  const [map, setMap] = useState<FormatMapResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<{ format: string; editingStyle: string } | null>(null);
  const [tagging, setTagging] = useState(false);
  const [tagStatus, setTagStatus] = useState<string | null>(null);
  const stopTagging = useRef(false);

  useEffect(() => setBrand(currentBrand), [currentBrand]);

  const filterBody = useMemo(() => ({ brand, platform, minMultiplier }), [brand, platform, minMultiplier]);

  const loadMap = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ brand, platform, minMultiplier: String(minMultiplier) });
      const res = await fetch(`/api/format-map?${qs}`, { cache: 'no-store' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to load the Format Map');
      setMap(data.map);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [brand, platform, minMultiplier]);

  useEffect(() => {
    loadMap();
    setSelected(null);
  }, [loadMap]);

  // Tags in batches (each request fits inside the 60s serverless limit) until done, stopped or out of quota
  const runTagging = async () => {
    setTagging(true);
    stopTagging.current = false;
    let total = 0;
    try {
      while (!stopTagging.current) {
        setTagStatus(`Watching videos and tagging… ${total} done so far`);
        const res = await fetch('/api/format-map', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'tag', limit: 8, ...filterBody })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Tagging failed');
        const r = data.result;
        total += r.tagged;
        if (r.stoppedReason === 'storage') {
          setTagStatus(`Tags couldn't be saved - the format_labels table is missing in Supabase. Run section 8 of supabase/schema.sql, then try again.`);
          break;
        }
        if (r.stoppedReason === 'quota') {
          setTagStatus(`Tagged ${total}. Gemini's quota is used up for now - ${r.remaining} still untagged, try again later.`);
          break;
        }
        if (r.remaining === 0 || r.stoppedReason === 'done' || (r.tagged === 0 && r.failed === 0)) {
          setTagStatus(`Tagged ${total}.${r.failed ? ` ${r.failed} couldn't be read (video and thumbnail both unavailable).` : ''}`);
          break;
        }
        if (r.tagged === 0) {
          setTagStatus(`Tagged ${total}. The last batch couldn't be read - stopping so it doesn't loop.`);
          break;
        }
        await loadMap();
      }
      if (stopTagging.current) setTagStatus(`Stopped. Tagged ${total}.`);
    } catch (err: any) {
      setTagStatus(`Tagging error: ${err.message}`);
    } finally {
      setTagging(false);
      await loadMap();
    }
  };

  const cellIndex = useMemo(() => {
    const idx = new Map<string, MapCell>();
    map?.cells.forEach((c) => idx.set(`${c.format}|${c.editingStyle}`, c));
    return idx;
  }, [map]);

  const whiteSpaceKeys = useMemo(() => new Set(map?.whiteSpace.map((w) => `${w.format}|${w.editingStyle}`) || []), [map]);

  const labelOf = (list: AxisStat[] | undefined, key: string) => list?.find((a) => a.key === key)?.label || key;
  const selectedCell = selected ? cellIndex.get(`${selected.format}|${selected.editingStyle}`) : undefined;

  const lead = useMemo(() => {
    if (!map || map.taggedCount === 0) return null;
    const top = [...map.cells].sort((a, b) => b.heat - a.heat)[0];
    const ws = map.whiteSpace[0];
    let text = `Most winning comes from ${labelOf(map.rows, top.format)} shot as ${labelOf(map.columns, top.editingStyle)} (${top.count} outliers, median ${top.medianMultiplier}x).`;
    if (ws) text += ` The biggest empty square: ${labelOf(map.rows, ws.format)} as ${labelOf(map.columns, ws.editingStyle)} - nobody has made it yet.`;
    return text;
  }, [map]);

  return (
    <main className="fm-root">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div className="fm-eyebrow">FORMAT MAP</div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>What formats win in our niche - and where is the empty square?</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', maxWidth: 760 }}>
            Every outlier is tagged two ways: the <b>Format</b> (how the story is organised) and the <b>Editing Style</b> (how it&apos;s filmed and cut).
            Rows × columns show where winners come from. A green square is an untried combo where both halves already win.
          </p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={loadMap} disabled={loading} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
        </button>
      </div>

      <div className="glass-panel fm-controls">
        <div className="fm-filter-group">
          <span className="fm-filter-label">Brand</span>
          {(['AHL', 'Alchemane', 'all'] as BrandFilter[]).map((b) => (
            <button key={b} className={`fm-chip ${brand === b ? 'active' : ''}`} onClick={() => setBrand(b)}>
              {b === 'all' ? 'Both' : b}
            </button>
          ))}
        </div>
        <div className="fm-filter-group">
          <span className="fm-filter-label">Platform</span>
          {(['all', 'instagram', 'youtube'] as PlatformFilter[]).map((p) => (
            <button key={p} className={`fm-chip ${platform === p ? 'active' : ''}`} onClick={() => setPlatform(p)}>
              {p === 'all' ? 'IG + YT' : p === 'instagram' ? 'Instagram' : 'YouTube'}
            </button>
          ))}
        </div>
        <div className="fm-filter-group">
          <span className="fm-filter-label">Outliers from</span>
          {MULTIPLIER_OPTIONS.map((m) => (
            <button key={m} className={`fm-chip ${minMultiplier === m ? 'active' : ''}`} onClick={() => setMinMultiplier(m)}>
              {m}x+
            </button>
          ))}
        </div>
      </div>

      {error && <div className="glass-panel fm-note fm-note-error">{error}</div>}

      {map && (
        <div className="fm-stats">
          <span><b>{map.poolSize}</b> outliers in this view</span>
          <span><b>{map.taggedCount}</b> tagged</span>
          {map.untaggedCount > 0 && <span className="fm-warn"><b>{map.untaggedCount}</b> not tagged yet</span>}
          {map.thumbnailOnlyCount > 0 && <span title="The video couldn't be downloaded, so these were judged from the thumbnail and caption">{map.thumbnailOnlyCount} judged from thumbnail only</span>}
          <span title="A row or column needs this many outliers before it counts as proven">proven = {map.provenThreshold}+ outliers</span>
          {map.untaggedCount > 0 && !tagging && (
            <button className="btn btn-primary btn-sm" onClick={runTagging} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Sparkles size={14} /> Tag {map.untaggedCount} with AI
            </button>
          )}
          {tagging && (
            <button className="btn btn-outline btn-sm" onClick={() => (stopTagging.current = true)}>
              Stop after this batch
            </button>
          )}
        </div>
      )}
      {tagStatus && <div className="fm-note">{tagStatus}</div>}

      {map && map.taggedCount === 0 && !loading && (
        <div className="glass-panel fm-empty">
          <Grid3x3 size={28} />
          <p>
            No tagged outliers in this view yet. {map.poolSize > 0 ? 'Press "Tag with AI" above - it watches each outlier and labels its format and editing style.' : 'Run a Discovery Radar scan or lower the multiplier filter first.'}
          </p>
        </div>
      )}

      {map && map.taggedCount > 0 && (
        <>
          {lead && <p className="fm-lead">{lead}</p>}
          {map.taggedCount < 30 && (
            <div className="fm-note">
              Only {map.taggedCount} tagged outliers so far - read this as early signal, not proof. It firms up past ~50.
            </div>
          )}

          <div className="fm-matrix-wrap glass-panel">
            <table className="fm-matrix">
              <thead>
                <tr>
                  <th className="fm-corner">Format ↓ · Editing style →</th>
                  {map.columns.map((col) => (
                    <th key={col.key} className={`fm-col-head ${col.proven ? 'proven' : ''}`} title={col.what}>
                      <div>{col.label}</div>
                      <div className="fm-axis-meta">{col.count} · {col.medianMultiplier}x</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {map.rows.map((row) => (
                  <tr key={row.key}>
                    <th className={`fm-row-head ${row.proven ? 'proven' : ''}`} title={row.what}>
                      <div>{row.label}</div>
                      <div className="fm-axis-meta">{row.count} · {row.medianMultiplier}x</div>
                    </th>
                    {map.columns.map((col) => {
                      const key = `${row.key}|${col.key}`;
                      const cell = cellIndex.get(key);
                      const isWhite = whiteSpaceKeys.has(key);
                      const impossible = !cell && isIncompatible(row.key, col.key);
                      const isSelected = selected?.format === row.key && selected?.editingStyle === col.key;
                      const alpha = cell ? 0.12 + 0.7 * (cell.heat / (map.maxHeat || 1)) : 0;
                      return (
                        <td
                          key={col.key}
                          className={`fm-cell ${cell ? 'filled' : ''} ${isWhite ? 'white-space' : ''} ${impossible ? 'impossible' : ''} ${isSelected ? 'selected' : ''}`}
                          style={cell ? { background: `rgba(245, 158, 11, ${alpha.toFixed(2)})` } : undefined}
                          onClick={() => (cell || isWhite) && setSelected({ format: row.key, editingStyle: col.key })}
                          title={cell ? `${cell.count} outliers, median ${cell.medianMultiplier}x` : isWhite ? 'Empty square - both halves are proven' : ''}
                        >
                          {cell && (
                            <>
                              {cell.videos[0]?.thumbnailUrl && (
                                <img className="fm-cell-thumb" src={cell.videos[0].thumbnailUrl} alt="" referrerPolicy="no-referrer" loading="lazy" />
                              )}
                              <span className="fm-cell-count">{cell.count}</span>
                              <span className="fm-cell-badge">{cell.medianMultiplier}x</span>
                            </>
                          )}
                          {isWhite && <span className="fm-cell-empty-label">empty</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="fm-legend">
            <span><i className="fm-swatch heat" /> darker = more winning (outliers × how hard they hit)</span>
            <span><i className="fm-swatch ws" /> empty square worth testing</span>
            <span>number = outliers · badge = median multiplier · tap a square for its videos</span>
          </div>

          {selected && (
            <div className="glass-panel fm-detail">
              <div className="fm-detail-head">
                <h3>
                  {labelOf(map.rows, selected.format)} <span style={{ color: 'var(--text-dim)' }}>×</span> {labelOf(map.columns, selected.editingStyle)}
                </h3>
                <button className="btn btn-outline btn-sm" onClick={() => setSelected(null)}>Close</button>
              </div>
              {selectedCell ? (
                <div className="fm-video-list">
                  {selectedCell.videos.map((v) => (
                    <a key={v.id} className="fm-video" href={v.url} target="_blank" rel="noreferrer">
                      {v.thumbnailUrl ? <img src={v.thumbnailUrl} alt="" referrerPolicy="no-referrer" loading="lazy" /> : <div className="fm-video-noimg" />}
                      <div className="fm-video-body">
                        <div className="fm-video-title">{v.title || 'Untitled'}</div>
                        <div className="fm-video-meta">
                          @{v.creator} · {v.platform === 'instagram' ? 'IG' : 'YT'} · {v.views.toLocaleString('en-IN')} views
                        </div>
                        <div className="fm-video-meta">
                          <b style={{ color: 'var(--gold-400)' }}>{v.multiplier}x</b> their normal
                          {v.labelSource === 'thumbnail' && <span className="fm-tag-thumb"> · tagged from thumbnail</span>}
                        </div>
                      </div>
                      <ExternalLink size={14} />
                    </a>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                  Nobody in this pool has made this combo yet. The format and the editing style each win on their own - that&apos;s why it&apos;s worth a test.
                  Look at the best videos in this row and in this column, then shoot the row&apos;s story in the column&apos;s style.
                </p>
              )}
            </div>
          )}

          {map.picks.length > 0 && (
            <section className="fm-section">
              <h3 className="fm-section-title"><Target size={18} /> Try these {map.picks.length} first</h3>
              <div className="fm-picks">
                {map.picks.map((p, i) => (
                  <button key={i} className={`glass-panel fm-pick ${p.kind}`} onClick={() => setSelected({ format: p.format, editingStyle: p.editingStyle })}>
                    <div className="fm-pick-kind">
                      {p.kind === 'proven' ? <><Sparkles size={13} /> Proven</> : <><FlaskConical size={13} /> The bet</>}
                    </div>
                    <div className="fm-pick-title">
                      {labelOf(map.rows, p.format)} <span>as</span> {labelOf(map.columns, p.editingStyle)}
                    </div>
                    <p>{p.reason}</p>
                  </button>
                ))}
              </div>
              <p className="fm-rule">
                Test 2-3 formats per batch of reels. After 2-3 batches, keep the 1-2 that win for <b>our</b> account - those are the hero formats the team gets fast and excellent at.
              </p>
            </section>
          )}

          <section className="fm-section">
            <h3 className="fm-section-title"><Info size={18} /> What the labels mean</h3>
            <div className="fm-explainers">
              <div>
                <h4>Formats (rows)</h4>
                {[...map.rows, ...map.emptyRows].map((r) => (
                  <div key={r.key} className={`fm-explainer ${r.count === 0 ? 'none' : ''}`}>
                    <b>{r.label}</b> - {r.what} <span className="fm-axis-meta">{r.count ? `${r.count} outliers` : 'none in this view yet'}</span>
                  </div>
                ))}
              </div>
              <div>
                <h4>Editing styles (columns)</h4>
                {[...map.columns, ...map.emptyColumns].map((c) => (
                  <div key={c.key} className={`fm-explainer ${c.count === 0 ? 'none' : ''}`}>
                    <b>{c.label}</b> - {c.what} <span className="fm-axis-meta">{c.count ? `${c.count} outliers` : 'none in this view yet'}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
