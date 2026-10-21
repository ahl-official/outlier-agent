import { google } from 'googleapis';
import path from 'path';
import fs from 'fs';

export function getGoogleSheetsClient() {
  // 1. Full JSON string in env var (convenient for Vercel)
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    try {
      const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: creds.client_email,
          private_key: creds.private_key?.replace(/\\n/g, '\n'),
        },
        scopes: [
          'https://www.googleapis.com/auth/spreadsheets',
          'https://www.googleapis.com/auth/drive'
        ]
      });
      return google.sheets({ version: 'v4', auth });
    } catch (err) {
      console.warn('Error parsing GOOGLE_SERVICE_ACCOUNT_JSON:', err);
    }
  }

  // 2. Individual email + private key env vars (convenient for Vercel)
  if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive'
      ]
    });
    return google.sheets({ version: 'v4', auth });
  }

  // 3. Local service account.json file (for local development)
  const serviceAccountPath = path.resolve(process.cwd(), 'service account.json');
  if (fs.existsSync(serviceAccountPath)) {
    const auth = new google.auth.GoogleAuth({
      keyFile: serviceAccountPath,
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive'
      ]
    });
    return google.sheets({ version: 'v4', auth });
  }

  return null;
}
