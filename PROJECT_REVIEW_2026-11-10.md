# Outlier Agent project review — November 10, 2026

Review baseline: commit `465da8e` (November 2, 2026). Working tree was clean before this review.

The project is a substantial functional MVP for competitor content research across American Hairline and Alchemane. Discovery, analysis, curation, team submission, and leadership review are implemented. Production readiness is not established: evidence provenance, storage failure handling, access controls, and request time budgets need attention.

Scope: inspected the repository's application modules, routes, scripts, configuration, handoffs, dependency manifest/lockfile, and all eight JSON data files. Ignored credentials were checked only for configuration presence/structure; no secret values are included. Generated dependencies/build output were not reviewed as application source. Scratch media was inventoried, not watched or visually evaluated. No live provider scans, AI requests, database mutations, Google Sheets writes, WhatsApp messages, or deployment were performed.

## Product progress

| Area | Current implementation | Assessment |
| --- | --- | --- |
| Brand targeting | AHL and Alchemane presets, categories, custom keywords, brand switch | Implemented; active brand is shared globally in Supabase |
| Discovery Radar | YouTube Data API and Apify Instagram search, relevance gate, view/follower/reach filters | Implemented; provider failure can appear as a successful empty search |
| Freshness | 48-hour → 4-day → 6-day → evergreen fallback | Implemented; results can deliberately include old videos |
| Outlier baselines | YouTube nearby uploads, Instagram recent reels; sample size and method metadata | Significant improvement; estimated and old baselines still enter rankings |
| Deep Dive | Metrics, comments on YouTube, frame audit, Gemini six-reasons analysis, OpenRouter fallback | Implemented; several legacy sections are generated from templates rather than observed evidence |
| Saved Library | Save, status changes, research notes, deletion | Implemented; notes updates reset status and deletions rewrite the whole board |
| Team tracker | Google Sheets submissions, duplicate lookup, daily counts and targets, team management | Implemented; duplicate handling is not atomic and reads stop at row 1000 |
| Leadership review | Shareable swipeable hook/reasons cards and approve/disapprove | Implemented; database and Sheet results can diverge |
| WhatsApp | Opens a prefilled message/link in WhatsApp | User must tap Send; there is no automated delivery confirmation |
| Format Map | 15 formats × 11 editing styles, heat matrix, white-space suggestions and picks | Implemented with useful sample-size warnings; input quality remains the limiting factor |
| Persistence | Eight Supabase tables; process-local fallback for selected data | Migration implemented; local JSON files are historical snapshots |
| Scheduling | One keyword per daily cron invocation at 06:00 UTC / 11:30 AM IST | Configured in source; deployment and actual executions unverified |

## Development timeline

- October 17 handoff describes an unbuilt scaffold. It is obsolete as a current progress document.
- October 19 handoff describes a working radar/analysis dashboard, but predates major storage, review, and mapping work. Its production-ready claim is not a substitute for current validation.
- October 20–21: frame extraction, WhatsApp handoff, Sheets tracker and quotas.
- October 22–23: provider query fixes, lower discovery thresholds, evergreen fallback, Supabase migration and cron.
- October 26–27: six-reasons analysis, public visual review links, stronger topic relevance checks.
- October 31: Format Map and per-video creator baselines.
- November 2: larger search limits and browser-local seen-video tracking. Latest local commit.

## Findings to address first

### 1. High: analysis can present invented observations as measured evidence

`src/breakdown/ffmpeg.ts:379` returns the same cover image four times with different timestamps and preset retention scores. Other fallback images also receive fixed timeline labels. `src/breakdown/social-agent.ts:246` reports its heuristic fallback as `ffmpeg_multimodal_analyzed`, even without a successful AI call. `src/breakdown/analyze.ts:199` generates detailed camera, scene, sound-sync and retention claims from text rules, including unsupported numeric claims; it does not inspect the frames in that helper. `deriveInquiryThemes` supplies generic audience themes when there are no matching real comments.

Consequence: the desk and shared reports can sound more certain than their evidence supports. The newer six-reasons prompt has better observation/inference instructions, but does not repair the older output sections. Preserve provenance (`video`, actual sampled frames, thumbnail, metadata, heuristic), mark missing evidence explicitly, remove invented timestamps/retention metrics, and render inferred ideas as hypotheses.

### 2. High: application data and paid operations lack application-level access controls

The board, team, keywords, tracker, radar, analysis, and tagging APIs have no user/session authorization or rate limits in this repository. The cron route checks its secret only when `CRON_SECRET` exists. Public review links are intentional, but administrative and paid endpoints need a separate access boundary.

