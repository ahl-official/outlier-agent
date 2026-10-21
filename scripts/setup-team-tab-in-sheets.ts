import { google } from 'googleapis';
import path from 'path';

async function setupTeamTab() {
  const auth = new google.auth.GoogleAuth({
    keyFile: path.resolve(process.cwd(), 'service account.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = '14nj56PxfqLHcv8xTB03_RKSfyDD2s-C9Psk3LMnWGdU';

  // 1. Get current sheets
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const existingSheets = meta.data.sheets || [];
  const titles = existingSheets.map(s => s.properties?.title);
  console.log('Current sheet tabs:', titles);

  const requests: any[] = [];

  // Rename Sheet1 to "Outliers Tracker" if still named Sheet1
  const sheet1 = existingSheets.find(s => s.properties?.title === 'Sheet1');
  if (sheet1 && sheet1.properties?.sheetId !== undefined) {
    requests.push({
      updateSheetProperties: {
        properties: {
          sheetId: sheet1.properties.sheetId,
          title: 'Outliers Tracker'
        },
        fields: 'title'
      }
    });
  }

  // Check if "Team Members" exists
  let teamSheet = existingSheets.find(s => s.properties?.title === 'Team Members');
  let teamSheetId = teamSheet?.properties?.sheetId;

  if (!teamSheet) {
    console.log('Adding new tab "Team Members"...');
    teamSheetId = 123456;
    requests.push({
      addSheet: {
        properties: {
          sheetId: teamSheetId,
          title: 'Team Members',
          gridProperties: {
            frozenRowCount: 1
          }
        }
      }
    });
  }

  if (requests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests }
    });
    console.log('Sheet tabs updated successfully!');
  }

  // 2. Insert headers & initial team rows in "Team Members" tab
  const headers = [
    'Member ID',
    'Member Name',
    'Role / Specialization',
    'Daily Quota Target',
    'Focus Area / Notes',
    'Status'
  ];

  const initialRows = [
    ['member-1', 'Member 1 (Aman)', 'Social Media Specialist', 10, 'YouTube Shorts & Outliers', 'Active'],
    ['member-2', 'Member 2 (Rahul)', 'Content Strategist', 10, 'Viral Transformation Hooks', 'Active'],
    ['member-3', 'Member 3 (Priya)', 'Reels & Creative Researcher', 10, 'AHL & Alchemane Outliers', 'Active']
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "'Team Members'!A1:F4",
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [headers, ...initialRows]
    }
  });

  // 3. Format header styling & column widths in "Team Members" tab
  // Re-fetch meta to get accurate teamSheetId if generated
  const updatedMeta = await sheets.spreadsheets.get({ spreadsheetId });
  const finalTeamSheet = updatedMeta.data.sheets?.find(s => s.properties?.title === 'Team Members');
  const targetSheetId = finalTeamSheet?.properties?.sheetId ?? teamSheetId ?? 0;

  const formatRequests: any[] = [
    // Header styling
    {
      repeatCell: {
        range: {
          sheetId: targetSheetId,
          startRowIndex: 0,
          endRowIndex: 1
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.08, green: 0.15, blue: 0.28 },
            textFormat: {
              foregroundColor: { red: 1, green: 1, blue: 1 },
              bold: true,
              fontSize: 10
            },
            horizontalAlignment: 'CENTER'
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
      }
    },
    // Freeze top row
    {
      updateSheetProperties: {
        properties: {
          sheetId: targetSheetId,
          gridProperties: {
            frozenRowCount: 1
          }
        },
        fields: 'gridProperties.frozenRowCount'
      }
    },
    // Column widths
    {
      updateDimensionProperties: {
        range: { sheetId: targetSheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: 1 },
        properties: { pixelSize: 120 },
        fields: 'pixelSize'
      }
    },
    {
      updateDimensionProperties: {
        range: { sheetId: targetSheetId, dimension: 'COLUMNS', startIndex: 1, endIndex: 2 },
        properties: { pixelSize: 220 },
        fields: 'pixelSize'
      }
    },
    {
      updateDimensionProperties: {
        range: { sheetId: targetSheetId, dimension: 'COLUMNS', startIndex: 2, endIndex: 3 },
        properties: { pixelSize: 240 },
        fields: 'pixelSize'
      }
    },
    {
      updateDimensionProperties: {
        range: { sheetId: targetSheetId, dimension: 'COLUMNS', startIndex: 3, endIndex: 4 },
        properties: { pixelSize: 150 },
        fields: 'pixelSize'
      }
    },
    {
      updateDimensionProperties: {
        range: { sheetId: targetSheetId, dimension: 'COLUMNS', startIndex: 4, endIndex: 5 },
        properties: { pixelSize: 260 },
        fields: 'pixelSize'
      }
    },
    {
      updateDimensionProperties: {
        range: { sheetId: targetSheetId, dimension: 'COLUMNS', startIndex: 5, endIndex: 6 },
        properties: { pixelSize: 120 },
        fields: 'pixelSize'
      }
    },
    // Dropdown for Status column (Active / Inactive)
    {
      setDataValidation: {
        range: {
          sheetId: targetSheetId,
          startRowIndex: 1,
          endRowIndex: 100,
          startColumnIndex: 5,
          endColumnIndex: 6
        },
        rule: {
          condition: {
            type: 'ONE_OF_LIST',
            values: [{ userEnteredValue: 'Active' }, { userEnteredValue: 'Inactive' }]
          },
          showCustomUi: true,
          strict: false
        }
      }
    }
  ];

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests: formatRequests }
  });

  console.log('Team Members tab created and styled successfully in Google Sheets!');
}

setupTeamTab();
