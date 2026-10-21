const { google } = require('googleapis');
const path = require('path');

async function main() {
  const serviceAccountPath = path.resolve(__dirname, '..', 'service account.json');
  const auth = new google.auth.GoogleAuth({
    keyFile: serviceAccountPath,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = '14nj56PxfqLHcv8xTB03_RKSfyDD2s-C9Psk3LMnWGdU';

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          updateSheetProperties: {
            properties: {
              sheetId: 0,
              title: 'Outliers Tracker',
              tabColor: { red: 0.11, green: 0.31, blue: 0.85 } // Vibrant Blue
            },
            fields: 'title,tabColor'
          }
        },
        {
          updateSheetProperties: {
            properties: {
              sheetId: 123456,
              title: 'Team Members',
              tabColor: { red: 0.05, green: 0.65, blue: 0.38 } // Vibrant Emerald Green
            },
            fields: 'title,tabColor'
          }
        }
      ]
    }
  });

  console.log('Successfully set vibrant tab colors for both tabs!');
}

main().catch(err => console.error('Error:', err.message));