`supabase/schema.sql` claims RLS is enabled, but contains no `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`. Ordinary table creation does not establish the protection described in its comment. Actual deployed RLS/grants and any hosting-level protection were not inspected; database exposure cannot be concluded from this checkout alone.

### 3. High: storage errors can be reported as successful saves

Most writes in `src/storage.ts` catch and log failures without returning an error. Callers can report success while only a process-local copy changed. That copy is lost on restart and is not shared among serverless instances. Registry entries, format labels and review links do not have the same fallback coverage.

Board replacement (`:48`), radar replacement (`:179`) and team replacement (`:609`) delete all rows before reinserting, without a transaction. A failed insert or concurrent request can lose records. Use per-record operations where possible, transactional replacement when necessary, and explicit write results.

### 4. High: request deadlines do not cover the whole workflow

The 60-second breakdown route can spend time resolving a Reel, fetching its profile, fetching comments, extracting/downloading media, and making model calls. The six-reasons race is only one branch; `analyze.ts:122` still waits for frames and then the social agent. Losing a `Promise.race` does not cancel its underlying work. A direct Instagram lookup allows a 60-second actor run before subsequent work even starts.

Radar accepts up to four keywords sequentially. Instagram can make a full query, fallback query and profile lookup in sequence. Format tagging's budget check occurs between candidates; individual downloads and model retries can exceed the intended budget. Use a shared abort deadline, or durable background jobs with polling for long tasks.

### 5. High: the UI bypasses caches and scans can erase saved analyses

`src/app/page.tsx:900` and `:960` send `forceRefresh: true` for radar and breakdown. Consequently, the 24-hour search cache and 72-hour analysis cache are bypassed on those primary UI paths.

`src/storage.ts:287` writes `breakdown: null` when a registry upsert contains only a candidate. Both manual and cron scans call that path. Discovering an already-analyzed video can therefore erase its stored analysis. Preserve existing breakdowns during metadata-only updates and make refresh an explicit user action.

### 6. Medium: unknown Instagram followers are accepted by the server but hidden by the UI

The provider and radar POST route deliberately permit unresolved follower counts. `src/app/page.tsx:292` treats unknown reach as zero, and the following follower check treats missing followers as zero, removing those candidates under the default filters. The cached search path has similar stricter checks. Align the policy across provider, cache, route and UI, with a visible unknown state.

### 7. Medium: editing notes resets the board item's status

`handleSaveNotes` submits only `id` and `notes`; `/api/board` passes `body.status || 'saved'` into `updateBoardItemStatus`. Editing notes on an analyzing/benchmarked/actionable item moves it back to saved. Preserve the existing status for detail-only updates.

### 8. Medium: review status can be wrong in the UI and tracker

`src/app/review/[token]/page.tsx:107` displays the user's requested decision whenever a response includes a link, including a 409 with a different existing decision. It also claims the decision was recorded in the Sheet even if the API returns `sheetUpdated: false`.

The tracker detects approval using `status.toLowerCase().includes('approved')`; `Disapproved` also matches, while rejection only matches `rejected`. Visual-review disapprovals can therefore display as approved. The database decision is a read-then-write without a conditional pending-state update, so simultaneous decisions can overwrite each other. Sheet failure is best-effort with no reconciliation mechanism, and the write also replaces feedback in column Q.

### 9. Medium: identity normalization and deduplication differ across systems

Registry/format-label keys lowercase entire URLs and only remove a trailing slash. Platform video IDs/shortcodes preserve case, and equivalent watch/shorts/shortener URLs are not unified there. The tracker has a better `platform:id` helper, duplicated in the client, but hostname checks use substring matching. Board deduplication is also read-then-write without a unique canonical video constraint. Introduce one canonical platform-aware key and preserve identifier case.

### 10. Medium: baseline reliability is not enforced in Format Map recommendations

The Format Map admits candidates with missing or estimated baselines. Heat is capped per video, but row/column medians and white-space ranking still use raw multipliers. The `100x+` cap only changes display. Older inflated values can influence picks despite warnings. Brand membership is inferred from built-in keyword lists: direct URLs and custom keywords have no brand and disappear from brand-specific views. Saved board entries also take priority over newer radar copies of the same video.

