import { NextRequest, NextResponse } from 'next/server';
import { getReviewLink } from '@/storage';

export const dynamic = 'force-dynamic';

/**
 * Public, unauthenticated read for the swipeable review page - Sir opens this link on his
 * phone with no login, so this intentionally has no auth check. The token itself (random,
 * unguessable, not sequential) is what keeps a link private to whoever it was sent to.
 */
export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  const link = await getReviewLink(params.token);
  if (!link) {
    return NextResponse.json({ success: false, error: 'Review link not found or expired' }, { status: 404 });
  }
  return NextResponse.json({ success: true, link });
}
