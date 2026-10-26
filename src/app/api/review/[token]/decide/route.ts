import { NextRequest, NextResponse } from 'next/server';
import { getReviewLink, decideReviewLink } from '@/storage';
import { getGoogleSheetsClient } from '@/google-sheets';
import { normalizeVideoUrl } from '@/lib/video-url';

export const dynamic = 'force-dynamic';

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID || '14nj56PxfqLHcv8xTB03_RKSfyDD2s-C9Psk3LMnWGdU';

function getISTTimestamp(): string {
  const now = new Date();
  const d = now.toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata', day: '2-digit', month: '2-digit', year: 'numeric' });
  const t = now.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true });
  return `${d}, ${t}`;
}

/**
 * Records Sir's Approve/Disapprove decision from the public swipeable review page, and marks
 * it in the same "Outliers Tracker" sheet row for that video (columns P/R - the sheet already
 * had these reserved as "Sir's Approval Status" / "Last Updated", defaulting to "Pending Review"
 * when the video was first logged).
 */
export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const body = await req.json().catch(() => ({}));
    const decision = body.decision;
    if (decision !== 'approved' && decision !== 'disapproved') {
      return NextResponse.json({ success: false, error: 'decision must be "approved" or "disapproved"' }, { status: 400 });
    }

    const existing = await getReviewLink(params.token);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Review link not found or expired' }, { status: 404 });
    }
    if (existing.status !== 'pending') {
      return NextResponse.json({ success: false, error: `Already marked as ${existing.status}`, link: existing }, { status: 409 });
    }

    const updated = await decideReviewLink(params.token, decision);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Could not record decision' }, { status: 500 });
    }

    // Best-effort: mark the matching row in the Outliers Tracker sheet. A sheet write failure
    // should not fail the decision itself - Sir's tap is already recorded in Supabase.
    let sheetUpdated = false;
    try {
      sheetUpdated = await markApprovalInSheet(existing.videoUrl, decision);
    } catch (err: any) {
      console.warn('[Review Decide] Sheet update failed:', err.message);
    }

    return NextResponse.json({ success: true, link: updated, sheetUpdated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

async function markApprovalInSheet(videoUrl: string, decision: 'approved' | 'disapproved'): Promise<boolean> {
  const sheets = getGoogleSheetsClient();
  if (!sheets) return false;

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "'Outliers Tracker'!A2:R1000"
  });
  const rows = response.data.values || [];
  const target = normalizeVideoUrl(videoUrl);

  const rowIdx = rows.findIndex((row: any[]) => normalizeVideoUrl((row[5] || '').trim()) === target);
  if (rowIdx === -1) return false;

  const rowNumber = rowIdx + 2; // +2: 1-indexed sheet rows, data starts at row 2
  const statusLabel = decision === 'approved' ? 'Approved ✅ (Visual Review)' : 'Disapproved ❌ (Visual Review)';

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'Outliers Tracker'!P${rowNumber}:R${rowNumber}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[statusLabel, 'Decided via swipeable visual review link', getISTTimestamp()]]
    }
  });

  return true;
}