YouTube uses a 180-second boundary for baseline type comparison but 65 seconds for `isShortOrReel`; it can silently mix content types when the same-type sample is small. Instagram's no-profile estimate uses 20% of the video's own plays, yielding an artificial ~5x multiplier for sufficiently large play counts. Estimated views can also be inferred from likes without a separate view-count provenance field.

### 11. Medium: Sheets/team sync is fragile as data grows

Tracker GET, duplicate detection and approval matching read only `A2:R1000`. Appends continue beyond that range, leaving later rows outside counts, duplicate checks and approval matching. Concurrent duplicate checks can both pass before either append completes. Daily targets are tracked, not enforced as submission limits.

Team GET fetches Sheets then writes those members to Supabase. The Sheet roundtrip does not preserve phone numbers. Failed sync return values are ignored and responses can claim synchronization succeeded. An all-inactive or empty Sheet falls back to stale/default members. Team writes clear a range before writing replacements. Use an explicit source of truth, return real sync status, and reconcile failures.

### 12. Medium: shared brand state can interfere with other researchers

Switching brand updates one global `brand_config` row, including which keyword the cron will scan. Another user's keyword actions can consequently operate on the newly selected global brand. The dashboard keeps existing radar results when switching brands. Pass explicit brand identity with each operation and store per-user UI preferences separately.

### 13. Medium: media handling needs stricter input boundaries

`ffmpeg.ts` interpolates video URLs into shell command strings passed to `exec`; downloads can use URLs from persisted client-supplied candidates. Application routes accept broad, minimally validated candidate objects and substring-match supported URLs. This creates command-injection and server-side request risks, particularly with local downloader tools installed. Use `execFile`/argument arrays, exact hostname validation, validated provider-owned media URLs, bounded streaming downloads and consistent timeouts. No exploit was executed in this review.

### 14. Maintenance: automated regression coverage is absent

There is no configured test runner, lint script, or CI workflow in the checkout. Scripts named `test-*` are manual integration utilities and some mutate real Sheets. TypeScript explicitly excludes scripts. `test-tracker-api.ts` imports `node-fetch`, which is not a declared direct dependency; native fetch is already available elsewhere.

The main dashboard is 4,200 lines, about 221 KB, with 48 `useState` occurrences and 500 inline style objects. Extracting tabs, shared types, API helpers and state logic would make fixes easier to isolate. `queryGeminiAIAgent` is unused legacy code. Environment setup and handoffs need updating.

## Local data and configuration

These are historical local files, not live production counts. `src/storage.ts` no longer reads `data/*.json`.

| File | Local contents | Meaning |
| --- | --- | --- |
| `data/board.json` | 1 Instagram board item with breakdown; last updated Oct 20 | Pre-migration saved item |
| `data/radar_cache.json` | 8 candidates: 7 IG, 1 YT | Historical radar snapshot |
| `data/search_cache.json` | 5 search entries containing 61 candidates; latest Oct 21 | Historical query cache |
| `data/video_registry.json` | 66 entries: 38 IG, 28 YT; 8 breakdowns; latest Oct 21 | Historical registry; these are not necessarily 66 distinct canonical videos |
| `data/ig_profiles_cache.json` | 9 profile entries | Legacy profile cache |
| `data/keywords.json` | 6 keywords | Legacy keyword list |
| `data/brand_config.json` | Active brand and two keyword lists | Legacy brand settings |
| `data/team.json` | 3 members | Legacy team settings |

Every candidate inspected in the historical board/radar/search/registry snapshots lacks the newer `baselineMethod`. The registry contains multipliers as high as 1751.9x; these old values should not be treated as validated outlier evidence.

`.env` has the main provider, Supabase, cron and OpenRouter variable names present, plus Sheet/folder IDs. `INSTAGRAM_API_KEY` is defined twice. A structurally valid local service-account JSON exists. Presence does not establish validity, quota, permissions or production deployment configuration. Both credential files are git-ignored and absent from the tracked-file inventory. `.env.example` lacks the supported Google service account and Sheet/folder settings.

Locked versions inspected: Next 14.2.35, React 18.3.1, TypeScript 5.9.3, Supabase JS 2.118.0. No online dependency vulnerability audit or current provider/model compatibility check was performed.

## File-by-file inventory

