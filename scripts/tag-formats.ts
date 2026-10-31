import dotenv from 'dotenv';
dotenv.config();

import { tagUntaggedOutliers } from '../src/format-map-service';

/**
 * Backfills Format Map tags (Format x Editing Style) for every outlier that doesn't have them yet.
 * Runs without the 60s serverless limit, so it can clear the whole backlog in one go.
 *
 *   npm run tag-formats                      # all untagged outliers >= 3x
 *   npm run tag-formats -- --min-mult=1.5 --limit=50
 */
async function main() {
  const args = process.argv.slice(2);
  const minMult = parseFloat(args.find((a) => a.startsWith('--min-mult='))?.split('=')[1] || '3');
  const limit = parseInt(args.find((a) => a.startsWith('--limit='))?.split('=')[1] || '1000', 10);

  console.log(`\n🧩 Format Map tagger: untagged outliers >= ${minMult}x, up to ${limit}\n`);

  const result = await tagUntaggedOutliers(
    { minMultiplier: minMult, brand: 'all', platform: 'all' },
    { limit, budgetMs: Number.MAX_SAFE_INTEGER, onProgress: (msg) => console.log(`   ${msg}`) }
  );

  console.log(`\n✅ Tagged ${result.tagged}, failed ${result.failed}, still untagged ${result.remaining} (stopped: ${result.stoppedReason})`);
  if (result.stoppedReason === 'storage') {
    console.log('   Tags could not be saved - create the format_labels table (section 8 of supabase/schema.sql) first.');
  }
  if (result.stoppedReason === 'quota') {
    console.log('   Gemini quota is spent for now - run this again later to continue where it stopped.');
  }
}

main().catch(console.error);
