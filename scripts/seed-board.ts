import { saveBoardItems, getSavedRadarCache } from '../src/storage';
import { analyzeOutlierVideo } from '../src/breakdown/analyze';
import { BoardItem } from '../src/types';

async function seed() {
  const cached = await getSavedRadarCache();
  if (cached.length >= 2) {
    const b1 = await analyzeOutlierVideo(cached[0]);
    const b2 = await analyzeOutlierVideo(cached[1]);

    const items: BoardItem[] = [
      {
        id: `item_${Date.now()}_1`,
        candidate: cached[0],
        breakdown: b1,
        status: 'saved',
        notes: 'Observed 1.7x outlier with high comment activity discussing natural hairline placement.',
        addedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: `item_${Date.now()}_2`,
        candidate: cached[1],
        breakdown: b2,
        status: 'analyzing',
        notes: 'High conversion before/after contrast hook. Analyzing retention pattern.',
        addedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    await saveBoardItems(items);
    console.log('✅ Board refreshed with clean, accurate items in Saved and Analyzing!');
  }
}

seed().catch(console.error);
