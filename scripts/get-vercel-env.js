const fs = require('fs');
const path = require('path');

const keyFile = path.resolve(__dirname, '..', 'service account.json');

if (!fs.existsSync(keyFile)) {
  console.error('❌ service account.json not found in root directory.');
  process.exit(1);
}

const raw = fs.readFileSync(keyFile, 'utf8');
const minified = JSON.stringify(JSON.parse(raw));

console.log('\n======================================================');
console.log('📋 GOOGLE SERVICE ACCOUNT ENVIRONMENT VARIABLE FOR VERCEL');
console.log('======================================================\n');
console.log('If you deployed your Outlier Agent to Vercel, copy and paste this into:');
console.log('Vercel Dashboard -> Project Settings -> Environment Variables -> Add New\n');
console.log('KEY:');
console.log('GOOGLE_SERVICE_ACCOUNT_JSON\n');
console.log('VALUE (copy everything inside the line below):');
console.log(minified);
console.log('\n======================================================\n');
