import { NextRequest, NextResponse } from 'next/server';
import { getBoardItems, addCandidateToBoard, updateBoardItemStatus, saveBoardItems } from '@/storage';
import { BoardStatus } from '@/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const force = url.searchParams.get('refresh') === 'true' || !!url.searchParams.get('t');
  const items = await getBoardItems(force);
  return NextResponse.json(
    { items },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0'
      }
    }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'add') {
      const { candidate, breakdown } = body;
      if (!candidate) {
        return NextResponse.json({ success: false, error: 'Candidate is required' }, { status: 400 });
      }
      const item = await addCandidateToBoard(candidate, breakdown);
      const allItems = await getBoardItems();
      return NextResponse.json({ success: true, item, items: allItems });
    }

    if (action === 'updateStatus') {
      const { id, status } = body;
      const updated = await updateBoardItemStatus(id, status as BoardStatus);
      const allItems = await getBoardItems();
      return NextResponse.json({ success: !!updated, item: updated, items: allItems });
    }

    if (action === 'updateDetails') {
      const { id, notes, assignedTo, scheduledShootDate, postedUrl } = body;
      const updated = await updateBoardItemStatus(id, body.status || 'saved', {
        notes,
        assignedTo,
        scheduledShootDate,
        postedUrl
      });
      const allItems = await getBoardItems();
      return NextResponse.json({ success: !!updated, item: updated, items: allItems });
    }

    if (action === 'delete') {
      const { id } = body;
      const current = await getBoardItems();
      const items = current.filter((it) => it.id !== id);
      await saveBoardItems(items);
      return NextResponse.json({ success: true, items });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
