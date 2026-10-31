import { NextRequest, NextResponse } from 'next/server';
import { getFormatMapPool, tagUntaggedOutliers } from '@/format-map-service';
import { buildFormatMap, FormatMapFilters } from '@/scoring/format-map';

export const maxDuration = 60; // tagging downloads videos and calls Gemini one at a time
export const dynamic = 'force-dynamic';

function readFilters(source: { get(name: string): string | null }): FormatMapFilters {
  const brand = source.get('brand');
  const platform = source.get('platform');
  const minMultiplier = parseFloat(source.get('minMultiplier') || '3');
  return {
    brand: brand === 'AHL' || brand === 'Alchemane' ? brand : 'all',
    platform: platform === 'youtube' || platform === 'instagram' ? platform : 'all',
    minMultiplier: Number.isFinite(minMultiplier) ? minMultiplier : 3
  };
}

export async function GET(req: NextRequest) {
  try {
    const filters = readFilters(new URL(req.url).searchParams);
    const map = buildFormatMap(await getFormatMapPool(), filters);
    return NextResponse.json({ success: true, filters, map }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/** { action: 'tag', brand, platform, minMultiplier, limit } - tags the next batch of untagged outliers. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (body.action !== 'tag') {
      return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
    }
    const filters = readFilters({ get: (name: string) => (body[name] != null ? String(body[name]) : null) });
    const limit = Math.min(20, Math.max(1, parseInt(body.limit || '8', 10)));
    const result = await tagUntaggedOutliers(filters, { limit, budgetMs: 55000 });
    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
