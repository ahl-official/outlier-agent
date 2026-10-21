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

  const t1 = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "'Outliers Tracker'!A1:F5"
  });
  console.log('--- Outliers Tracker (A1:F5) ---');
  console.log(t1.data.values);

  const t2 = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "'Team Members'!A1:F5"
  });
  console.log('--- Team Members (A1:F5) ---');
  console.log(t2.data.values);
}

main().catch(err => console.error('Error:', err.message));
