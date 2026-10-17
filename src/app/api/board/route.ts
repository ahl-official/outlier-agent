import { NextRequest, NextResponse } from 'next/server';
import { getBoardItems, addCandidateToBoard, updateBoardItemStatus, saveBoardItems } from '@/storage';
import { BoardStatus } from '@/types';

export async function GET() {
  const items = getBoardItems();
  return NextResponse.json({ items });
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
      const item = addCandidateToBoard(candidate, breakdown);
      const allItems = getBoardItems();
      return NextResponse.json({ success: true, item, items: allItems });
    }

    if (action === 'updateStatus') {
      const { id, status } = body;
      const updated = updateBoardItemStatus(id, status as BoardStatus);
      const allItems = getBoardItems();
      return NextResponse.json({ success: !!updated, item: updated, items: allItems });
    }

    if (action === 'updateDetails') {
      const { id, notes, assignedTo, scheduledShootDate, postedUrl } = body;
      const updated = updateBoardItemStatus(id, body.status || 'saved', {
        notes,
        assignedTo,
        scheduledShootDate,
        postedUrl
      });
      const allItems = getBoardItems();
      return NextResponse.json({ success: !!updated, item: updated, items: allItems });
    }

    if (action === 'delete') {
      const { id } = body;
      const items = getBoardItems().filter((it) => it.id !== id);
      saveBoardItems(items);
      return NextResponse.json({ success: true, items });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
