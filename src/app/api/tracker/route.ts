import { NextRequest, NextResponse } from 'next/server';
import { getGoogleSheetsClient } from '@/google-sheets';
import { getTeamMembers } from '@/storage';
import { normalizeVideoUrl } from '@/lib/video-url';
import { readTrackerSheet, insertTrackerRecord, updateTrackerAnalysis } from '@/tracker-sheet';
import { trackerAnalysisColumns } from '@/tracker-analysis';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '0AIG06pZpg4KBUk9PVA';
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID || '14nj56PxfqLHcv8xTB03_RKSfyDD2s-C9Psk3LMnWGdU';
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit`;
const FOLDER_URL = `https://drive.google.com/drive/folders/${FOLDER_ID}`;

function getISTTimestamp(): { formattedDate: string; rawTimestamp: string } {
  const now = new Date();
  // Format in IST (UTC+5:30)
  const istDateString = now.toLocaleDateString('en-GB', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }); // "DD/MM/YYYY"

  const istTimeString = now.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }); // "HH:MM AM/PM"

  return {
    formattedDate: istDateString,
    rawTimestamp: `${istDateString}, ${istTimeString}`
  };
}

export async function GET() {
  try {
    const sheets = getGoogleSheetsClient();
    if (!sheets) {
      return NextResponse.json({
        success: false,
        error: 'Google Sheets credentials are not configured on this server.',
        todayCount: 0,
        quotaTarget: 10,
        totalTeamTodayCount: 0,
        totalTeamQuotaTarget: 30,
        memberCounts: {},
        existingRecords: [],
        sheetUrl: SHEET_URL,
        folderUrl: FOLDER_URL,
        teamMembers: await getTeamMembers(),
        warning: 'Tracker data is unavailable until Google Sheets credentials are configured.'
      }, { status: 503 });
    }

    // Fetch existing rows from 'Outliers Tracker'!A:R
    const { rows } = await readTrackerSheet(sheets, SPREADSHEET_ID);
    const todayIST = getISTTimestamp().formattedDate;

    let todayCount = 0;
    const memberCounts: Record<string, number> = {};
    const existingRecords: Array<{
      normalizedUrl: string;
      rawUrl: string;
      submittedBy: string;
      timestamp: string;
      brand?: string;
      platform?: string;
      videoTitle: string;
      creator?: string;
      followers?: string;
      views?: string;
      reachRatio?: string;
      outlierMultiplier?: string;
      tier?: string;
      visualHook?: string;
      audioStrategy?: string;
      secretFormula?: string;
      status: string;
      feedback?: string;
      rowNumber: number;
    }> = [];

    rows.forEach((row, idx) => {
      const timestamp = row[0] || '';
      const submittedBy = (row[1] || 'Unknown').trim();
      const brand = row[2] || '';
      const platform = row[3] || '';
      const videoTitle = row[4] || '';
      const rawUrl = (row[5] || '').trim();
      const creator = row[6] || '';
      const followers = row[7] || '';
      const views = row[8] || '';
      const reachRatio = row[9] || '';
      const outlierMultiplier = row[10] || '';
      const tier = row[11] || '';
      const visualHook = row[12] || '';
      const audioStrategy = row[13] || '';
      const secretFormula = row[14] || '';
      const status = row[15] || 'Pending Review';
      const feedback = row[16] || '';

      if (rawUrl) {
        const normalized = normalizeVideoUrl(rawUrl);
        existingRecords.push({
          normalizedUrl: normalized,
          rawUrl,
          submittedBy,
          timestamp,
          brand,
          platform,
          videoTitle,
          creator,
          followers,
          views,
          reachRatio,
          outlierMultiplier,
          tier,
          visualHook,
          audioStrategy,
          secretFormula,
          status,
          feedback,
          rowNumber: idx + 2
        });
      }

      // Check if submitted today (matches DD/MM/YYYY prefix)
      if (timestamp.startsWith(todayIST)) {
        todayCount++;
        memberCounts[submittedBy] = (memberCounts[submittedBy] || 0) + 1;
      }
    });

    return NextResponse.json({
      success: true,
      sheetUrl: SHEET_URL,
      folderUrl: FOLDER_URL,
      spreadsheetId: SPREADSHEET_ID,
      totalLogged: existingRecords.length,
      todayCount,
      todayIST,
      memberCounts,
      teamMembers: await getTeamMembers(),
      existingCount: existingRecords.length,
      existingUrls: existingRecords.map(r => r.normalizedUrl),
      existingRecords
    });
  } catch (error: any) {
    console.error('Error fetching tracker data:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch tracker data',
        message: error.message || 'Failed to fetch tracker data',
        sheetUrl: SHEET_URL,
        folderUrl: FOLDER_URL
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      submittedBy = 'Social Media Team',
      brand = 'AHL',
      platform = 'YouTube',
      videoTitle = '',
      videoUrl = '',
      creator = '',
      followers = 0,
      views = 0,
      reachRatio = 0,
      outlierMultiplier = 0,
      outlierTier = 'Notable Outlier',
      visualHook = '',
      audioStrategy = '',
      secretFormula = '',
      analysis
    } = body;

    if (typeof videoUrl !== 'string' || !videoUrl.trim()) {
      return NextResponse.json(
        { success: false, error: 'Video URL is required', message: 'Video URL is required' },
        { status: 400 }
      );
    }

    const sheets = getGoogleSheetsClient();
    if (!sheets) {
      return NextResponse.json(
        {
          success: false,
          error: 'Google Sheets credentials not configured. Please add GOOGLE_SERVICE_ACCOUNT_JSON to Vercel/Environment variables.',
          message: 'Google Sheets credentials not configured. Please add GOOGLE_SERVICE_ACCOUNT_JSON to Vercel/Environment variables.'
        },
        { status: 500 }
      );
    }
    const incomingNormalized = normalizeVideoUrl(videoUrl);
    const analysisColumns = trackerAnalysisColumns(videoUrl, analysis);

    // 1. Check for duplicates in existing rows
    const snapshot = await readTrackerSheet(sheets, SPREADSHEET_ID);
    const rows = snapshot.rows;
    const todayIST = getISTTimestamp().formattedDate;

    // Search for existing duplicate
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const existingUrl = (row[5] || '').trim();
      if (existingUrl) {
        const existingNormalized = normalizeVideoUrl(existingUrl);
        if (existingNormalized === incomingNormalized) {
          const rowNumber = i + 2;
          if (analysisColumns) {
            const updated = await updateTrackerAnalysis(sheets, SPREADSHEET_ID, snapshot.sheetId, rowNumber,
              videoUrl, snapshot.hasFindingsColumn ? analysisColumns : [analysisColumns[0], analysisColumns[1], analysisColumns[2]], getISTTimestamp().rawTimestamp);
            return NextResponse.json({
              success: true,
              rowNumber,
              sheetUrl: SHEET_URL,
              message: updated ? `Updated video analysis in Outliers Tracker row ${rowNumber}.`
                : `Video analysis is already saved in Outliers Tracker row ${rowNumber}.`
            });
          }
          const prevMember = row[1] || 'A team member';
          const prevDate = row[0] || 'Previously';
          const prevStatus = row[15] || 'Pending Review';
          const prevTitle = row[4] || videoTitle;

          return NextResponse.json({
            success: false,
            duplicate: true,
            message: `DUPLICATE DETECTED: This video is already logged in the sheet by "${prevMember}" on ${prevDate}! Status: [${prevStatus}]. Duplicates are strictly blocked.`,
            existingRecord: {
              submittedBy: prevMember,
              timestamp: prevDate,
              status: prevStatus,
              videoTitle: prevTitle,
              rowNumber: i + 2
            },
            sheetUrl: SHEET_URL
          });
        }
      }
    }

    // 2. Count today's submissions for this team member
    let memberTodayCount = 0;
    rows.forEach(row => {
      const timestamp = row[0] || '';
      const member = (row[1] || '').trim();
      if (timestamp.startsWith(todayIST) && member.toLowerCase() === submittedBy.trim().toLowerCase()) {
        memberTodayCount++;
      }
    });

    // 3. Format timestamp and new row values
    const { formattedDate, rawTimestamp } = getISTTimestamp();

    const formatNumber = (num: number) => {
      if (num >= 10000000) return `${(num / 10000000).toFixed(1)} Cr`;
      if (num >= 100000) return `${(num / 100000).toFixed(1)} L`;
      if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
      return num.toLocaleString();
    };

    const newRow = [
      rawTimestamp,                                              // A: Timestamp (IST)
      submittedBy.trim(),                                        // B: Submitted By
      brand,                                                     // C: Brand Focus
      platform,                                                  // D: Platform
      videoTitle,                                                // E: Video Title
      videoUrl.trim(),                                           // F: Video URL
      creator,                                                   // G: Creator Handle
      typeof followers === 'number' ? formatNumber(followers) : followers, // H: Followers
      typeof views === 'number' ? formatNumber(views) : views,             // I: Views
      typeof reachRatio === 'number' ? `${reachRatio.toFixed(1)}x` : reachRatio, // J: Reach Ratio
      typeof outlierMultiplier === 'number' ? `${outlierMultiplier.toFixed(1)}x` : outlierMultiplier, // K: Multiplier
      outlierTier,                                               // L: Outlier Tier
      analysisColumns?.[0] || visualHook || 'Not analyzed',      // M: Visual Hook
      analysisColumns?.[1] || audioStrategy || 'Not analyzed',   // N: Audio Strategy
      analysisColumns?.[2] || secretFormula || 'Not analyzed',    // O: Secret Formula
      'Pending Review',                                          // P: Sir's Approval Status
      '',                                                        // Q: Sir's Reason / Feedback
      rawTimestamp                                               // R: Last Updated
    ];

    // 4. Append to 'Outliers Tracker'
    const saved = await insertTrackerRecord(sheets, SPREADSHEET_ID, snapshot, newRow.map(value => String(value ?? '')), analysisColumns?.[3]);

    const updatedMemberCount = memberTodayCount + 1;
    const activeTeam = await getTeamMembers();
    const matchedMember = activeTeam.find(m => m.name.toLowerCase() === submittedBy.trim().toLowerCase());
    const memberDailyTarget = matchedMember?.dailyTarget || 10;
    const remainingQuota = Math.max(0, memberDailyTarget - updatedMemberCount);

    return NextResponse.json({
      success: true,
      duplicate: false,
      message: `Saved ${analysisColumns ? 'video analysis and metrics' : 'video details'} to Outliers Tracker row ${saved.rowNumber}. (${updatedMemberCount}/${memberDailyTarget} today by ${submittedBy.trim()})`,
      sheetUrl: SHEET_URL,
      memberTodayCount: updatedMemberCount,
      quotaTarget: memberDailyTarget,
      quotaRemaining: remainingQuota,
      rowAppended: saved.range,
      rowNumber: saved.rowNumber
    });
  } catch (error: any) {
    console.error('Error saving to tracker sheet:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to save to Google Sheet',
        sheetUrl: SHEET_URL
      },
      { status: 500 }
    );
  }
}
