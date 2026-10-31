import { BrandTarget, FormatLabels, OutlierCandidate, Platform } from '../types';
import { AHL_SPECIFIC_KEYWORDS, ALCHEMANE_SPECIFIC_KEYWORDS } from '../keywords';
import { FORMATS, EDITING_STYLES, isIncompatible } from './format-taxonomy';

/**
 * Format Map: rows = Formats, columns = Editing Styles, over every outlier we've found.
 * Ported from the Format Finder skill's build_matrix.py and scaled to our much smaller pool.
 *
 * - heat   = sum of min(multiplier, 50): many winners that also hit. The cap stops one 300x
 *            video from painting a 1-video cell red. Median multiplier is the badge.
 * - white space = an empty cell whose row AND column are each proven elsewhere (enough winners),
 *            and which can physically exist. Ranked by the row and column medians, shrunk toward
 *            the pool median (k = 5) so a thin row of two lucky videos can't top the list.
 */

export interface MapVideo {
  id: string;
  url: string;
  platform: Platform;
  title: string;
  thumbnailUrl: string;
  creator: string;
  views: number;
  multiplier: number;
  brand: BrandTarget | null;
  labelSource: FormatLabels['source'];
}

export interface MapCell {
  format: string;
  editingStyle: string;
  count: number;
  heat: number;
  medianMultiplier: number;
  videos: MapVideo[]; // best first
}

export interface AxisStat {
  key: string;
  label: string;
  what: string;
  count: number;
  medianMultiplier: number;
  proven: boolean;
}

export interface WhiteSpace {
  format: string;
  editingStyle: string;
  score: number;
  rowMedian: number;
  colMedian: number;
}

export interface FormatPick {
  kind: 'proven' | 'bet';
  format: string;
  editingStyle: string;
  reason: string;
}

export interface FormatMapResult {
  rows: AxisStat[];
  columns: AxisStat[];
  emptyRows: AxisStat[];
  emptyColumns: AxisStat[];
  cells: MapCell[];
  whiteSpace: WhiteSpace[];
  picks: FormatPick[];
  maxHeat: number;
  poolSize: number;
  taggedCount: number;
  untaggedCount: number;
  provenThreshold: number;
  thumbnailOnlyCount: number;
}

export interface FormatMapFilters {
  brand?: BrandTarget | 'all';
  platform?: Platform | 'all';
  minMultiplier?: number;
}

export interface PoolEntry {
  candidate: OutlierCandidate;
  labels?: FormatLabels;
}

const HEAT_CAP = 50;
const SHRINK_K = 5;

const ahlKeywords = new Set(AHL_SPECIFIC_KEYWORDS.map((k) => k.toLowerCase()));
const alchemaneKeywords = new Set(ALCHEMANE_SPECIFIC_KEYWORDS.map((k) => k.toLowerCase()));

/** Which brand's keyword list found this video; null for pasted URLs and custom keywords. */
export function brandOfCandidate(candidate: OutlierCandidate): BrandTarget | null {
  const kw = (candidate.matchedKeyword || '').toLowerCase();
  if (ahlKeywords.has(kw)) return 'AHL';
  if (alchemaneKeywords.has(kw)) return 'Alchemane';
  return null;
}

export function filterPool(pool: PoolEntry[], filters: FormatMapFilters): PoolEntry[] {
  const minMult = filters.minMultiplier ?? 3;
  return pool.filter(({ candidate }) => {
    if ((candidate.outlierMultiplier || 0) < minMult) return false;
    if (filters.platform && filters.platform !== 'all' && candidate.platform !== filters.platform) return false;
    if (filters.brand && filters.brand !== 'all' && brandOfCandidate(candidate) !== filters.brand) return false;
    return true;
  });
}

