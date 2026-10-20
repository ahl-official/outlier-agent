import dotenv from 'dotenv';
dotenv.config();

import { DEFAULT_RADAR_KEYWORDS } from '../src/keywords';
import { searchYouTubeOutliers } from '../src/providers/youtube';
import { searchInstagramOutliers } from '../src/providers/instagram';
import { rankOutlierCandidates } from '../src/scoring/outlier';
import { OutlierCandidate } from '../src/types';
import { saveRadarCache } from '../src/storage';
import { analyzeOutlierVideo } from '../src/breakdown/analyze';

async function main() {
  console.log('\n======================================================');
  console.log('   🚀 OUTLIER AGENT: DISCOVERY RADAR RUNNER');
  console.log('   Target Brand: American Hairline (Hair Systems / Patches)');
  console.log('======================================================\n');

  const args = process.argv.slice(2);
  const keywordArg = args.find((a) => a.startsWith('--keyword='))?.split('=')[1];
  const platformArg = args.find((a) => a.startsWith('--platform='))?.split('=')[1] || 'all';
  const minViewsArg = args.find((a) => a.startsWith('--min-views='))?.split('=')[1];
  const minFollowersArg = args.find((a) => a.startsWith('--min-followers='))?.split('=')[1];

  const minViews = minViewsArg ? parseInt(minViewsArg, 10) : 100_000;
  const minFollowers = minFollowersArg ? parseInt(minFollowersArg, 10) : 14_000;

  const keywordsToScan = keywordArg ? [keywordArg] : DEFAULT_RADAR_KEYWORDS.slice(0, 3);
  console.log(`Scanning keywords: ${keywordsToScan.map((k) => `"${k}"`).join(', ')}`);
  console.log(`Platform scope: ${platformArg.toUpperCase()}`);
  console.log(`Filters applied : Min Views >= ${minViews.toLocaleString()} (Lakhs/Millions) | Min Followers >= ${minFollowers.toLocaleString()} (>14k)\n`);

  const allCandidates: OutlierCandidate[] = [];

  for (const kw of keywordsToScan) {
    console.log(`🔍 [Radar] Scanning for: "${kw}"...`);

    // 1. YouTube Scan
    if (platformArg === 'all' || platformArg === 'youtube') {
      try {
        const ytResults = await searchYouTubeOutliers({
          keyword: kw,
          maxResults: 15,
          publishedAfterDays: 30,
          minViews,
          minSubscribers: minFollowers
        });
        console.log(`   ▶ YouTube: found ${ytResults.length} high-view outlier videos`);
        allCandidates.push(...ytResults);
      } catch (err: any) {
        console.error(`   ⚠️ YouTube scan error for "${kw}":`, err.message);
      }
    }

    // 2. Instagram Scan (only first keyword if full scan to preserve Apify compute units)
    if ((platformArg === 'all' || platformArg === 'instagram') && kw === keywordsToScan[0]) {
      try {
        console.log(`   📸 Instagram: querying popular reels on Apify for "${kw}"...`);
        const igResults = await searchInstagramOutliers({
          keyword: kw,
          searchLimit: 20,
          minViews,
          minFollowers
        });
        console.log(`   📸 Instagram: found ${igResults.length} high-view reels`);
        allCandidates.push(...igResults);
      } catch (err: any) {
        console.error(`   ⚠️ Instagram scan error for "${kw}":`, err.message);
      }
    }
  }

  // Deduplicate by URL
  const seenUrls = new Set<string>();
  const uniqueCandidates = allCandidates.filter((c) => {
    if (seenUrls.has(c.url)) return false;
    seenUrls.add(c.url);
    return true;
  });

  const ranked = rankOutlierCandidates(uniqueCandidates);
  saveRadarCache(ranked);

  console.log(`\nFound ${ranked.length} total unique candidates. Top ranked outliers:\n`);

  ranked.slice(0, 10).forEach((item, index) => {
    const badge = item.platform === 'youtube' ? '▶ YouTube' : '📸 IG Reel';
    console.log(`------------------------------------------------------------------`);
    console.log(`#${index + 1} [Score: ${item.outlierScore}/100] [${badge}] ${item.outlierMultiplier}x Outlier`);
    console.log(`Title   : ${item.title}`);
    console.log(`Creator : ${item.creator.displayName} (${item.creator.username})`);
    console.log(`Metrics : ${item.viewCount.toLocaleString()} views | ${item.likeCount.toLocaleString()} likes | ${item.commentCount.toLocaleString()} comments`);
    console.log(`Signal  : ${item.whyOutlier}`);
    console.log(`URL     : ${item.url}`);
  });

  console.log(`------------------------------------------------------------------\n`);

  // Breakdown demonstration on top #1 outlier
  if (ranked[0]) {
    console.log(`⚡ Generating Detailed Outlier Intelligence for #1 Outlier...`);
    const breakdown = await analyzeOutlierVideo(ranked[0]);
    console.log(`\n📊 OUTLIER PERFORMANCE METRICS:`);
    console.log(`   Virality Tier       : ${breakdown.metrics.viralityTier}`);
    console.log(`   Outlier Multiplier  : ${breakdown.metrics.outlierMultiplier}x baseline (~${breakdown.creator.medianViews.toLocaleString()} views)`);
    console.log(`   Total Views         : ${breakdown.metrics.viewCount.toLocaleString()} (${breakdown.metrics.velocityViewsPerDay.toLocaleString()} views/day)`);
    console.log(`   Engagement Rate     : ${breakdown.metrics.engagementRatePercent}% (${breakdown.metrics.likeCount.toLocaleString()} likes, ${breakdown.metrics.commentCount.toLocaleString()} comments)`);
    
    console.log(`\n🔍 HOOK & CONTENT ARCHITECTURE:`);
    console.log(`   Opening Hook        : "${breakdown.contentAnalysis.hookHeadline}"`);
    console.log(`   Hook Mechanism      : ${breakdown.contentAnalysis.hookMechanism}`);
    console.log(`   Core Topic          : ${breakdown.contentAnalysis.coreTopic}`);
    console.log(`   Format Classification: ${breakdown.contentAnalysis.formatType}`);
    
    if (breakdown.contentAnalysis.extractedHashtags.length > 0) {
      console.log(`   Hashtags            : ${breakdown.contentAnalysis.extractedHashtags.join(' ')}`);
    }

    if (breakdown.audienceVoice.realComments.length > 0) {
      console.log(`\n💬 REAL AUDIENCE COMMENTS:`);
      breakdown.audienceVoice.realComments.slice(0, 3).forEach((c) => {
        console.log(`   - ${c.author}: "${c.text}" (${c.likeCount} likes)`);
      });
    }

    console.log(`\n🎯 WHY THIS VIDEO OUTPERFORMED THE BASELINE:`);
    console.log(`   Primary Driver      : ${breakdown.whyOutlierDiagnosis.primaryDriver}`);
    console.log(`   Retention Barrier   : ${breakdown.whyOutlierDiagnosis.retentionHookReason}`);
    console.log(`   Engagement Trigger  : ${breakdown.whyOutlierDiagnosis.engagementTrigger}`);
  }

  console.log(`\n✅ Radar results saved to data/radar_cache.json. Done!\n`);
}

main().catch(console.error);
