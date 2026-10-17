import fs from 'fs';
import path from 'path';
import os from 'os';
import { BoardItem, BoardStatus, OutlierCandidate, DetailedOutlierBreakdown } from './types';

// Detect Serverless / read-only production environments
const isServerless = !!(
  process.env.VERCEL || 
  process.env.AWS_LAMBDA_FUNCTION_NAME || 
  process.env.NETLIFY ||
  process.env.LAMBDA_TASK_ROOT ||
  process.env.NODE_ENV === 'production'
);

// Seed data directory (read-only bundled files in process.cwd())
const BUNDLED_DATA_DIR = path.join(process.cwd(), 'data');

// Writable data directory: use /tmp on serverless environments to avoid EROFS error
const WRITABLE_DATA_DIR = isServerless 
  ? path.join(os.tmpdir(), 'outlier_agent_data')
  : path.join(process.cwd(), 'data');

function getFilePath(filename: string): { readPath: string; writePath: string } {
  const writePath = path.join(WRITABLE_DATA_DIR, filename);
  const bundledPath = path.join(BUNDLED_DATA_DIR, filename);

  // If writable copy exists (e.g. in /tmp), read that; otherwise read bundled seed
  const readPath = fs.existsSync(writePath) ? writePath : bundledPath;
  return { readPath, writePath };
}

function safeEnsureDir(dir: string): boolean {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return true;
  } catch (err: any) {
    console.warn(`[Storage] Cannot create directory ${dir}: ${err.message}`);
    return false;
  }
}

// In-Memory fallback store so the app NEVER crashes even on strict read-only environments
const inMemoryStore = {
  board: null as BoardItem[] | null,
  radarCache: null as OutlierCandidate[] | null,
  videoRegistry: {} as Record<string, any>,
  searchCache: {} as Record<string, any>,
  keywords: null as string[] | null
};