| File | Responsibility / review note |
| --- | --- |
| `.env.example` | Provider/storage configuration template; incomplete Google integration setup |
| `.gitignore` | Excludes dependencies, build output, caches, local credentials and scratch files |
| `package.json` | Next dev/build/start plus radar, key-check and format-tag CLI commands; no test/lint scripts |
| `package-lock.json` | npm lockfile v3, 121 package entries; reproducible resolved dependency versions |
| `next-env.d.ts` | Generated Next type references |
| `next.config.js` | Strict mode and broad HTTP/HTTPS image remote patterns |
| `tsconfig.json` | Strict app type checking, alias configuration; scripts excluded |
| `vercel.json` | Daily radar cron schedule |
| `OUTLIER_AGENT_HANDOFF.md` | Original requirements and architecture; obsolete implementation status |
| `SESSION_HANDOVER_OCT_19.md` | Early dashboard handoff; outdated status, provider/config and port assumptions |
| `supabase/schema.sql` | Eight app tables and selected indexes; missing explicit RLS and canonical-video uniqueness |
| `src/types.ts` | Candidates, baseline provenance, audits, breakdowns, board and radar contracts; legacy/new statuses coexist |
| `src/storage.ts` | Supabase repositories, caches, brand/team configuration, format labels and public review links; main persistence risk concentration |
| `src/google-sheets.ts` | Service-account parsing and PEM normalization; supports JSON/env/local-file credentials |
| `src/keywords.ts` | AHL/Alchemane keyword presets and English relevance gate; substring matching can produce false positives/negatives |
| `src/format-map-service.ts` | Merges board/radar/labels and runs bounded tag batches; board copies win deduplication |
| `src/lib/supabase.ts` | Lazy singleton service-role client; null when environment is absent |
| `src/lib/video-url.ts` | Tracker canonical URL helper; consolidate its client duplicate and harden host validation |
| `src/providers/youtube.ts` | Search cascade, batch metadata, creator baselines, comments, URL/duration parsing; inconsistent short-video boundaries |
| `src/providers/instagram.ts` | Apify searches, query sanitization, creator profiles, Reel resolution and baselines; estimates and timeouts need clearer provenance |
| `src/scoring/outlier.ts` | Composite ranking and heuristic SOP taxonomy/adaptation; reach threshold definitions vary across layers |
| `src/scoring/format-taxonomy.ts` | Single taxonomy source, label normalization and incompatible combinations |
| `src/scoring/format-map.ts` | Pool filtering, heat, medians, shrinkage, white-space and picks; quality/brand caveats above |
| `src/breakdown/analyze.ts` | Orchestrates metrics, comments, legacy diagnosis, frames and six-reasons output; template claims and incomplete deadline |
| `src/breakdown/ffmpeg.ts` | Downloads, CLI sampling and cloud media fallbacks; repeated-cover fallback and shell input concerns |
| `src/breakdown/social-agent.ts` | Gemini frame audit with heuristic fallback; fallback mislabels its status/model |
| `src/breakdown/hook-analysis.ts` | Gemini video/audio or frame analysis with OpenRouter frame fallback; accepts fewer than six reasons and only partial shape validation |
| `src/breakdown/format-tagger.ts` | Gemini label-only pass; YouTube link support, downloaded video or thumbnail fallback, quota signal |
| `src/app/layout.tsx` | Root HTML and metadata; still describes AHL alone |
| `src/app/globals.css` | Dark visual theme, radar/board/tracker/review-modal/Format Map styles and responsive rules; many dashboard styles remain inline |
| `src/app/page.tsx` | All five main tabs, browser-local seen history, sharing and tracker/team dialogs; largest maintenance hotspot |
| `src/app/components/FormatMapTab.tsx` | Matrix, detail panel, suggestions and iterative AI tagging controls; useful sparse-data warnings |
| `src/app/review/[token]/page.tsx` | Mobile swipe review and decision screen; conflict and Sheet status handling issues |
| `src/app/api/radar/route.ts` | Cached GET and multi-provider search POST; hardcoded cached reach gate, hidden provider errors and whole-cache replacement |
| `src/app/api/breakdown/route.ts` | Candidate resolution, analysis/cache, label saving; accepts arbitrary AI key, incomplete input validation |
| `src/app/api/board/route.ts` | Board list/add/status/details/delete; detail updates default to saved and delete rewrites all rows |
| `src/app/api/keywords/route.ts` | Global brand switching and keyword edits |
| `src/app/api/team/route.ts` | Sheets-first roster reads and Supabase/Sheet writes; ignored sync failures and phone loss |
| `src/app/api/tracker/route.ts` | Sheet listing, daily counts, duplicate checks and append; fixed range and non-atomic deduplication |
| `src/app/api/format-map/route.ts` | Filters, matrix endpoint and paid tag batches; minimal numeric/input bounds |
| `src/app/api/cron/radar-scan/route.ts` | Daily keyword rotation, provider scans and merge; optional secret guard, only globally active brand |
| `src/app/api/review/route.ts` | Creates token review links from submitted candidate/analysis; trusts request origin for returned URL |
| `src/app/api/review/[token]/route.ts` | Intentionally public token read; no implemented expiration despite expired-link wording |
| `src/app/api/review/[token]/decide/route.ts` | Records decision and best-effort Sheet update; race and reconciliation gaps |
| `scripts/radar-run.ts` | Manual radar CLI; AHL defaults and 30-day YouTube window differ from UI; invokes analysis and writes storage |
| `scripts/tag-formats.ts` | Long-running format backfill outside serverless request budget; resumes from stored labels |
| `scripts/seed-board.ts` | Replaces board with two demo items; not a safe production migration; does not load dotenv itself |
| `scripts/test-keys.ts` | Manual live key/provider check; consumes search quota and prints key fragments |
| `scripts/test-sheets.ts` | Manual Drive/Sheet check that may create and format a spreadsheet; not read-only |
| `scripts/test-tracker-api.ts` | Manual local API test that appends a fake tracker record; no assertions or cleanup, undeclared direct import |
| `scripts/setup-sheet-formatting.ts` | Writes widths/status dropdowns/conditional formatting; status labels diverge from visual review |
| `scripts/setup-team-tab-in-sheets.ts` | Renames/creates tabs and writes default roster; rerunning can overwrite real roster rows |
| `scripts/add-tab-colors.js` | Writes tab titles/colors using fixed Sheet IDs |
| `scripts/check-sheet-content.js` | Reads sample Sheet rows using local service account |
| `scripts/inspect-tabs.js` | Reads spreadsheet/tab metadata |
| `scripts/list-drive-files.js` | Lists files in configured-by-code Drive folder |
| `scripts/get-vercel-env.js` | Prints full minified service-account credential for manual deployment; do not capture its output in shared logs |
| `scripts/clear-test-row.ts` | Clears `Sheet1!A2:R10`; stale tab name and destructive fixed range |
| `data/board.json` | Historical board snapshot, inspected structurally and for candidate/breakdown state |
| `data/brand_config.json` | Historical brand configuration |
| `data/ig_profiles_cache.json` | Historical creator cache |
| `data/keywords.json` | Historical six-keyword list |
| `data/radar_cache.json` | Historical eight-video radar snapshot |
| `data/search_cache.json` | Historical five-query snapshot |
| `data/team.json` | Historical three-member roster |
| `data/video_registry.json` | Historical 66-entry registry with embedded analysis/frame data; largest tracked data file |

