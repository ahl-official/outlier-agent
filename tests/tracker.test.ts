import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readTrackerSheet, planTrackerInsert, insertTrackerRecord, planSimpleTrackerStyle, type TrackerSnapshot } from '../src/tracker-sheet';
import { updateTrackerAnalysis } from '../src/tracker-sheet';
import { trackerAnalysisColumns } from '../src/tracker-analysis';
import { ANALYSIS_VERSION } from '../src/breakdown/evidence';

function snapshot(): TrackerSnapshot {
  const rows = Array.from({ length: 42 }, () => Array(18).fill(''));
  rows[0][5] = 'https://www.youtube.com/watch?v=existing123';
  rows[11][5] = 'https://www.instagram.com/p/existing/'; // Sheet row 13.
  rows[41][17] = 'Orphan timestamp below the last real record'; // Sheet row 43.
  return { sheetId: 0, rowCount: 1088, columnCount: 35, rows };
}
const record = Array.from({ length: 18 }, (_, index) => index === 5 ? 'https://www.youtube.com/watch?v=newvideo123' : `value ${index}`);

test('new records appear after the last video, before unrelated lower timestamps', () => {
  const plan = planTrackerInsert(snapshot(), record);
  assert.equal(plan.rowNumber, 14);
  assert.equal(plan.range, "'Outliers Tracker'!A14:R14");
  assert.equal(plan.requests[0].insertDimension?.range?.startIndex, 13);
  assert.equal(plan.requests[0].insertDimension?.range?.endIndex, 14);
  assert.equal(plan.requests[1].updateCells?.start?.rowIndex, 13);
});

test('inserted body rows clear background styling without changing other row values', () => {
  const plan = planTrackerInsert(snapshot(), record);
  const style = plan.requests[2].repeatCell!;
  assert.equal(style.range?.startRowIndex, 13);
  assert.equal(style.range?.endColumnIndex, 35);
  assert.match(style.fields!, /backgroundColorStyle/);
  assert.equal(style.cell?.userEnteredFormat?.backgroundColorStyle, undefined);
  assert.equal(style.cell?.userEnteredFormat?.textFormat?.bold, false);
  assert.doesNotMatch(style.fields!, /userEnteredValue|dataValidation/);
});

test('a full grid grows by one row and a header-only sheet can receive its first record', () => {
  const full: TrackerSnapshot = { sheetId: 7, rowCount: 2, columnCount: 18, rows: [record] };
  assert.deepEqual(planTrackerInsert(full, record).requests[0].appendDimension, { sheetId: 7, dimension: 'ROWS', length: 1 });
  const empty: TrackerSnapshot = { sheetId: 7, rowCount: 1000, columnCount: 18, rows: [] };
  const plan = planTrackerInsert(empty, record);
  assert.equal(plan.rowNumber, 2);
  assert.equal(plan.requests[0].insertDimension?.inheritFromBefore, false);
});

test('row contents are literal text, not user-entered spreadsheet formulas', () => {
  const incoming = [...record]; incoming[4] = '=IMPORTXML("https://example.test", "//x")';
  const cell = planTrackerInsert(snapshot(), incoming).requests[1].updateCells?.rows?.[0].values?.[4];
  assert.deepEqual(cell?.userEnteredValue, { stringValue: incoming[4] });
  assert.throws(() => planTrackerInsert(snapshot(), []), /18 columns/);
});

test('metadata-derived reads include records past the old row-1000 cutoff', async () => {
  let range = '';
  const sheets = { spreadsheets: {
    get: async () => ({ data: { sheets: [{ properties: { sheetId: 3, title: 'Outliers Tracker', gridProperties: { rowCount: 1500, columnCount: 18 } } }] } }),
    values: { get: async (request: any) => { range = request.range; return { data: { values: [['', '', '', '', '', 'Video URL'], ...Array.from({ length: 1200 }, () => []), record] } }; } }
  } };
  const result = await readTrackerSheet(sheets as any, 'id');
  assert.equal(range, "'Outliers Tracker'!A1:R1500");
  assert.equal(result.rows[1200][5], record[5]);
});

test('a wrong tab or a moved URL header fails safely', async () => {
  const sheets = { spreadsheets: { get: async () => ({ data: { sheets: [] } }) } };
  await assert.rejects(() => readTrackerSheet(sheets as any, 'id'), /no "Outliers Tracker"/);
  const malformed = { spreadsheets: {
    get: async () => ({ data: { sheets: [{ properties: { sheetId: 0, title: 'Outliers Tracker', gridProperties: { rowCount: 100, columnCount: 18 } } }] } }),
    values: { get: async () => ({ data: { values: [['Different schema']] } }) }
  } };
  await assert.rejects(() => readTrackerSheet(malformed as any, 'id'), /Video URL/);
});

