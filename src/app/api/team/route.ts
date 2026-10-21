import { NextRequest, NextResponse } from 'next/server';
import { getTeamMembers, saveTeamMembers, TeamMember } from '@/storage';
import { google } from 'googleapis';
import path from 'path';
import fs from 'fs';

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID || '14nj56PxfqLHcv8xTB03_RKSfyDD2s-C9Psk3LMnWGdU';

function getGoogleSheetsClient() {
  const serviceAccountPath = path.resolve(process.cwd(), 'service account.json');
  if (!fs.existsSync(serviceAccountPath)) {
    return null;
  }
  const auth = new google.auth.GoogleAuth({
    keyFile: serviceAccountPath,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  return google.sheets({ version: 'v4', auth });
}

async function fetchMembersFromGoogleSheet(): Promise<TeamMember[] | null> {
  try {
    const sheets = getGoogleSheetsClient();
    if (!sheets) return null;

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "'Team Members'!A2:F50"
    });

    const rows = res.data.values;
    if (!rows || rows.length === 0) return null;

    const sheetMembers: TeamMember[] = [];
    rows.forEach((row, idx) => {
      const id = (row[0] || `member-${idx + 1}`).trim();
      const name = (row[1] || '').trim();
      const role = (row[2] || 'Social Media Specialist').trim();
      const target = Number(row[3]) || 10;
      const notes = (row[4] || '').trim();
      const status = (row[5] || 'Active').trim();

      if (name && status.toLowerCase() !== 'inactive') {
        sheetMembers.push({
          id,
          name,
          role,
          dailyTarget: target,
          notes
        });
      }
    });

    if (sheetMembers.length > 0) {
      saveTeamMembers(sheetMembers);
      return sheetMembers;
    }
    return null;
  } catch (err: any) {
    console.warn('[Team API] Could not fetch from Google Sheet Team Members tab:', err.message);
    return null;
  }
}

async function syncMembersToGoogleSheet(members: TeamMember[]): Promise<boolean> {
  try {
    const sheets = getGoogleSheetsClient();
    if (!sheets) return false;

    // Clear old rows A2:F50 in Team Members tab
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: "'Team Members'!A2:F50"
    });

    const rows = members.map((m, idx) => [
      m.id || `member-${idx + 1}`,
      m.name,
      m.role || 'Social Media Specialist',
      m.dailyTarget || 10,
      m.notes || '',
      'Active'
    ]);

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `'Team Members'!A2:F${rows.length + 1}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: rows }
    });

    return true;
  } catch (err: any) {
    console.warn('[Team API] Could not sync to Google Sheet Team Members tab:', err.message);
    return false;
  }
}

export async function GET() {
  try {
    // 1. Try fetching latest rows directly from Google Sheet tab "Team Members"
    const fromSheet = await fetchMembersFromGoogleSheet();
    if (fromSheet && fromSheet.length > 0) {
      return NextResponse.json({
        success: true,
        source: 'google_sheets',
        members: fromSheet
      });
    }

    // 2. Fallback to local storage
    const members = getTeamMembers();
    return NextResponse.json({
      success: true,
      source: 'local_storage',
      members
    });
  } catch (error: any) {
    console.error('Error fetching team members:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch team members' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Direct array replacement
    if (Array.isArray(body.members)) {
      const validMembers: TeamMember[] = body.members
        .map((m: any, idx: number) => ({
          id: m.id || `member-${Date.now()}-${idx}`,
          name: (m.name || `Member ${idx + 1}`).trim(),
          role: (m.role || 'Social Media Specialist').trim(),
          dailyTarget: Number(m.dailyTarget) > 0 ? Number(m.dailyTarget) : 10,
          phone: (m.phone || '').trim(),
          notes: (m.notes || '').trim()
        }))
        .filter((m: TeamMember) => m.name.length > 0);

      const saved = saveTeamMembers(validMembers);
      // Sync to Google Sheet tab "Team Members" in background
      await syncMembersToGoogleSheet(saved);

      return NextResponse.json({
        success: true,
        message: 'Team members updated and synced with Google Sheet',
        members: saved,
        syncedToGoogleSheet: true
      });
    }

    // 2. Action based updates: add, update, delete
    const { action, member, id } = body;
    let currentMembers = getTeamMembers();

    if (action === 'add' && member) {
      const newMember: TeamMember = {
        id: member.id || `member-${Date.now()}`,
        name: (member.name || `Member ${currentMembers.length + 1}`).trim(),
        role: (member.role || 'Social Media Specialist').trim(),
        dailyTarget: Number(member.dailyTarget) > 0 ? Number(member.dailyTarget) : 10,
        phone: (member.phone || '').trim(),
        notes: (member.notes || '').trim()
      };
      currentMembers.push(newMember);
      saveTeamMembers(currentMembers);
      await syncMembersToGoogleSheet(currentMembers);

      return NextResponse.json({
        success: true,
        message: `Added team member "${newMember.name}" and synced to Google Sheet`,
        members: currentMembers
      });
    }

    if (action === 'update' && member && member.id) {
      currentMembers = currentMembers.map(m => {
        if (m.id === member.id) {
          return {
            ...m,
            name: (member.name || m.name).trim(),
            role: (member.role !== undefined ? member.role : m.role).trim(),
            dailyTarget: Number(member.dailyTarget) > 0 ? Number(member.dailyTarget) : m.dailyTarget,
            phone: (member.phone !== undefined ? member.phone : m.phone).trim(),
            notes: (member.notes !== undefined ? member.notes : m.notes).trim()
          };
        }
        return m;
      });
      saveTeamMembers(currentMembers);
      await syncMembersToGoogleSheet(currentMembers);

      return NextResponse.json({
        success: true,
        message: `Updated team member "${member.name}" and synced to Google Sheet`,
        members: currentMembers
      });
    }

    if (action === 'delete' && id) {
      if (currentMembers.length <= 1) {
        return NextResponse.json(
          { success: false, error: 'Cannot delete the only remaining team member' },
          { status: 400 }
        );
      }
      currentMembers = currentMembers.filter(m => m.id !== id);
      saveTeamMembers(currentMembers);
      await syncMembersToGoogleSheet(currentMembers);

      return NextResponse.json({
        success: true,
        message: 'Team member deleted and synced to Google Sheet',
        members: currentMembers
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid payload format' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error updating team members:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update team members' },
      { status: 500 }
    );
  }
}
