import { google } from 'googleapis';
import path from 'path';
import fs from 'fs';

async function testGoogleConnection() {
  const serviceAccountPath = path.resolve(process.cwd(), 'service account.json');
  if (!fs.existsSync(serviceAccountPath)) {
    console.error('service account.json not found at:', serviceAccountPath);
    return;
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: serviceAccountPath,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive'
    ]
  });

  const drive = google.drive({ version: 'v3', auth });
  const sheets = google.sheets({ version: 'v4', auth });

  const folderId = '0AIG06pZpg4KBUk9PVA';
  console.log('Testing access to Drive folder:', folderId);

  try {
    const folderRes = await drive.files.get({
      fileId: folderId,
      fields: 'id, name, mimeType, capabilities',
      supportsAllDrives: true
    });
    console.log('Successfully accessed Drive folder:', folderRes.data.name);

    // List existing files in folder
    const listRes = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType, webViewLink)',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true
    });

    console.log('Files currently in folder:', listRes.data.files);

    let sheetFile = listRes.data.files?.find(f => f.mimeType === 'application/vnd.google-apps.spreadsheet');

    if (!sheetFile) {
      console.log('No spreadsheet found. Creating "AHL Outliers Daily Tracker - Social Media Team"...');
      const createRes = await drive.files.create({
        requestBody: {
          name: 'AHL Outliers Daily Tracker - Social Media Team',
          mimeType: 'application/vnd.google-apps.spreadsheet',
          parents: [folderId]
        },
        supportsAllDrives: true,
        fields: 'id, name, webViewLink'
      });
      sheetFile = createRes.data;
      console.log('Created new Google Sheet:', sheetFile);

      // Initialize Header Row with formatting
      const headers = [
        'Timestamp (IST)',
        'Submitted By (Team Member)',
        'Brand Focus',
        'Platform',
        'Video Title',
        'Video URL',
        'Creator Handle',
        'Follower Count',
        'Total Views',
        'Follower Reach Ratio',
        'Outlier Multiplier',
        'Outlier Tier',
        'Visual Hook / Scroll Stopper',
        'Audio Track & Strategy',
        'Why Outlier / Secret Formula',
        "Sir's Approval Status",
        "Sir's Reason / Feedback",
        'Last Updated'
      ];

      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetFile.id!,
        range: 'Sheet1!A1:R1',
        valueInputOption: 'RAW',
        requestBody: {
          values: [headers]
        }
      });

      // Format header row (bold, background color, frozen row)
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetFile.id!,
        requestBody: {
          requests: [
            {
              updateSheetProperties: {
                properties: {
                  sheetId: 0,
                  gridProperties: {
                    frozenRowCount: 1
                  }
                },
                fields: 'gridProperties.frozenRowCount'
              }
            },
            {
              repeatCell: {
                range: {
                  sheetId: 0,
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
            }
          ]
        }
      });
      console.log('Sheet initialized with headers, styling, and frozen row!');
    } else {
      console.log('Found existing spreadsheet:', sheetFile.name, 'ID:', sheetFile.id, 'Link:', sheetFile.webViewLink);
    }
  } catch (err: any) {
    console.error('Error:', err.message);
  }
}

testGoogleConnection();

