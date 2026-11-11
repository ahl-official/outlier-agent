import type { sheets_v4 } from 'googleapis';
import { normalizeVideoUrl } from './lib/video-url';

export const TRACKER_TAB = 'Outliers Tracker';
export const TRACKER_COLUMNS = 18;

export interface TrackerSnapshot {
  sheetId: number;
  rowCount: number;
  columnCount: number;
  rows: string[][];
}

export function trackerRange(cells: string): string {
  return `'${TRACKER_TAB}'!${cells}`;
}

export async function updateTrackerAnalysis(sheets: sheets_v4.Sheets, spreadsheetId: string, sheetId: number,
  rowNumber: number, videoUrl: string, analysis: [string, string, string], timestamp: string) {
  const range = trackerRange(`F${rowNumber}:R${rowNumber}`);
  const current = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  const row = current.data.values?.[0];
  if (normalizeVideoUrl(String(row?.[0] || '')) !== normalizeVideoUrl(videoUrl)) {
    throw new Error('The tracker row moved. Refresh and save again.');
  }
  if (analysis.every((value, index) => row?.[7 + index] === value)) return false;

  const update = (columnIndex: number, values: string[]): sheets_v4.Schema$Request => ({
    updateCells: {
      start: { sheetId, rowIndex: rowNumber - 1, columnIndex },
      rows: [{ values: values.map(value => ({ userEnteredValue: { stringValue: value } })) }],
      fields: 'userEnteredValue'
    }
  });
  const result = await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: {
    requests: [update(12, analysis), update(17, [timestamp])],
    includeSpreadsheetInResponse: true,
    responseRanges: [range],
    responseIncludeGridData: true
  } });
  const saved = result.data.updatedSpreadsheet?.sheets?.find(sheet => sheet.properties?.sheetId === sheetId)
    ?.data?.[0]?.rowData?.[0]?.values;
  if (!saved || saved[0]?.userEnteredValue?.stringValue !== row?.[0] ||
      !analysis.every((value, index) => saved[7 + index]?.userEnteredValue?.stringValue === value)) {
    throw new Error('The analysis update could not be confirmed. Refresh the tracker before retrying.');
  }
  return true;
}

/** Resolve the actual tab and read its finite grid, including records beyond row 1000. */
export async function readTrackerSheet(sheets: sheets_v4.Sheets, spreadsheetId: string): Promise<TrackerSnapshot> {
  const metadata = await sheets.spreadsheets.get({ spreadsheetId, fields: 'sheets(properties)' });
  const tab = metadata.data.sheets?.find(sheet => sheet.properties?.title === TRACKER_TAB)?.properties;
  if (tab?.sheetId == null) throw new Error(`The connected spreadsheet has no "${TRACKER_TAB}" tab.`);
  const rowCount = tab.gridProperties?.rowCount || 1;
  const columnCount = tab.gridProperties?.columnCount || 0;
  if (columnCount < TRACKER_COLUMNS) throw new Error(`"${TRACKER_TAB}" needs columns A:R for tracker submissions.`);
  const response = await sheets.spreadsheets.values.get({ spreadsheetId, range: trackerRange(`A1:R${rowCount}`), valueRenderOption: 'FORMATTED_VALUE' });
  const values = response.data.values || [];
  if (String(values[0]?.[5] || '').trim().toLowerCase() !== 'video url') {
    throw new Error(`"${TRACKER_TAB}" column F must have the "Video URL" header. No data was written.`);
  }
  return { sheetId: tab.sheetId, rowCount, columnCount, rows: values.slice(1).map(row => row.map(value => String(value ?? ''))) };
}