function safeWriteJson(filename: string, data: any): void {
  const { writePath } = getFilePath(filename);
  try {
    safeEnsureDir(path.dirname(writePath));
    fs.writeFileSync(writePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err: any) {
    console.warn(`[Storage] Write failed for ${filename} (${err.code || err.message}). Attempting /tmp fallback.`);
    try {
      const tmpPath = path.join(os.tmpdir(), 'outlier_agent_data', filename);
      safeEnsureDir(path.dirname(tmpPath));
      fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (tmpErr: any) {
      console.warn(`[Storage] Fallback write to /tmp also failed (${tmpErr.code || tmpErr.message}). Using in-memory store.`);
    }
  }
}

function safeReadJson<T>(filename: string, fallback: T): T {
  const { readPath } = getFilePath(filename);
  const tmpPath = path.join(os.tmpdir(), 'outlier_agent_data', filename);
  const candidatePaths = [readPath, tmpPath, path.join(BUNDLED_DATA_DIR, filename)];

  for (const p of candidatePaths) {
    try {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf-8');
        return JSON.parse(raw);
      }
    } catch {
      // Continue to next path
    }
  }
  return fallback;
}

// ---------------------------------------------------------------------
// 1. BOARD / SAVED OUTLIERS PERSISTENCE
// ---------------------------------------------------------------------
export function getBoardItems(forceRefresh: boolean = false): BoardItem[] {
  if (!forceRefresh && inMemoryStore.board && inMemoryStore.board.length > 0) {
    return inMemoryStore.board;
  }
  const fromDisk = safeReadJson<BoardItem[] | null>('board.json', null);
  if (Array.isArray(fromDisk)) {
    inMemoryStore.board = fromDisk;
    return fromDisk;
  }
  return inMemoryStore.board || [];
}

export function saveBoardItems(items: BoardItem[]): void {
  inMemoryStore.board = items;
  safeWriteJson('board.json', items);
}

export function addCandidateToBoard(candidate: OutlierCandidate, breakdown?: DetailedOutlierBreakdown): BoardItem {
  const items = getBoardItems();
  const existingIdx = items.findIndex((it) => it.candidate.url === candidate.url || it.candidate.id === candidate.id);

  if (existingIdx !== -1) {
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
  if (inMemoryStore.radarCache) return inMemoryStore.radarCache;
  const cached = safeReadJson<OutlierCandidate[]>('radar_cache.json', []);
  inMemoryStore.radarCache = cached;
  return cached;
}

export function saveRadarCache(candidates: OutlierCandidate[]): void {
  inMemoryStore.radarCache = candidates;
  safeWriteJson('radar_cache.json', candidates);
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
  if (Object.keys(inMemoryStore.videoRegistry).length > 0) {
    return inMemoryStore.videoRegistry;
  }
  const registry = safeReadJson<Record<string, RegistryEntry>>('video_registry.json', {});
  inMemoryStore.videoRegistry = registry;
  return registry;
}

export function getCachedVideo(urlOrId: string, maxAgeHours: number = 72): RegistryEntry | null {
  const registry = getVideoRegistry();
  const key = normalizeVideoKey(urlOrId);
  const entry = registry[key];
  if (!entry) return null;

  const ageMs = Date.now() - new Date(entry.cachedAt).getTime();
  if (ageMs > maxAgeHours * 60 * 60 * 1000) {
    return null;
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

  inMemoryStore.videoRegistry = registry;
  safeWriteJson('video_registry.json', registry);
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
  const store = getSearchCacheStore();
  const key = `${keyword.toLowerCase().trim()}_${platform}`;
  const record = store[key];
  if (!record) return null;

  const ageMs = Date.now() - new Date(record.searchedAt).getTime();
  if (ageMs > maxAgeHours * 60 * 60 * 1000) return null;

  return record.candidates;
}

function getSearchCacheStore(): Record<string, SearchCacheRecord> {
  if (Object.keys(inMemoryStore.searchCache).length > 0) {
    return inMemoryStore.searchCache;
  }
  const store = safeReadJson<Record<string, SearchCacheRecord>>('search_cache.json', {});
  inMemoryStore.searchCache = store;
  return store;
}

export function saveKeywordSearchCache(keyword: string, platform: string, candidates: OutlierCandidate[]): void {
  const store = getSearchCacheStore();
  const key = `${keyword.toLowerCase().trim()}_${platform}`;
  store[key] = {
    keyword,
    platform,
    candidates,
    searchedAt: new Date().toISOString()
  };

  inMemoryStore.searchCache = store;
  safeWriteJson('search_cache.json', store);
}

function normalizeVideoKey(urlOrId: string): string {
  return urlOrId.trim().toLowerCase().replace(/\/$/, '');
}

// ---------------------------------------------------------------------
// 5. BRAND PRESETS & USER TARGET KEYWORDS MANAGEMENT
// ---------------------------------------------------------------------
export const AHL_DEFAULT_KEYWORDS = [
  'hair system for men',
  'hair patch transformation',
  'non surgical hair replacement',
  'hair patch before and after',
  'hair transplant alternative',
  'hair patch cost india',
  'natural hairline patch men'
];

export const ALCHEMANE_DEFAULT_KEYWORDS = [
  'hair toppers for women',
  'women hair thinning solution',
  'clip in hair extensions natural',
  'invisible hair patch women',
  'hair topper transformation before after',
  'crown hair loss female india',
  'human hair extensions volume'
];

export interface BrandConfig {
  activeBrand: 'AHL' | 'Alchemane';
  ahlKeywords: string[];
  alchemaneKeywords: string[];
}

export function getBrandConfig(): BrandConfig {
  const fallback: BrandConfig = {
    activeBrand: 'AHL',
    ahlKeywords: AHL_DEFAULT_KEYWORDS,
    alchemaneKeywords: ALCHEMANE_DEFAULT_KEYWORDS
  };

  const stored = safeReadJson<BrandConfig>('brand_config.json', fallback);
  return {
    activeBrand: stored.activeBrand || 'AHL',
    ahlKeywords: Array.isArray(stored.ahlKeywords) && stored.ahlKeywords.length > 0 ? stored.ahlKeywords : AHL_DEFAULT_KEYWORDS,
    alchemaneKeywords: Array.isArray(stored.alchemaneKeywords) && stored.alchemaneKeywords.length > 0 ? stored.alchemaneKeywords : ALCHEMANE_DEFAULT_KEYWORDS
  };
}

export function saveBrandConfig(config: BrandConfig): void {
  safeWriteJson('brand_config.json', config);
}

export function getActiveBrand(): 'AHL' | 'Alchemane' {
  return getBrandConfig().activeBrand;
}

export function getActiveKeywords(): string[] {
  const config = getBrandConfig();
  return config.activeBrand === 'Alchemane' ? config.alchemaneKeywords : config.ahlKeywords;
}

export function switchActiveBrand(brand: 'AHL' | 'Alchemane'): { activeBrand: 'AHL' | 'Alchemane'; keywords: string[] } {
  const config = getBrandConfig();
  config.activeBrand = brand;
  saveBrandConfig(config);
  const keywords = brand === 'Alchemane' ? config.alchemaneKeywords : config.ahlKeywords;
  inMemoryStore.keywords = keywords;
  return { activeBrand: brand, keywords };
}

export function addCustomKeyword(keyword: string): string[] {
  const config = getBrandConfig();
  const trimmed = keyword.trim();
  if (!trimmed) return getActiveKeywords();

  const isAlchemane = config.activeBrand === 'Alchemane';
  const targetList = isAlchemane ? config.alchemaneKeywords : config.ahlKeywords;
  const exists = targetList.some((k) => k.toLowerCase() === trimmed.toLowerCase());
  if (!exists) {
    targetList.push(trimmed);
    if (isAlchemane) {
      config.alchemaneKeywords = targetList;
    } else {
      config.ahlKeywords = targetList;
    }
    saveBrandConfig(config);
  }
  return targetList;
}

export function removeCustomKeyword(keyword: string): string[] {
  const config = getBrandConfig();
  const isAlchemane = config.activeBrand === 'Alchemane';
  const targetList = isAlchemane ? config.alchemaneKeywords : config.ahlKeywords;
  const defaultList = isAlchemane ? ALCHEMANE_DEFAULT_KEYWORDS : AHL_DEFAULT_KEYWORDS;

  const filtered = targetList.filter((k) => k.toLowerCase() !== keyword.trim().toLowerCase());
  const finalKeywords = filtered.length > 0 ? filtered : defaultList;

  if (isAlchemane) {
    config.alchemaneKeywords = finalKeywords;
  } else {
    config.ahlKeywords = finalKeywords;
  }
  saveBrandConfig(config);
  return finalKeywords;
}
