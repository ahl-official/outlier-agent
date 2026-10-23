import { getSupabase } from './lib/supabase';
import { BoardItem, BoardStatus, OutlierCandidate, DetailedOutlierBreakdown } from './types';

// In-memory fallback so the app never hard-crashes if Supabase is briefly unreachable.
// This is NOT the source of truth (Supabase is) - it only serves stale-but-usable data
// on a transient failure, and is NOT shared across serverless instances/cold starts.
const inMemoryStore = {
  board: null as BoardItem[] | null,
  radarCache: null as OutlierCandidate[] | null,
  searchCache: {} as Record<string, SearchCacheRecord>,
  brandConfig: null as BrandConfig | null,
  teamMembers: null as TeamMember[] | null
};

function normalizeVideoKey(urlOrId: string): string {
  return urlOrId.trim().toLowerCase().replace(/\/$/, '');
}

// ---------------------------------------------------------------------
// 1. BOARD / SAVED OUTLIERS PERSISTENCE
// ---------------------------------------------------------------------
export async function getBoardItems(_forceRefresh: boolean = false): Promise<BoardItem[]> {
  const supabase = getSupabase();
  if (!supabase) return inMemoryStore.board || [];

  try {
    const { data, error } = await supabase
      .from('board_items')
      .select('*')
      .order('added_at', { ascending: false });
    if (error) throw error;

    const items: BoardItem[] = (data || []).map(rowToBoardItem);
    inMemoryStore.board = items;
    return items;
  } catch (err: any) {
    console.warn(`[Storage] getBoardItems failed (${err.message}), using in-memory fallback`);
    return inMemoryStore.board || [];
  }
}

export async function saveBoardItems(items: BoardItem[]): Promise<void> {
  inMemoryStore.board = items;
  const supabase = getSupabase();
  if (!supabase) return;

  try {
    const { error: delErr } = await supabase.from('board_items').delete().neq('id', '__never__');
    if (delErr) throw delErr;
    if (items.length > 0) {
      const { error: insErr } = await supabase.from('board_items').insert(items.map(boardItemToRow));
      if (insErr) throw insErr;
    }
  } catch (err: any) {
    console.warn(`[Storage] saveBoardItems failed: ${err.message}`);
  }
}

export async function addCandidateToBoard(candidate: OutlierCandidate, breakdown?: DetailedOutlierBreakdown): Promise<BoardItem> {
  const items = await getBoardItems();
  const existingIdx = items.findIndex((it) => it.candidate.url === candidate.url || it.candidate.id === candidate.id);

  if (existingIdx !== -1) {
    if (breakdown) {
      items[existingIdx].breakdown = breakdown;
    }
    items[existingIdx].updatedAt = new Date().toISOString();
    await upsertBoardItem(items[existingIdx]);
    inMemoryStore.board = items;
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
  await upsertBoardItem(newItem);
  inMemoryStore.board = items;
  return newItem;
}

export async function updateBoardItemStatus(id: string, status: BoardStatus, extra?: Partial<BoardItem>): Promise<BoardItem | null> {
  const items = await getBoardItems();
  const idx = items.findIndex((it) => it.id === id);
  if (idx === -1) return null;

  items[idx] = {
    ...items[idx],
    ...extra,
    status,
    updatedAt: new Date().toISOString()
  };

  await upsertBoardItem(items[idx]);
  inMemoryStore.board = items;
  return items[idx];
}

async function upsertBoardItem(item: BoardItem): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    const { error } = await supabase.from('board_items').upsert(boardItemToRow(item));
    if (error) throw error;
  } catch (err: any) {
    console.warn(`[Storage] upsertBoardItem failed: ${err.message}`);
  }
}

function boardItemToRow(item: BoardItem) {
  return {
    id: item.id,
    candidate_id: item.candidate.id,
    candidate_url: item.candidate.url,
    candidate: item.candidate,
    breakdown: item.breakdown ?? null,
    status: item.status,
    assigned_to: item.assignedTo ?? null,
    notes: item.notes ?? null,
    tags: item.tags ?? null,
    scheduled_shoot_date: item.scheduledShootDate ?? null,
    posted_url: item.postedUrl ?? null,
    added_at: item.addedAt,
    updated_at: item.updatedAt
  };
}

function rowToBoardItem(row: any): BoardItem {
  return {
    id: row.id,
    candidate: row.candidate,
    breakdown: row.breakdown ?? undefined,
    status: row.status,
    assignedTo: row.assigned_to ?? undefined,
    notes: row.notes ?? undefined,
    tags: row.tags ?? undefined,
    scheduledShootDate: row.scheduled_shoot_date ?? undefined,
    postedUrl: row.posted_url ?? undefined,
    addedAt: row.added_at,
    updatedAt: row.updated_at
  };
}