Additional ignored files observed: `.env`, `service account.json`, `test_breakdown_out.json` (empty), `tsconfig.tsbuildinfo`, and `scratch/` (three MP4s, six distinct JPEG frame files). These are local credentials/generated or diagnostic artifacts, not active application modules. Dependency and build directories are generated material.

## Verification and limits

- App TypeScript: `node node_modules/typescript/bin/tsc --noEmit --incremental false` passed with exit code 0.
- Production build: `npm run build` passed with exit code 0 on retry with filesystem access, including compilation, type checking, page generation and build traces. Initial sandboxed attempt failed with an EPERM creating `.next/static/chunks/app`. Main page output: 37.3 KB route size, 125 KB first-load JavaScript; review page: 2.74 KB route size, 90 KB first-load JavaScript.
- All eight tracked JSON data files parsed successfully; local service-account JSON structure checked without exposing values.
- Initial Git working tree was clean; this review document is the only intentional source addition.
- External-service validity, live Supabase contents/RLS, deployment status, cron history, UI rendering and actual video/audio accuracy remain unverified. Code presence is not evidence that those services are currently operational.

## Suggested next implementation order

1. Correct evidence provenance, heuristic labels, duplicated-cover timelines and unsupported claims.
2. Establish admin/API authorization, rate limits, explicit database RLS and safe media input handling.
3. Make database writes honest and atomic; preserve analysis on metadata refresh; fix note-only updates.
4. Restore deliberate cache use and apply end-to-end deadlines/background jobs.
5. Align filters, canonical identity and brand ownership across the app.
6. Repair review conflicts/status matching and reliable Sheets reconciliation; remove fixed row ceilings.
7. Re-score stale data, restrict recommendations by evidence quality, and add targeted regression tests for the failures above.
8. Split the main dashboard into tab components and publish updated setup/handoff documentation.
