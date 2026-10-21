import { google } from 'googleapis';
import path from 'path';

async function clearTestRow() {
  const auth = new google.auth.GoogleAuth({
    keyFile: path.resolve(process.cwd(), 'service account.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = '14nj56PxfqLHcv8xTB03_RKSfyDD2s-C9Psk3LMnWGdU';
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: 'Sheet1!A2:R10'
  });
  console.log('Cleared test rows! Sheet is clean and ready.');
}

clearTestRow();