// ---------------------------------------------------------------------
// 2. RADAR SCAN CACHE
// ---------------------------------------------------------------------
export async function getSavedRadarCache(): Promise<OutlierCandidate[]> {
  const supabase = getSupabase();
  if (!supabase) return inMemoryStore.radarCache || [];

  try {
    const { data, error } = await supabase
      .from('radar_cache')
      .select('candidate')
      .order('outlier_score', { ascending: false });
    if (error) throw error;

    const items = (data || []).map((r: any) => r.candidate as OutlierCandidate);
    inMemoryStore.radarCache = items;
    return items;
  } catch (err: any) {
    console.warn(`[Storage] getSavedRadarCache failed (${err.message}), using in-memory fallback`);
    return inMemoryStore.radarCache || [];
  }
}

export async function saveRadarCache(candidates: OutlierCandidate[]): Promise<void> {
  inMemoryStore.radarCache = candidates;
  const supabase = getSupabase();
  if (!supabase) return;

  try {
    const { error: delErr } = await supabase.from('radar_cache').delete().neq('id', '__never__');
    if (delErr) throw delErr;
    if (candidates.length > 0) {
      const deduped = Array.from(new Map(candidates.map((c) => [c.id, c])).values());
      const rows = deduped.map((c) => ({
        id: c.id,
        candidate: c,
        outlier_score: c.outlierScore,
        platform: c.platform,
        matched_keyword: c.matchedKeyword,
        updated_at: new Date().toISOString()
      }));
      const { error: insErr } = await supabase.from('radar_cache').insert(rows);
      if (insErr) throw insErr;
    }
  } catch (err: any) {
    console.warn(`[Storage] saveRadarCache failed: ${err.message}`);
  }
}

/**
 * Merges candidates into the existing radar cache instead of replacing it wholesale.
 * Used by the scheduled background scan, which only covers a couple of keywords per run
 * (to stay inside the serverless time budget) and must not wipe out everything else that's
 * already cached from earlier runs.
 */
export async function upsertRadarCache(candidates: OutlierCandidate[]): Promise<void> {
  if (candidates.length === 0) return;

  // Dedupe by id first - Postgres' ON CONFLICT DO UPDATE errors if the same row is
  // targeted twice within one upsert call, which happens whenever two scanned keywords
  // matched the same video.
  const dedupedCandidates = Array.from(new Map(candidates.map((c) => [c.id, c])).values());

  const existing = inMemoryStore.radarCache || [];
  const merged = new Map(existing.map((c) => [c.id, c]));
  dedupedCandidates.forEach((c) => merged.set(c.id, c));
  inMemoryStore.radarCache = Array.from(merged.values());

  const supabase = getSupabase();
  if (!supabase) return;

  try {
    const rows = dedupedCandidates.map((c) => ({
      id: c.id,
      candidate: c,
      outlier_score: c.outlierScore,
      platform: c.platform,
      matched_keyword: c.matchedKeyword,
      updated_at: new Date().toISOString()
    }));
    const { error } = await supabase.from('radar_cache').upsert(rows);
    if (error) throw error;
  } catch (err: any) {
    console.warn(`[Storage] upsertRadarCache failed: ${err.message}`);
  }
}

// ---------------------------------------------------------------------
// 3. MASTER VIDEO REGISTRY & TOKEN-SAVING DEDUPLICATION
// ---------------------------------------------------------------------
export interface RegistryEntry {
  candidate: OutlierCandidate;
  breakdown?: DetailedOutlierBreakdown;
  cachedAt: string;
}

export async function getCachedVideo(urlOrId: string, maxAgeHours: number = 72): Promise<RegistryEntry | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const key = normalizeVideoKey(urlOrId);
  try {
    const { data, error } = await supabase
      .from('video_registry')
      .select('candidate, breakdown, cached_at')
      .eq('id', key)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;

    const ageMs = Date.now() - new Date(data.cached_at).getTime();
    if (ageMs > maxAgeHours * 60 * 60 * 1000) return null;

    return { candidate: data.candidate, breakdown: data.breakdown ?? undefined, cachedAt: data.cached_at };
  } catch (err: any) {
    console.warn(`[Storage] getCachedVideo failed: ${err.message}`);
    return null;
  }
}

export async function saveVideoToRegistry(candidate: OutlierCandidate, breakdown?: DetailedOutlierBreakdown): Promise<void> {
  await saveVideosToRegistry([{ candidate, breakdown }]);
}

/**
 * Bulk variant - a radar scan can produce 10-20 candidates at once, so this upserts them
 * in a single round trip instead of one request per candidate.
 */
