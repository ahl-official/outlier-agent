const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

async function main() {
  const serviceAccountPath = path.resolve(__dirname, '..', 'service account.json');
  const auth = new google.auth.GoogleAuth({
    keyFile: serviceAccountPath,
    scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive']
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = '14nj56PxfqLHcv8xTB03_RKSfyDD2s-C9Psk3LMnWGdU';

  const res = await sheets.spreadsheets.get({ spreadsheetId });
  console.log('Spreadsheet Title:', res.data.properties.title);
  console.log('Tabs in Spreadsheet:');
  for (const sheet of res.data.sheets || []) {
    console.log(` - ID: ${sheet.properties.sheetId}, Title: "${sheet.properties.title}", hidden: ${sheet.properties.hidden || false}`);
  }
}

main().catch(err => console.error('Error:', err.message));