test('a save is only confirmed when the atomic response contains the submitted URL', async () => {
  let request: any;
  const sheets = { spreadsheets: { batchUpdate: async (input: any) => {
    request = input;
    return { data: { updatedSpreadsheet: { sheets: [{ properties: { sheetId: 0 }, data: [{ rowData: [{ values: record.map(value => ({ userEnteredValue: { stringValue: value } })) }] }] }] } } };
  } } };
  const result = await insertTrackerRecord(sheets as any, 'id', snapshot(), record);
  assert.equal(result.rowNumber, 14);
  assert.equal(request.requestBody.requests.length, 3);
  assert.equal(request.requestBody.responseIncludeGridData, true);
  sheets.spreadsheets.batchUpdate = async () => ({ data: {} } as any);
  await assert.rejects(() => insertTrackerRecord(sheets as any, 'id', snapshot(), record), /could not be confirmed/);
});

test('simple styling removes fill rules/banding and colors only the header yellow', () => {
  const requests = planSimpleTrackerStyle({ properties: { sheetId: 0, gridProperties: { rowCount: 1088, columnCount: 35 } }, conditionalFormats: [{}, {}, {}], bandedRanges: [{ bandedRangeId: 21 }] });
  assert.deepEqual(requests.slice(0, 3).map(request => request.deleteConditionalFormatRule?.index), [2, 1, 0]);
  assert.equal(requests[3].deleteBanding?.bandedRangeId, 21);
  const fills = requests.filter(request => request.repeatCell).map(request => request.repeatCell!);
  assert.equal(fills[0].range?.startRowIndex, 1);
  assert.equal(fills[0].cell?.userEnteredFormat?.backgroundColorStyle, undefined);
  assert.equal(fills[1].range?.endRowIndex, 1);
  assert.deepEqual(fills[1].cell?.userEnteredFormat?.backgroundColorStyle?.rgbColor, { red: 1, green: 1, blue: 0 });
  assert.ok(fills.every(request => !request.fields?.includes('userEnteredValue')));
});

test('tracker exports a short verdict for the same video and rejects unavailable or unrelated reports', () => {
  const report = {
    candidateUrl: 'https://www.instagram.com/reel/SomeId/', analysisVersion: ANALYSIS_VERSION,
    status: 'ai_analyzed', evidenceSource: 'frames',
    findings: { firstSixSeconds: { visualHook: 'The stylist parts the hair.', audioHook: 'Unverified speech' },
      analyzedWithAudio: false, sixReasons: Array.from({ length: 6 }, (_, index) => ({ heading: `Finding ${index + 1}`, paragraph: 'Observed visual evidence.' })) }
  };
  const url = 'https://www.instagram.com/p/SomeId/?utm_source=test';
  const columns = trackerAnalysisColumns(url, report);
  assert.equal(columns?.[0], 'The stylist parts the hair.');
  assert.equal(columns?.[1], 'Audio not verified');
  assert.equal(columns?.[2], 'Observed visual evidence.');
  const outlierVerdict = 'The overhead shot shows how the parting sits. That angle gives viewers a clear way to judge the fit.';
  const concise = trackerAnalysisColumns(url, { ...report, findings: { ...report.findings,
    outlierVerdict
  } });
  assert.equal(concise?.[2], outlierVerdict);
  assert.equal(trackerAnalysisColumns(url, { ...report, status: 'unavailable' }), null);
  assert.equal(trackerAnalysisColumns('https://www.instagram.com/p/OtherId/', report), null);
});

test('re-saving a matching video writes only M:O and R and retries are idempotent', async () => {
  const url = 'https://www.instagram.com/p/SomeId/';
  const analysis: [string, string, string] = ['Observed hook', 'Audio not verified', 'Six findings'];
  const row = [url, '', '', '', '', '', '', 'Not analyzed', '', '', 'Approved', 'Keep feedback', 'Old timestamp'];
  let writes = 0;
  const sheets = { spreadsheets: {
    values: { get: async () => ({ data: { values: [row] } }) },
    batchUpdate: async (input: any) => {
      writes++;
      assert.deepEqual(input.requestBody.requests.map((request: any) => request.updateCells.start.columnIndex), [12, 17]);
      assert.ok(input.requestBody.requests.every((request: any) => request.updateCells.start.rowIndex === 13));
      row.splice(7, 3, ...analysis);
      row[12] = 'New timestamp';
      return { data: { updatedSpreadsheet: { sheets: [{ properties: { sheetId: 0 }, data: [{ rowData: [{ values: row.map(value => ({ userEnteredValue: { stringValue: value } })) }] }] }] } } };
    }
  } };
  assert.equal(await updateTrackerAnalysis(sheets as any, 'id', 0, 14, url, analysis, 'New timestamp'), true);
  assert.equal(await updateTrackerAnalysis(sheets as any, 'id', 0, 14, url, analysis, 'Later'), false);
  assert.equal(writes, 1);
  assert.equal(row[10], 'Approved');
  assert.equal(row[11], 'Keep feedback');
  row[0] = 'https://www.instagram.com/p/OtherId/';
  await assert.rejects(() => updateTrackerAnalysis(sheets as any, 'id', 0, 14, url, analysis, 'Later'), /row moved/);
});
