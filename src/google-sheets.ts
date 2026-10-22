import { google } from 'googleapis';
import path from 'path';
import fs from 'fs';

/**
 * Normalizes and cleans RSA Private Keys across all environments:
 * - Strips wrapping quotes
 * - Handles literal \n, \r\n, and double-escaped \\n
 * - Reconstructs clean 64-character PEM chunks between BEGIN/END headers
 * This permanently prevents OpenSSL error:1E08010C:DECODER routines::unsupported
 */
export function cleanPrivateKey(rawKey: string | undefined): string {
  if (!rawKey) return '';
  let key = String(rawKey).trim();

  // Strip wrapping single or double quotes
  while ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1).trim();
  }

  // Replace escaped carriage returns and newlines
  key = key.replace(/\\r\\n/g, '\n').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  key = key.replace(/\\\\n/g, '\n').replace(/\\n/g, '\n');

  // Strip wrapping quotes again if unescaped
  key = key.trim();
  while ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1).trim();
  }

  // Extract standard PEM header, base64 content, and footer
  const headerMatch = key.match(/-----BEGIN [A-Z\s]+PRIVATE KEY-----/);
  const footerMatch = key.match(/-----END [A-Z\s]+PRIVATE KEY-----/);

  if (headerMatch && footerMatch) {
    const header = headerMatch[0];
    const footer = footerMatch[0];
    const headerEndIdx = key.indexOf(header) + header.length;
    const footerStartIdx = key.indexOf(footer);
    // Strip all whitespaces, tabs, newlines, and illegal characters from base64 body
    const body = key.substring(headerEndIdx, footerStartIdx).replace(/[^A-Za-z0-9+/=]/g, '');
    // Wrap base64 body into 64-character standard PEM lines
    const formattedBody = body.match(/.{1,64}/g)?.join('\n') || body;
    return `${header}\n${formattedBody}\n${footer}\n`;
  }

  return key;
}

/**
 * Robustly parses Google Service Account JSON from environment variable:
 * Supports raw JSON, minified JSON, base64-encoded JSON, or wrapped JSON.
 */
export function parseServiceAccountJson(rawInput: string | undefined): { client_email?: string; private_key?: string } | null {
  if (!rawInput) return null;
  let raw = String(rawInput).trim();

  // Strip surrounding quotes
  while ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    raw = raw.slice(1, -1).trim();
  }

  // If base64-encoded, decode it
  if (!raw.startsWith('{')) {
    try {
      const decoded = Buffer.from(raw, 'base64').toString('utf-8').trim();
      if (decoded.startsWith('{')) raw = decoded;
    } catch {
      // Continue with raw string
    }
  }

  try {
    const parsed = JSON.parse(raw);
    return parsed;
  } catch {
    try {
      // Try unescaping backslash-escaped quotes
      const parsed = JSON.parse(raw.replace(/\\"/g, '"'));
      return parsed;
    } catch (err: any) {
      console.warn('[Google Sheets] Could not parse GOOGLE_SERVICE_ACCOUNT_JSON:', err.message);
      return null;
    }
  }
}

export function getGoogleSheetsClient() {
  // 1. Full JSON string in env var (raw or base64 - convenient for Vercel)
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    const creds = parseServiceAccountJson(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    if (creds?.client_email && creds?.private_key) {
      try {
        const cleanedKey = cleanPrivateKey(creds.private_key);
        const auth = new google.auth.GoogleAuth({
          credentials: {
            client_email: creds.client_email.trim(),
            private_key: cleanedKey,
          },
          scopes: [
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/drive'
          ]
        });
        return google.sheets({ version: 'v4', auth });
      } catch (err: any) {
        console.warn('[Google Sheets] Error initializing with GOOGLE_SERVICE_ACCOUNT_JSON:', err.message);
      }
    }
  }

  // 2. Individual email + private key env vars (convenient for Vercel)
  if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    try {
      const cleanedKey = cleanPrivateKey(process.env.GOOGLE_PRIVATE_KEY);
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL.trim(),
          private_key: cleanedKey,
        },
        scopes: [
          'https://www.googleapis.com/auth/spreadsheets',
          'https://www.googleapis.com/auth/drive'
        ]
      });
      return google.sheets({ version: 'v4', auth });
    } catch (err: any) {
      console.warn('[Google Sheets] Error with GOOGLE_SERVICE_ACCOUNT_EMAIL/KEY:', err.message);
    }
  }

  // 3. Local service account.json file (check multiple candidate paths)
  const candidatePaths = [
    path.resolve(process.cwd(), 'service account.json'),
    path.resolve(process.cwd(), 'service-account.json'),
    path.resolve(__dirname, '..', 'service account.json'),
    path.resolve(__dirname, '..', '..', 'service account.json')
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      try {
        const fileContent = fs.readFileSync(p, 'utf-8');
        const fileCreds = JSON.parse(fileContent);
        const cleanedKey = cleanPrivateKey(fileCreds.private_key);

        const auth = new google.auth.GoogleAuth({
          credentials: {
            client_email: fileCreds.client_email?.trim(),
            private_key: cleanedKey,
          },
          scopes: [
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/drive'
          ]
        });
        return google.sheets({ version: 'v4', auth });
      } catch (err: any) {
        console.warn(`[Google Sheets] Error reading keyFile from ${p}:`, err.message);
      }
    }
  }

  return null;
}
