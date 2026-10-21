import { NextRequest, NextResponse } from 'next/server';
import { getGoogleSheetsClient } from '@/google-sheets';
import { getTeamMembers } from '@/storage';

const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '0AIG06pZpg4KBUk9PVA';
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID || '14nj56PxfqLHcv8xTB03_RKSfyDD2s-C9Psk3LMnWGdU';
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit`;
const FOLDER_URL = `https://drive.google.com/drive/folders/${FOLDER_ID}`;

function normalizeVideoUrl(url: string): string {
  if (!url) return '';
  try {
    const raw = url.trim();
    const parsed = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
    
    // YouTube variations: watch?v=, youtu.be/, /shorts/
    if (parsed.hostname.includes('youtube.com') || parsed.hostname.includes('youtu.be')) {
      if (parsed.hostname.includes('youtu.be')) {
        const videoId = parsed.pathname.replace(/^\//, '').split('/')[0]?.split('?')[0];
        if (videoId) return `yt:${videoId}`;
      }
      if (parsed.pathname.includes('/shorts/')) {
        const shortId = parsed.pathname.split('/shorts/')[1]?.split('/')[0]?.split('?')[0];
        if (shortId) return `yt:${shortId}`;
      }
      const v = parsed.searchParams.get('v');
      if (v) return `yt:${v}`;
    }

    // Instagram variations: /reel/CODE/, /p/CODE/
    if (parsed.hostname.includes('instagram.com')) {
      const match = parsed.pathname.match(/\/(reel|p)\/([A-Za-z0-9_-]+)/);
      if (match && match[2]) {
        return `ig:${match[2]}`;
      }
    }

    return (parsed.origin + parsed.pathname).replace(/\/$/, '').toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

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
        success: true,
        todayCount: 0,
        quotaTarget: 10,
        totalTeamTodayCount: 0,
        totalTeamQuotaTarget: 30,
        memberCounts: {},
        existingRecords: [],
        sheetUrl: SHEET_URL,
        folderUrl: FOLDER_URL,
        teamMembers: getTeamMembers(),
        warning: 'Google Sheets credentials not found. Tracker is running in local-only fallback mode.'
      });
    }

    // Fetch existing rows from 'Outliers Tracker'!A:R
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "'Outliers Tracker'!A2:R1000"
    });

    const rows = response.data.values || [];
    const todayIST = getISTTimestamp().formattedDate;

    let todayCount = 0;
    const memberCounts: Record<string, number> = {};
    const existingRecords: Array<{
      normalizedUrl: string;
      rawUrl: string;
      submittedBy: string;
      timestamp: string;
      status: string;
      videoTitle: string;
    }> = [];

    rows.forEach(row => {
      const timestamp = row[0] || '';
      const submittedBy = (row[1] || 'Unknown').trim();
      const videoTitle = row[4] || '';
      const rawUrl = (row[5] || '').trim();
      const status = row[15] || 'Pending Review';

      if (rawUrl) {
        const normalized = normalizeVideoUrl(rawUrl);
        existingRecords.push({
          normalizedUrl: normalized,
          rawUrl,
          submittedBy,
          timestamp,
          status,
          videoTitle
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
      totalLogged: rows.length,
      todayCount,
      todayIST,
      memberCounts,
      teamMembers: getTeamMembers(),
      existingCount: existingRecords.length,
      existingUrls: existingRecords.map(r => r.normalizedUrl)
    });
  } catch (error: any) {
    console.error('Error fetching tracker data:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch tracker data',
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
      secretFormula = ''
    } = body;

    if (!videoUrl) {
      return NextResponse.json(
        { success: false, message: 'Video URL is required' },
        { status: 400 }
      );
    }

    const sheets = getGoogleSheetsClient();
    if (!sheets) {
      return NextResponse.json(
        { success: false, message: 'Google Sheets credentials not configured. Please add Google Service Account credentials to environment variables.' },
        { status: 500 }
      );
    }
    const incomingNormalized = normalizeVideoUrl(videoUrl);

    // 1. Check for duplicates in existing rows
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "'Outliers Tracker'!A2:R1000"
    });

    const rows = response.data.values || [];
    const todayIST = getISTTimestamp().formattedDate;

    // Search for existing duplicate
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const existingUrl = (row[5] || '').trim();
      if (existingUrl) {
        const existingNormalized = normalizeVideoUrl(existingUrl);
        if (existingNormalized === incomingNormalized) {
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
      visualHook || 'High-contrast visual hook with immediate payoff', // M: Visual Hook
      audioStrategy || 'Original speech / high-engagement dialogue',    // N: Audio Strategy
      secretFormula || 'Direct relatable problem-solution format',      // O: Secret Formula
      'Pending Review',                                          // P: Sir's Approval Status
      '',                                                        // Q: Sir's Reason / Feedback
      rawTimestamp                                               // R: Last Updated
    ];

    // 4. Append to 'Outliers Tracker'
    const appendRes = await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: "'Outliers Tracker'!A:R",
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [newRow]
      }
    });

    const updatedMemberCount = memberTodayCount + 1;
    const activeTeam = getTeamMembers();
    const matchedMember = activeTeam.find(m => m.name.toLowerCase() === submittedBy.trim().toLowerCase());
    const memberDailyTarget = matchedMember?.dailyTarget || 10;
    const remainingQuota = Math.max(0, memberDailyTarget - updatedMemberCount);

    return NextResponse.json({
      success: true,
      duplicate: false,
      message: `Successfully logged to Google Sheet! (${updatedMemberCount}/${memberDailyTarget} completed for today by ${submittedBy.trim()})`,
      sheetUrl: SHEET_URL,
      memberTodayCount: updatedMemberCount,
      quotaTarget: memberDailyTarget,
      quotaRemaining: remainingQuota,
      rowAppended: appendRes.data.updates?.updatedRange
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