export function buildFormatMap(pool: PoolEntry[], filters: FormatMapFilters): FormatMapResult {
  const filtered = filterPool(pool, filters);
  const tagged = filtered.filter((e): e is Required<PoolEntry> => !!e.labels);

  // Proven = enough winners that the median stops being luck. The skill uses 8 on ~500 videos;
  // our pool is far smaller, so scale it with the pool and keep it between 3 and 8.
  const provenThreshold = Math.min(8, Math.max(3, Math.round(tagged.length / 25)));

  const cellMap = new Map<string, MapCell>();
  const rowMults = new Map<string, number[]>();
  const colMults = new Map<string, number[]>();

  for (const { candidate, labels } of tagged) {
    const mult = candidate.outlierMultiplier || 0;
    const key = `${labels.format}|${labels.editingStyle}`;
    let cell = cellMap.get(key);
    if (!cell) {
      cell = { format: labels.format, editingStyle: labels.editingStyle, count: 0, heat: 0, medianMultiplier: 0, videos: [] };
      cellMap.set(key, cell);
    }
    cell.count += 1;
    cell.heat += Math.min(mult, HEAT_CAP);
    cell.videos.push(toMapVideo(candidate, labels));
    pushTo(rowMults, labels.format, mult);
    pushTo(colMults, labels.editingStyle, mult);
  }

  const cells = Array.from(cellMap.values());
  for (const cell of cells) {
    cell.videos.sort((a, b) => b.multiplier - a.multiplier);
    cell.medianMultiplier = round1(median(cell.videos.map((v) => v.multiplier)));
    cell.heat = round1(cell.heat);
  }

  const toAxis = (entry: { key: string; label: string; what: string }, mults: Map<string, number[]>): AxisStat => {
    const values = mults.get(entry.key) || [];
    return {
      key: entry.key,
      label: entry.label,
      what: entry.what,
      count: values.length,
      medianMultiplier: round1(median(values)),
      proven: values.length >= provenThreshold
    };
  };
  const allRows = FORMATS.map((f) => toAxis(f, rowMults));
  const allColumns = EDITING_STYLES.map((s) => toAxis(s, colMults));
  const byCount = (a: AxisStat, b: AxisStat) => b.count - a.count || b.medianMultiplier - a.medianMultiplier;
  const rows = allRows.filter((r) => r.count > 0).sort(byCount);
  const columns = allColumns.filter((c) => c.count > 0).sort(byCount);

  const poolMedian = median(tagged.map((e) => e.candidate.outlierMultiplier || 0));
  const shrink = (axis: AxisStat) => (axis.count * axis.medianMultiplier + SHRINK_K * poolMedian) / (axis.count + SHRINK_K);

  const whiteSpace: WhiteSpace[] = [];
  for (const row of rows) {
    if (!row.proven) continue;
    for (const col of columns) {
      if (!col.proven || cellMap.has(`${row.key}|${col.key}`) || isIncompatible(row.key, col.key)) continue;
      whiteSpace.push({
        format: row.key,
        editingStyle: col.key,
        score: round1(shrink(row) * shrink(col)),
        rowMedian: row.medianMultiplier,
        colMedian: col.medianMultiplier
      });
    }
  }
  whiteSpace.sort((a, b) => b.score - a.score);

  return {
    rows,
    columns,
    emptyRows: allRows.filter((r) => r.count === 0),
    emptyColumns: allColumns.filter((c) => c.count === 0),
    cells,
    whiteSpace,
    picks: choosePicks(cells, whiteSpace, rows, columns),
    maxHeat: cells.reduce((m, c) => Math.max(m, c.heat), 0),
    poolSize: filtered.length,
    taggedCount: tagged.length,
    untaggedCount: filtered.length - tagged.length,
    provenThreshold,
    thumbnailOnlyCount: tagged.filter((e) => e.labels.source === 'thumbnail').length
  };
}

/** Two proven combos (most heat, at least 2 winners) and one white-space bet. */
function choosePicks(cells: MapCell[], whiteSpace: WhiteSpace[], rows: AxisStat[], columns: AxisStat[]): FormatPick[] {
  const label = (list: AxisStat[], key: string) => list.find((a) => a.key === key)?.label || key;
  const picks: FormatPick[] = [];
  const usedFormats = new Set<string>();

  const proven = cells.filter((c) => c.count >= 2).sort((a, b) => b.heat - a.heat);
  for (const cell of proven) {
    if (picks.length >= 2) break;
    if (usedFormats.has(cell.format)) continue; // two different formats to test, not one twice
    usedFormats.add(cell.format);
    picks.push({
      kind: 'proven',
      format: cell.format,
      editingStyle: cell.editingStyle,
      reason: `${cell.count} outliers already won with ${label(rows, cell.format)} shot as ${label(columns, cell.editingStyle)} - median ${formatMultiplier(cell.medianMultiplier)} their creator's normal views.`
    });
  }

  const bet = whiteSpace.find((w) => !usedFormats.has(w.format)) || whiteSpace[0];
  if (bet) {
    picks.push({
      kind: 'bet',
      format: bet.format,
      editingStyle: bet.editingStyle,
      reason: `Nobody in the pool has made ${label(rows, bet.format)} as ${label(columns, bet.editingStyle)} yet, but each half wins on its own (format median ${formatMultiplier(bet.rowMedian)}, style median ${formatMultiplier(bet.colMedian)}).`
    });
  }
  return picks;
}

function toMapVideo(candidate: OutlierCandidate, labels: FormatLabels): MapVideo {
  return {
    id: candidate.id,
    url: candidate.url,
    platform: candidate.platform,
    title: candidate.title || candidate.caption?.slice(0, 90) || '',
    thumbnailUrl: candidate.thumbnailUrl,
    creator: candidate.creator?.username || candidate.creator?.displayName || '',
    views: candidate.viewCount,
    multiplier: round1(candidate.outlierMultiplier || 0),
    brand: brandOfCandidate(candidate),
    labelSource: labels.source
  };
}

function pushTo(map: Map<string, number[]>, key: string, value: number) {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Display form of a multiplier. The radar's creator medians are rough (YouTube compares an old
 * viral video with today's uploads, Instagram estimates the median from followers), so values in
 * the thousands are real arithmetic but meaningless - anything past 100x reads as "100x+".
 */
export function formatMultiplier(n: number): string {
  return n >= 100 ? '100x+' : `${round1(n)}x`;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
