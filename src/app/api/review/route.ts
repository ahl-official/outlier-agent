import { NextRequest, NextResponse } from 'next/server';
import { createReviewLink } from '@/storage';
import { OutlierCandidate, SixReasonsAnalysis } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * Creates a shareable "Send to Sir" visual review link for a candidate's 6-reasons analysis.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const candidate: OutlierCandidate | undefined = body.candidate;
    const sixReasons: SixReasonsAnalysis | undefined = body.sixReasonsAnalysis;

    if (!candidate || !sixReasons) {
      return NextResponse.json({ success: false, error: 'candidate and sixReasonsAnalysis are required' }, { status: 400 });
    }

    const link = await createReviewLink(candidate, sixReasons);
    if (!link) {
      return NextResponse.json({ success: false, error: 'Could not create review link (storage unavailable)' }, { status: 500 });
    }

    const origin = req.headers.get('origin') || new URL(req.url).origin;
    return NextResponse.json({
      success: true,
      token: link.id,
      url: `${origin}/review/${link.id}`
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
