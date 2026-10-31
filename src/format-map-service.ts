import { getBoardItems, getSavedRadarCache, getAllFormatLabels, saveFormatLabels, formatLabelKey } from './storage';
import { tagCandidateFormat, TaggerQuotaError } from './breakdown/format-tagger';
import { filterPool, FormatMapFilters, PoolEntry } from './scoring/format-map';

/**
 * Every outlier we know about - saved board items first (they're the curated ones), then the
 * latest radar cache - deduped by video URL and joined with their Format Map tags.
 */
export async function getFormatMapPool(): Promise<PoolEntry[]> {
  const [boardItems, radar, labels] = await Promise.all([getBoardItems(), getSavedRadarCache(), getAllFormatLabels()]);

  const byKey = new Map<string, PoolEntry>();
  for (const candidate of [...boardItems.map((it) => it.candidate), ...radar]) {
    if (!candidate) continue;
    const key = formatLabelKey(candidate);
    if (byKey.has(key)) continue;
    byKey.set(key, { candidate, labels: labels.get(key) });
  }
  return Array.from(byKey.values());
}

export interface TagRunResult {
  tagged: number;
  failed: number;
  remaining: number;
  stoppedReason: 'done' | 'limit' | 'time' | 'quota' | 'storage';
}

// Gemini's free tier allows ~15 requests/minute on flash-lite; stay under it.
const GAP_BETWEEN_CALLS_MS = 4500;

/**
 * Tags untagged outliers in the filtered pool, best multiplier first, one at a time.
 * Stops at `limit`, at the time budget (serverless routes have ~60s), or when Gemini's quota runs out.
 */
export async function tagUntaggedOutliers(
  filters: FormatMapFilters,
  options: { limit: number; budgetMs: number; onProgress?: (msg: string) => void }
): Promise<TagRunResult> {
  const start = Date.now();
  const pool = filterPool(await getFormatMapPool(), filters);
  const queue = pool
    .filter((e) => !e.labels)
    .sort((a, b) => (b.candidate.outlierMultiplier || 0) - (a.candidate.outlierMultiplier || 0));

  let tagged = 0;
  let failed = 0;
  let stoppedReason: TagRunResult['stoppedReason'] = 'done';

  for (let i = 0; i < queue.length; i++) {
    if (tagged + failed >= options.limit) {
      stoppedReason = 'limit';
      break;
    }
    // a video call can take ~30s; don't start one we can't finish
    if (Date.now() - start > options.budgetMs - 32000) {
      stoppedReason = 'time';
      break;
    }
    if (i > 0) await new Promise((r) => setTimeout(r, GAP_BETWEEN_CALLS_MS));

    const { candidate } = queue[i];
    try {
      const labels = await tagCandidateFormat(candidate);
      if (labels) {
        if (!(await saveFormatLabels(candidate, labels))) {
          // every later save would fail too - stop before spending more Gemini calls
          stoppedReason = 'storage';
          break;
        }
        tagged++;
        options.onProgress?.(`tagged ${candidate.url} -> ${labels.format} x ${labels.editingStyle} (${labels.source})`);
      } else {
        failed++;
        options.onProgress?.(`could not tag ${candidate.url}`);
      }
    } catch (err: any) {
      if (err instanceof TaggerQuotaError) {
        stoppedReason = 'quota';
        break;
      }
      failed++;
      options.onProgress?.(`error on ${candidate.url}: ${err.message}`);
    }
  }

  return { tagged, failed, remaining: queue.length - tagged, stoppedReason };
}
