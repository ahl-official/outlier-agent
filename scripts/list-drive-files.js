const { google } = require('googleapis');
const path = require('path');

async function main() {
  const serviceAccountPath = path.resolve(__dirname, '..', 'service account.json');
  const auth = new google.auth.GoogleAuth({
    keyFile: serviceAccountPath,
    scopes: ['https://www.googleapis.com/auth/drive']
  });

  const drive = google.drive({ version: 'v3', auth });
  const folderId = '0AIG06pZpg4KBUk9PVA';

  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: 'files(id, name, mimeType, webViewLink, createdTime, modifiedTime)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true
  });

  console.log('Files in Drive folder:');
  for (const f of res.data.files || []) {
    console.log(`- Name: "${f.name}", ID: ${f.id}, Link: ${f.webViewLink}, Modified: ${f.modifiedTime}`);
  }
}

main().catch(err => console.error('Error:', err.message));
