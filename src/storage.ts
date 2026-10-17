import fs from 'fs';
import path from 'path';
import { BoardItem, BoardStatus, OutlierCandidate, DetailedOutlierBreakdown } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
const BOARD_FILE = path.join(DATA_DIR, 'board.json');
const RADAR_CACHE_FILE = path.join(DATA_DIR, 'radar_cache.json');
const VIDEO_REGISTRY_FILE = path.join(DATA_DIR, 'video_registry.json');
const SEARCH_CACHE_FILE = path.join(DATA_DIR, 'search_cache.json');
const KEYWORDS_FILE = path.join(DATA_DIR, 'keywords.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// ---------------------------------------------------------------------
// 1. BOARD / SAVED OUTLIERS PERSISTENCE
// ---------------------------------------------------------------------
export function getBoardItems(): BoardItem[] {
  ensureDataDir();
  if (!fs.existsSync(BOARD_FILE)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(BOARD_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading board.json:', err);
    return [];
  }
}

export function saveBoardItems(items: BoardItem[]): void {
  ensureDataDir();
  fs.writeFileSync(BOARD_FILE, JSON.stringify(items, null, 2), 'utf-8');
}

export function addCandidateToBoard(candidate: OutlierCandidate, breakdown?: DetailedOutlierBreakdown): BoardItem {
  const items = getBoardItems();
  const existingIdx = items.findIndex((it) => it.candidate.url === candidate.url || it.candidate.id === candidate.id);

  if (existingIdx !== -1) {
    // If it exists, update breakdown and refresh timestamp
    if (breakdown) {
      items[existingIdx].breakdown = breakdown;
    }
    items[existingIdx].updatedAt = new Date().toISOString();
    saveBoardItems(items);
    return items[existingIdx];
  }

  const newItem: BoardItem = {
    id: `item_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    candidate,
    breakdown,
    status: 'saved',
    addedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  items.unshift(newItem);
  saveBoardItems(items);
  return newItem;
}

export function updateBoardItemStatus(id: string, status: BoardStatus, extra?: Partial<BoardItem>): BoardItem | null {
  const items = getBoardItems();
  const idx = items.findIndex((it) => it.id === id);
  if (idx === -1) return null;

  items[idx] = {
    ...items[idx],
    ...extra,
    status,
    updatedAt: new Date().toISOString()
  };

  saveBoardItems(items);
  return items[idx];
}

// ---------------------------------------------------------------------
// 2. RADAR SCAN CACHE
// ---------------------------------------------------------------------
export function getSavedRadarCache(): OutlierCandidate[] {
  ensureDataDir();
  if (!fs.existsSync(RADAR_CACHE_FILE)) return [];
  try {
    const raw = fs.readFileSync(RADAR_CACHE_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveRadarCache(candidates: OutlierCandidate[]): void {
  ensureDataDir();
  fs.writeFileSync(RADAR_CACHE_FILE, JSON.stringify(candidates, null, 2), 'utf-8');
}

// ---------------------------------------------------------------------
// 3. MASTER VIDEO REGISTRY & TOKEN-SAVING DEDUPLICATION
// ---------------------------------------------------------------------
export interface RegistryEntry {
  candidate: OutlierCandidate;
  breakdown?: DetailedOutlierBreakdown;
  cachedAt: string;
}

export function getVideoRegistry(): Record<string, RegistryEntry> {
  ensureDataDir();
  if (!fs.existsSync(VIDEO_REGISTRY_FILE)) return {};
  try {
    const raw = fs.readFileSync(VIDEO_REGISTRY_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function getCachedVideo(urlOrId: string, maxAgeHours: number = 72): RegistryEntry | null {
  const registry = getVideoRegistry();
  const key = normalizeVideoKey(urlOrId);
  const entry = registry[key];
  if (!entry) return null;

  const ageMs = Date.now() - new Date(entry.cachedAt).getTime();
  if (ageMs > maxAgeHours * 60 * 60 * 1000) {
    return null; // Expired, needs fresh data
  }
  return entry;
}

export function saveVideoToRegistry(candidate: OutlierCandidate, breakdown?: DetailedOutlierBreakdown): void {
  const registry = getVideoRegistry();
  const key = normalizeVideoKey(candidate.url || candidate.id);

  registry[key] = {
    candidate,
    breakdown,
    cachedAt: new Date().toISOString()
  };

  ensureDataDir();
  fs.writeFileSync(VIDEO_REGISTRY_FILE, JSON.stringify(registry, null, 2), 'utf-8');
}

// ---------------------------------------------------------------------
// 4. KEYWORD QUERY CACHE (Prevents duplicate scraping on same search)
// ---------------------------------------------------------------------
export interface SearchCacheRecord {
  keyword: string;
  platform: string;
  candidates: OutlierCandidate[];
  searchedAt: string;
}

export function getKeywordSearchCache(keyword: string, platform: string, maxAgeHours: number = 24): OutlierCandidate[] | null {
  ensureDataDir();
  if (!fs.existsSync(SEARCH_CACHE_FILE)) return null;
  try {
    const raw = fs.readFileSync(SEARCH_CACHE_FILE, 'utf-8');
    const store: Record<string, SearchCacheRecord> = JSON.parse(raw);
    const key = `${keyword.toLowerCase().trim()}_${platform}`;
    const record = store[key];
    if (!record) return null;

    const ageMs = Date.now() - new Date(record.searchedAt).getTime();
    if (ageMs > maxAgeHours * 60 * 60 * 1000) return null;

    return record.candidates;
  } catch {
    return null;
  }
}

export function saveKeywordSearchCache(keyword: string, platform: string, candidates: OutlierCandidate[]): void {
  ensureDataDir();
  let store: Record<string, SearchCacheRecord> = {};
  if (fs.existsSync(SEARCH_CACHE_FILE)) {
    try {
      store = JSON.parse(fs.readFileSync(SEARCH_CACHE_FILE, 'utf-8'));
    } catch {}
  }

  const key = `${keyword.toLowerCase().trim()}_${platform}`;
  store[key] = {
    keyword,
    platform,
    candidates,
    searchedAt: new Date().toISOString()
  };

  fs.writeFileSync(SEARCH_CACHE_FILE, JSON.stringify(store, null, 2), 'utf-8');
}

function normalizeVideoKey(urlOrId: string): string {
  return urlOrId.trim().toLowerCase().replace(/\/$/, '');
}

// ---------------------------------------------------------------------
// 5. USER TARGET KEYWORDS MANAGEMENT
// ---------------------------------------------------------------------
const DEFAULT_FALLBACK_KEYWORDS = [
  'hair system for men',
  'hair patch transformation',
  'non surgical hair replacement',
  'hair patch before and after',
  'hair transplant alternative'
];

export function getActiveKeywords(): string[] {
  ensureDataDir();
  if (!fs.existsSync(KEYWORDS_FILE)) {
    saveActiveKeywords(DEFAULT_FALLBACK_KEYWORDS);
    return DEFAULT_FALLBACK_KEYWORDS;
  }
  try {
    const raw = fs.readFileSync(KEYWORDS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_FALLBACK_KEYWORDS;
  } catch {
    return DEFAULT_FALLBACK_KEYWORDS;
  }
}

export function saveActiveKeywords(keywords: string[]): void {
  ensureDataDir();
  fs.writeFileSync(KEYWORDS_FILE, JSON.stringify(keywords, null, 2), 'utf-8');
}

export function addCustomKeyword(keyword: string): string[] {
  const current = getActiveKeywords();
  const trimmed = keyword.trim();
  if (!trimmed) return current;

  const exists = current.some((k) => k.toLowerCase() === trimmed.toLowerCase());
  if (!exists) {
    current.push(trimmed);
    saveActiveKeywords(current);
  }
  return current;
}

export function removeCustomKeyword(keyword: string): string[] {
  const current = getActiveKeywords();
  const filtered = current.filter((k) => k.toLowerCase() !== keyword.trim().toLowerCase());
  const finalKeywords = filtered.length > 0 ? filtered : DEFAULT_FALLBACK_KEYWORDS;
  saveActiveKeywords(finalKeywords);
  return finalKeywords;
}

