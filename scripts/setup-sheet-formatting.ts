import { google } from 'googleapis';
import path from 'path';
import fs from 'fs';

async function setupSheetFormatting() {
  const serviceAccountPath = path.resolve(process.cwd(), 'service account.json');
  if (!fs.existsSync(serviceAccountPath)) {
    console.error('service account.json not found');
    return;
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: serviceAccountPath,
    scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive']
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = '14nj56PxfqLHcv8xTB03_RKSfyDD2s-C9Psk3LMnWGdU';

  console.log('Applying data validation dropdowns, column widths & styling...');

  const columnWidths = [
    { startIndex: 0, endIndex: 1, pixelSize: 160 }, // Timestamp
    { startIndex: 1, endIndex: 2, pixelSize: 180 }, // Submitted By
    { startIndex: 2, endIndex: 3, pixelSize: 130 }, // Brand Focus
    { startIndex: 3, endIndex: 4, pixelSize: 100 }, // Platform
    { startIndex: 4, endIndex: 5, pixelSize: 280 }, // Video Title
    { startIndex: 5, endIndex: 6, pixelSize: 240 }, // Video URL
    { startIndex: 6, endIndex: 7, pixelSize: 140 }, // Creator
    { startIndex: 7, endIndex: 8, pixelSize: 110 }, // Followers
    { startIndex: 8, endIndex: 9, pixelSize: 110 }, // Views
    { startIndex: 9, endIndex: 10, pixelSize: 130 }, // Reach Ratio
    { startIndex: 10, endIndex: 11, pixelSize: 120 }, // Multiplier
    { startIndex: 11, endIndex: 12, pixelSize: 120 }, // Outlier Tier
    { startIndex: 12, endIndex: 13, pixelSize: 250 }, // Visual Hook
    { startIndex: 13, endIndex: 14, pixelSize: 240 }, // Audio Strategy
    { startIndex: 14, endIndex: 15, pixelSize: 260 }, // Secret Formula
    { startIndex: 15, endIndex: 16, pixelSize: 180 }, // Sir's Approval Status (Dropdown)
    { startIndex: 16, endIndex: 17, pixelSize: 280 }, // Sir's Reason / Feedback
    { startIndex: 17, endIndex: 18, pixelSize: 160 }  // Last Updated
  ];

  const updateDimensionRequests = columnWidths.map(col => ({
    updateDimensionProperties: {
      range: {
        sheetId: 0,
        dimension: 'COLUMNS',
        startIndex: col.startIndex,
        endIndex: col.endIndex
      },
      properties: {
        pixelSize: col.pixelSize
      },
      fields: 'pixelSize'
    }
  }));

  const validationRequest = {
    setDataValidation: {
      range: {
        sheetId: 0,
        startRowIndex: 1,
        endRowIndex: 1000,
        startColumnIndex: 15, // Column P
        endColumnIndex: 16
      },
      rule: {
        condition: {
          type: 'ONE_OF_LIST',
          values: [
            { userEnteredValue: 'Pending Review' },
            { userEnteredValue: 'Approved by Sir' },
            { userEnteredValue: 'Rejected by Sir' },
            { userEnteredValue: 'Under Discussion' },
            { userEnteredValue: 'Already Shot' }
          ]
        },
        inputMessage: "Select Sir's decision from the list",
        showCustomUi: true,
        strict: false
      }
    }
  };

  // Add conditional formatting for status column
  const conditionalFormatRequests = [
    {
      addConditionalFormatRule: {
        rule: {
          ranges: [{ sheetId: 0, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: 15, endColumnIndex: 16 }],
          booleanRule: {
            condition: {
              type: 'TEXT_EQ',
              values: [{ userEnteredValue: 'Approved by Sir' }]
            },
            format: {
              backgroundColor: { red: 0.82, green: 0.93, blue: 0.85 },
              textFormat: { foregroundColor: { red: 0.08, green: 0.38, blue: 0.15 }, bold: true }
            }
          }
        },
        index: 0
      }
    },
    {
      addConditionalFormatRule: {
        rule: {
          ranges: [{ sheetId: 0, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: 15, endColumnIndex: 16 }],
          booleanRule: {
            condition: {
              type: 'TEXT_EQ',
              values: [{ userEnteredValue: 'Rejected by Sir' }]
            },
            format: {
              backgroundColor: { red: 0.97, green: 0.84, blue: 0.85 },
              textFormat: { foregroundColor: { red: 0.45, green: 0.11, blue: 0.14 }, bold: true }
            }
          }
        },
        index: 1
      }
    },
    {
      addConditionalFormatRule: {
        rule: {
          ranges: [{ sheetId: 0, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: 15, endColumnIndex: 16 }],
          booleanRule: {
            condition: {
              type: 'TEXT_EQ',
              values: [{ userEnteredValue: 'Pending Review' }]
            },
            format: {
              backgroundColor: { red: 1.0, green: 0.95, blue: 0.80 },
              textFormat: { foregroundColor: { red: 0.52, green: 0.39, blue: 0.02 }, bold: true }
            }
          }
        },
        index: 2
      }
    }
  ];

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        ...updateDimensionRequests,
        validationRequest,
        ...conditionalFormatRequests
      ]
    }
  });

  console.log('Sheet styling, column widths, dropdowns, and conditional formatting configured successfully!');
}

setupSheetFormatting();