export async function saveVideosToRegistry(entries: { candidate: OutlierCandidate; breakdown?: DetailedOutlierBreakdown }[]): Promise<void> {
  const supabase = getSupabase();
  if (!supabase || entries.length === 0) return;

  try {
    const cachedAt = new Date().toISOString();
    const rows = entries.map(({ candidate, breakdown }) => ({
      id: normalizeVideoKey(candidate.url || candidate.id),
      candidate,
      breakdown: breakdown ?? null,
      cached_at: cachedAt
    }));
    const { error } = await supabase.from('video_registry').upsert(rows);
    if (error) throw error;
  } catch (err: any) {
    console.warn(`[Storage] saveVideosToRegistry failed: ${err.message}`);
  }
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

export async function getKeywordSearchCache(keyword: string, platform: string, maxAgeHours: number = 24): Promise<OutlierCandidate[] | null> {
  const key = `${keyword.toLowerCase().trim()}_${platform}`;
  const supabase = getSupabase();
  if (!supabase) {
    const cached = inMemoryStore.searchCache[key];
    return cached ? cached.candidates : null;
  }

  try {
    const { data, error } = await supabase
      .from('search_cache')
      .select('candidates, searched_at')
      .eq('id', key)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;

    const ageMs = Date.now() - new Date(data.searched_at).getTime();
    if (ageMs > maxAgeHours * 60 * 60 * 1000) return null;

    return data.candidates;
  } catch (err: any) {
    console.warn(`[Storage] getKeywordSearchCache failed: ${err.message}`);
    return null;
  }
}

export async function saveKeywordSearchCache(keyword: string, platform: string, candidates: OutlierCandidate[]): Promise<void> {
  const key = `${keyword.toLowerCase().trim()}_${platform}`;
  const searchedAt = new Date().toISOString();
  inMemoryStore.searchCache[key] = { keyword, platform, candidates, searchedAt };

  const supabase = getSupabase();
  if (!supabase) return;

  try {
    const { error } = await supabase.from('search_cache').upsert({
      id: key,
      keyword,
      platform,
      candidates,
      searched_at: searchedAt
    });
    if (error) throw error;
  } catch (err: any) {
    console.warn(`[Storage] saveKeywordSearchCache failed: ${err.message}`);
  }
}

// ---------------------------------------------------------------------
// 5. BRAND PRESETS & USER TARGET KEYWORDS MANAGEMENT
// ---------------------------------------------------------------------
import {
  AHL_SPECIFIC_KEYWORDS,
  ALCHEMANE_SPECIFIC_KEYWORDS,
  AHL_CATEGORY_GROUPS,
  ALCHEMANE_CATEGORY_GROUPS,
  KeywordGroup
} from './keywords';

export const AHL_DEFAULT_KEYWORDS = AHL_SPECIFIC_KEYWORDS;
export const ALCHEMANE_DEFAULT_KEYWORDS = ALCHEMANE_SPECIFIC_KEYWORDS;

export interface BrandConfig {
  activeBrand: 'AHL' | 'Alchemane';
  ahlKeywords: string[];
  alchemaneKeywords: string[];
}

export async function getBrandConfig(): Promise<BrandConfig> {
  const fallback: BrandConfig = {
    activeBrand: 'AHL',
    ahlKeywords: AHL_DEFAULT_KEYWORDS,
    alchemaneKeywords: ALCHEMANE_DEFAULT_KEYWORDS
  };

  const supabase = getSupabase();
  if (!supabase) return inMemoryStore.brandConfig || fallback;

  try {
    const { data, error } = await supabase.from('brand_config').select('*').eq('id', 'singleton').maybeSingle();
    if (error) throw error;

    const config: BrandConfig = {
      activeBrand: data?.active_brand === 'Alchemane' ? 'Alchemane' : 'AHL',
      ahlKeywords: Array.isArray(data?.ahl_keywords) && data.ahl_keywords.length > 0 ? data.ahl_keywords : AHL_DEFAULT_KEYWORDS,
      alchemaneKeywords: Array.isArray(data?.alchemane_keywords) && data.alchemane_keywords.length > 0 ? data.alchemane_keywords : ALCHEMANE_DEFAULT_KEYWORDS
    };
    inMemoryStore.brandConfig = config;
    return config;
  } catch (err: any) {
    console.warn(`[Storage] getBrandConfig failed: ${err.message}`);
    return inMemoryStore.brandConfig || fallback;
  }
}

export async function saveBrandConfig(config: BrandConfig): Promise<void> {
  inMemoryStore.brandConfig = config;
  const supabase = getSupabase();
  if (!supabase) return;

  try {
    const { error } = await supabase.from('brand_config').upsert({
      id: 'singleton',
      active_brand: config.activeBrand,
      ahl_keywords: config.ahlKeywords,
      alchemane_keywords: config.alchemaneKeywords
    });
    if (error) throw error;
  } catch (err: any) {
    console.warn(`[Storage] saveBrandConfig failed: ${err.message}`);
  }
}

export async function getActiveBrand(): Promise<'AHL' | 'Alchemane'> {
  return (await getBrandConfig()).activeBrand;
}

export async function getActiveKeywords(): Promise<string[]> {
  const config = await getBrandConfig();
  return config.activeBrand === 'Alchemane' ? config.alchemaneKeywords : config.ahlKeywords;
}

export async function getActiveCategoryGroups(): Promise<KeywordGroup[]> {
  const brand = await getActiveBrand();
  return brand === 'Alchemane' ? ALCHEMANE_CATEGORY_GROUPS : AHL_CATEGORY_GROUPS;
}

export async function switchActiveBrand(brand: 'AHL' | 'Alchemane'): Promise<{ activeBrand: 'AHL' | 'Alchemane'; keywords: string[]; categoryGroups: KeywordGroup[] }> {
  const config = await getBrandConfig();
  config.activeBrand = brand;
  await saveBrandConfig(config);
  const keywords = brand === 'Alchemane' ? config.alchemaneKeywords : config.ahlKeywords;
  const categoryGroups = brand === 'Alchemane' ? ALCHEMANE_CATEGORY_GROUPS : AHL_CATEGORY_GROUPS;
  return { activeBrand: brand, keywords, categoryGroups };
}

export async function addCustomKeyword(keyword: string): Promise<string[]> {
  const config = await getBrandConfig();
  const trimmed = keyword.trim();
  if (!trimmed) return config.activeBrand === 'Alchemane' ? config.alchemaneKeywords : config.ahlKeywords;

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
    await saveBrandConfig(config);
  }
  return targetList;
}

