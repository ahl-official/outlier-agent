import dotenv from 'dotenv';
dotenv.config();
import { getGoogleSheetsClient } from '../src/google-sheets';
import { TRACKER_TAB, planSimpleTrackerStyle } from '../src/tracker-sheet';

async function main() {
  const sheets = getGoogleSheetsClient();
  if (!sheets) throw new Error('Google Sheets credentials are not configured.');
  const spreadsheetId = process.env.GOOGLE_SHEET_ID || '14nj56PxfqLHcv8xTB03_RKSfyDD2s-C9Psk3LMnWGdU';
  const metadata = await sheets.spreadsheets.get({ spreadsheetId });
  const tracker = metadata.data.sheets?.find(sheet => sheet.properties?.title === TRACKER_TAB);
  if (!tracker) throw new Error(`No ${TRACKER_TAB} tab found; no sheet was changed.`);
  await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: planSimpleTrackerStyle(tracker) } });
  console.log('Outliers Tracker simplified: yellow header, plain body rows, no fill rules. Existing values, validations and column widths were preserved.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