/** Insert next to the actual records, without overwriting stray notes/timestamps below them. */
export function planTrackerInsert(snapshot: TrackerSnapshot, values: string[]) {
  if (values.length !== TRACKER_COLUMNS) throw new Error('A tracker submission must contain exactly 18 columns.');
  let lastRecordRow = 1;
  snapshot.rows.forEach((row, index) => { if (row[5]?.trim()) lastRecordRow = index + 2; });
  const rowIndex = lastRecordRow;
  const requests: sheets_v4.Schema$Request[] = [
    rowIndex >= snapshot.rowCount
      ? { appendDimension: { sheetId: snapshot.sheetId, dimension: 'ROWS', length: 1 } }
      : { insertDimension: { range: { sheetId: snapshot.sheetId, dimension: 'ROWS', startIndex: rowIndex, endIndex: rowIndex + 1 }, inheritFromBefore: rowIndex > 1 } },
    { updateCells: { start: { sheetId: snapshot.sheetId, rowIndex, columnIndex: 0 }, rows: [{ values: values.map(value => ({ userEnteredValue: { stringValue: value } })) }], fields: 'userEnteredValue' } },
    { repeatCell: {
      range: { sheetId: snapshot.sheetId, startRowIndex: rowIndex, endRowIndex: rowIndex + 1, startColumnIndex: 0, endColumnIndex: snapshot.columnCount },
      cell: { userEnteredFormat: { textFormat: { bold: false, foregroundColorStyle: { rgbColor: {} } } } },
      fields: 'userEnteredFormat.backgroundColor,userEnteredFormat.backgroundColorStyle,userEnteredFormat.textFormat.bold,userEnteredFormat.textFormat.foregroundColor,userEnteredFormat.textFormat.foregroundColorStyle'
    } }
  ];
  return { requests, rowNumber: rowIndex + 1, range: trackerRange(`A${rowIndex + 1}:R${rowIndex + 1}`) };
}

/** Atomic row insertion + value write + plain styling; verify the saved URL before success. */
export async function insertTrackerRecord(sheets: sheets_v4.Sheets, spreadsheetId: string, snapshot: TrackerSnapshot, values: string[]) {
  const plan = planTrackerInsert(snapshot, values);
  const result = await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests: plan.requests, includeSpreadsheetInResponse: true, responseRanges: [plan.range], responseIncludeGridData: true }
  });
  const saved = result.data.updatedSpreadsheet?.sheets?.find(sheet => sheet.properties?.sheetId === snapshot.sheetId)?.data?.[0]?.rowData?.[0]?.values;
  if (!saved || [5, 12, 13, 14].some(index =>
    (saved[index]?.userEnteredValue?.stringValue ?? '') !== values[index])) {
    throw new Error('The tracker write could not be confirmed. Refresh the tracker before retrying to avoid duplicates.');
  }
  return plan;
}

/** Only the header is yellow; remove fill rules/banding so future body rows stay plain. */
export function planSimpleTrackerStyle(sheet: sheets_v4.Schema$Sheet): sheets_v4.Schema$Request[] {
  const id = sheet.properties?.sheetId;
  const grid = sheet.properties?.gridProperties;
  if (id == null || !grid?.rowCount || !grid.columnCount) throw new Error('Tracker metadata is incomplete.');
  const requests: sheets_v4.Schema$Request[] = [];
  for (let index = (sheet.conditionalFormats?.length || 0) - 1; index >= 0; index--) requests.push({ deleteConditionalFormatRule: { sheetId: id, index } });
  for (const band of sheet.bandedRanges || []) if (band.bandedRangeId != null) requests.push({ deleteBanding: { bandedRangeId: band.bandedRangeId } });
  requests.push(
    { repeatCell: { range: { sheetId: id, startRowIndex: 1, endRowIndex: grid.rowCount, startColumnIndex: 0, endColumnIndex: grid.columnCount }, cell: { userEnteredFormat: { textFormat: { foregroundColorStyle: { rgbColor: {} } } } }, fields: 'userEnteredFormat.backgroundColor,userEnteredFormat.backgroundColorStyle,userEnteredFormat.textFormat.foregroundColor,userEnteredFormat.textFormat.foregroundColorStyle' } },
    { repeatCell: { range: { sheetId: id, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: grid.columnCount }, cell: { userEnteredFormat: { backgroundColorStyle: { rgbColor: { red: 1, green: 1, blue: 0 } }, textFormat: { bold: true, foregroundColorStyle: { rgbColor: {} } } } }, fields: 'userEnteredFormat.backgroundColorStyle,userEnteredFormat.textFormat.bold,userEnteredFormat.textFormat.foregroundColorStyle' } },
    { updateSheetProperties: { properties: { sheetId: id }, fields: 'tabColor,tabColorStyle' } }
  );
  return requests;
}