export async function removeCustomKeyword(keyword: string): Promise<string[]> {
  const config = await getBrandConfig();
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
  await saveBrandConfig(config);
  return finalKeywords;
}

// ---------------------------------------------------------------------
// 6. TEAM MEMBERS
// ---------------------------------------------------------------------
export interface TeamMember {
  id: string;
  name: string;
  role: string;
  dailyTarget: number;
  phone?: string;
  notes?: string;
}

export const DEFAULT_TEAM_MEMBERS: TeamMember[] = [
  {
    id: 'member-1',
    name: 'Member 1 (Aman)',
    role: 'Social Media Specialist',
    dailyTarget: 10,
    phone: '',
    notes: 'YouTube Shorts & Outlier Discovery'
  },
  {
    id: 'member-2',
    name: 'Member 2 (Rahul)',
    role: 'Content Strategist',
    dailyTarget: 10,
    phone: '',
    notes: 'Viral Transformation Hooks'
  },
  {
    id: 'member-3',
    name: 'Member 3 (Priya)',
    role: 'Reels & Creative Researcher',
    dailyTarget: 10,
    phone: '',
    notes: 'AHL & Alchemane Outliers'
  }
];

export async function getTeamMembers(): Promise<TeamMember[]> {
  const supabase = getSupabase();
  if (!supabase) return inMemoryStore.teamMembers || DEFAULT_TEAM_MEMBERS;

  try {
    const { data, error } = await supabase.from('team_members').select('*');
    if (error) throw error;

    if (!Array.isArray(data) || data.length === 0) {
      return DEFAULT_TEAM_MEMBERS;
    }
    const members: TeamMember[] = data.map((row: any) => ({
      id: row.id,
      name: row.name,
      role: row.role,
      dailyTarget: row.daily_target,
      phone: row.phone ?? undefined,
      notes: row.notes ?? undefined
    }));
    inMemoryStore.teamMembers = members;
    return members;
  } catch (err: any) {
    console.warn(`[Storage] getTeamMembers failed: ${err.message}`);
    return inMemoryStore.teamMembers || DEFAULT_TEAM_MEMBERS;
  }
}

export async function saveTeamMembers(members: TeamMember[]): Promise<TeamMember[]> {
  inMemoryStore.teamMembers = members;
  const supabase = getSupabase();
  if (!supabase) return members;

  try {
    const { error: delErr } = await supabase.from('team_members').delete().neq('id', '__never__');
    if (delErr) throw delErr;
    if (members.length > 0) {
      const rows = members.map((m) => ({
        id: m.id,
        name: m.name,
        role: m.role,
        daily_target: m.dailyTarget,
        phone: m.phone ?? null,
        notes: m.notes ?? null
      }));
      const { error: insErr } = await supabase.from('team_members').insert(rows);
      if (insErr) throw insErr;
    }
  } catch (err: any) {
    console.warn(`[Storage] saveTeamMembers failed: ${err.message}`);
  }
  return members;
}
