# Outlier Agent progress

This is the ongoing project log. Update it for every project task. Entries distinguish completed implementation, verification, and pending work. Dates use the user's Asia/Calcutta timezone.

## 2026-11-11 — Added a separate tracker column for the six creative findings

- The tracker supports inserting Six Creative Findings in P, immediately after the verdict in O. Fresh saves and re-saves write the six numbered findings there. Review status, feedback, and last updated move to Q:S, and the app supports both layouts during rollout.
- All 11 tracker tests passed, including the shifted column positions and six-line export. The app deployment precedes the live sheet insertion.
- TypeScript passed. Commit `ed29a2f` was pushed to `main` and Vercel deployment `dpl_5gy11pH52ynaqPtNF5V3VMfQJS1L` reached Ready before the sheet changed. Backfilled rows 14–20 using saved findings, with a short verdict in O20. Verified the wrapped P column in Sheets, matched the shifted review cells to the original values and formats, and confirmed the production tracker API reads the new layout. Older rows without six saved findings are blank in P until reanalyzed and saved.

## 2026-11-11 — Added the executive verdict to tracker column O

- Renamed Outliers Tracker O1 and updated all 18 existing records in O2:O19. Twelve verdicts use saved creative observations. Six qualify the title or performance evidence because the saved analysis lacks specific visual findings. Preserved previous text in the cell notes and adjusted column O to wrap at a readable width.
- Deep Dive requests a separate 2–3 sentence verdict for tracker export and keeps the six findings in the report. Older reports export the strongest existing finding. All 31 tests and TypeScript passed. Read back the live sheet entries and checked the rendered layout.
- Pushed commit `f94459d` to `main`. Vercel production deployment `dpl_8mkkko8cevZXuUF4FubWJaF8rWt5` reached Ready. Verified the wrapped verdicts in Sheets after resizing column O.

## 2026-11-11 — Shortened the six creative findings for executive review

- New Deep Dive findings use one sentence each, up to 32 words. The shared prompt asks for a specific observed choice and an actionable filming, messaging, or editing takeaway, with six angles chosen from each video's evidence.
- Both provider paths validate sentence length and reject repeated wording within a report. Deep Dive regenerates cached reports that do not meet the new format when analysis is requested. The tracker exports new findings as six numbered lines plus the evidence source and can still read and save older reports.
- Verified 21 breakdown tests, 10 tracker tests, and TypeScript. No live sheet rows were rewritten.
- Pushed commit `62e0948` to `origin/main`. Vercel production deployment `dpl_4gcBwirGzXPLRUnViDpGHhMVYKXV` reached Ready, and the stable app URL returned HTTP 200. This production check covered deployment and availability.

## 2026-11-11 — Restored analysis in Outliers Tracker rows 14–19

- Rows 14–19 had valid submissions in A:R, but M:O held opening text, metadata, performance metrics, or `Not analyzed`. The previous duplicate check blocked a later Deep Dive export for the same video, and the client used metric fallbacks in the creative analysis column.
- Recovered evidence-backed reports for rows 14, 15 and 18 from saved records. Ran fresh video analysis for rows 16, 17 and 19. Row 19 hit Gemini HTTP 429 and completed through OpenRouter.
- Updated M:O and the last-updated field R for the six existing rows. Re-read the targeted cells, matched all exported findings against the source reports and checked that URLs, metrics and review fields were preserved. Verified the updated cells in the native Sheets UI. Existing column widths can clip the longer findings in the grid.
- The local app fix exports the observed visual hook, audio verification status and all six creative findings for a matching evidence-backed report. A subsequent Save to Google Sheet updates M:O and R on the existing row. Identical retries leave the row as-is, and duplicate saves without a completed analysis remain blocked. New metadata-only saves use explicit missing-analysis labels. Sheet writes confirm the URL and analysis fields in the response.
- Code: `src/tracker-analysis.ts`, `src/tracker-sheet.ts`, tracker POST route, dashboard save flow and tracker regressions. All ten tracker tests, TypeScript, the production build and diff checks passed. The live sheet backfill is complete. Publication follows the earlier request to push and deploy this analysis workflow.
- Published fix commit `ff62ee5` to `origin/main`. Vercel production deployment `dpl_33hi6jKeLnJR6RgiaBMS8AxAUx2j` is Ready. Verified the stable production URL served the new Save analysis to Google Sheet label and its tracker API returned all six repaired rows with their findings. The app update path was tested against a mock Sheets API. The production verification used read-only requests.

## 2026-11-10 — Publish the repaired video fallback

- Request: commit, push and deploy the tested Gemini-to-OpenRouter fallback repair.
- Scope: fallback/video compression, packaged media tools, safe failure diagnostics, regression tests, environment example and progress documentation. Portfolio output/generator remain separate local work.
- Validation carried forward: 20 breakdown tests, eight tracker tests, production build and diff checks passed; live OpenRouter video fallback succeeded with simulated Gemini quota rejection.
- Commit/push: `88d88ee` (`fix(analysis): repair OpenRouter video fallback and media processing`) pushed successfully to `origin/main`.
- Production deployment: Vercel built exact commit `88d88ee` on Linux and reported Ready. Deployment `dpl_CVFhrBCNGVDPDd7WJbs1SHpUiBhu`, URL `https://outlier-agent-15c2rrj4n-ai-americanhairs-projects.vercel.app`; stable production alias `https://outlier-agent-ai-americanhairs-projects.vercel.app`.
- Production verification: stable homepage returned HTTP 200 and app content; tracker GET returned success. Build logs confirmed dependency installation, compilation, type checking, page generation, function packaging and deployment completion.
- Verification limit: automatic approval review rejected a proposed forced production analysis using a deliberately invalid Gemini key, because it would overwrite a real persisted analysis. No such request ran. Used read-only production checks instead; the successful real-key OpenRouter video inference remains the prior local integration check, not a deployed inference claim.
- This follow-up documentation records confirmed results. Existing portfolio artifacts remain excluded from the fix.

## 2026-11-10 — Repaired Gemini-to-OpenRouter video fallback

- Request: fix unavailable video analysis while preserving the existing OpenRouter fallback after Gemini quota/request failure.
- Confirmed code defect: fallback accepted only two or more actual video frames, but the Vercel path lacked packaged FFmpeg/ffprobe. A downloaded video could therefore succeed with Gemini yet never reach OpenRouter after Gemini failed. GPT-4o mini is the image fallback, not a video-input model.
- Added a separate OpenRouter video path using the same downloaded bytes (or an actual YouTube link), `video_url` inputs and `OPENROUTER_VIDEO_MODEL` (default `google/gemini-2.5-flash-lite`, verified in the current official model catalog). Requests use the existing OpenRouter key. Preserved `OPENROUTER_MODEL` for a final timestamped-image fallback and kept audio unverified for that path.
- Actual integration uncovered another failure: the affected DO3nGtGkUT2 video downloaded successfully (16,916,803 bytes), but sending its original base64 payload returned OpenRouter HTTP 413. Added full-duration H.264/AAC compression above 8 MiB, with a bounded bitrate, size check and processing deadline. No clipping/truncation is used to fit the request. Failed compression can still fall back to actual samples.
- Installed `ffmpeg-static` and `ffprobe-static`; use system tools locally and packaged binaries when PATH tools are unavailable. Added Next.js external-package/runtime tracing configuration for Linux Vercel binaries. Actual frame extraction now has a serverless-capable path rather than a synthetic cover timeline.
- Gemini quota/auth failures switch providers promptly. OpenRouter auth, insufficient-credit and quota errors stop repeated requests with the same key. Missing-key, media HTTP/size/download, upload, malformed response and request timeout failures are saved as safe diagnostics in the report and shown under Analysis attempts and errors. Raw provider bodies, keys, signed URLs and base64 are excluded from diagnostics.
- OpenRouter-only deployments also share a single video download with frame extraction. Increased the report deadline to 240 seconds within the existing 300-second route allowance.
- Live verification: on the affected V Light video, with PATH cleared and a simulated Gemini 429, the actual configured OpenRouter key returned six reasons and the specific opening observation: hands holding an extension strand and scissors. Model: OpenRouter google/gemini-2.5-flash-lite + video. The initial 413 failed probe and the successful compressed retry are distinguished; Gemini's real quota was not intentionally consumed. No live Sheet/registry records were overwritten. Evidence saved locally in ignored `scratch/verified-openrouter-video.json`.
- Validation: all 20 breakdown tests and eight tracker tests passed. Added a real packaged-binary regression with PATH empty: compression retained the complete four-second fixture and its audio stream, stayed below the request budget, and produced three distinct timestamped video samples. Final production build passed compilation, type checking, page generation and build tracing; `git diff --check` passed. The first sandbox build hit EPERM creating a Next.js directory; the verified build ran outside that filesystem sandbox. Linux-specific tracing is configured for Vercel; a Linux deployment has not yet been exercised.
- Files: `src/breakdown/hook-analysis.ts`, `ffmpeg.ts`, `analyze.ts`, `src/types.ts`, `src/app/components/AnalysisEvidence.tsx`, Next configuration, package manifests, `.env.example`, `tests/breakdown.test.ts`, and this log.
- Commit/push/deployment: local implementation only; no new commit/push requested. Existing saved Sheet cells remain historical snapshots; this repair takes effect for new analyses after deployment. Earlier portfolio artifacts remain separate local work.
- Provider references checked: official OpenRouter video-input documentation and current `/api/v1/models` catalog.

## 2026-11-10 — Investigated V Light analysis change after row 29

- Request: compare V Light Extension columns M/O before and after row 29 and explain the Video analysis unavailable notice.
- Read live `V Light Extension` (sheet ID 87205930), A1:R45, including values/formulas and cell notes. No cell notes were present in this inspected range; the reported unavailable notice is consistent with the application evidence panel.
- Findings: all 28 entries in rows 2:29 use only three hook descriptions (17 crown-reveal, eight scalp/hairline and three macro-comb descriptions). Older O cells repeat template narratives, including unsupported 90%+ completion and algorithm claims. These older detailed entries are not verified video evidence.
- Rows 30:45: 15 O cells contain the current metrics-only baseline explanation; O30 is blank. Nine M cells contain None or Opening text not verified. These are saved literal values, not broken formulas.
- Read backend registry reports for five representative videos without running new AI analysis or modifying backend data. Row 29's legacy report lacks analysisVersion and frame-source provenance, despite its old ffmpeg_multimodal_analyzed label. Row 30 has a successful version-2 Gemini video analysis with six reasons but no extracted timeline frames. Rows 31, 44 and 45 have unavailable status, only a cover thumbnail, zero video samples and no six-reasons analysis. Candidate direct-video URLs exist, but that alone does not prove they were downloadable or accepted by the model.
- Code trace: unavailable analyses deliberately retain numerical provider metrics and omit creative verdicts. Media download, Gemini upload/model errors, missing actual samples and the outer deadline can collapse into a generic unavailable status; exact historical provider failure cannot be recovered from the saved report alone. No production logs were available in this investigation.
- Separate export issue: older saves selected the text headline for column M; the latest pushed handler prefers the visual hook and six-reasons paragraph, then falls back to metrics if unavailable. Existing sheet cells are snapshots and are not backfilled automatically, explaining why a successful stored report can coexist with incomplete exported cells such as O30.
- No live sheet edits or application code changes in this investigation. Next work: capture specific media/provider failure diagnostics, verify one affected video's current download/model path, then regenerate and explicitly backfill evidence-backed M/O findings. Preserve the distinction between measured performance and creative hypotheses.
- Validation: live bounded cell comparison, historical/current source inspection and read-only backend evidence checks. Progress log updated locally; no commit/push requested.

## 2026-11-10 — Removed existing tracker duplicates and preserved prevention

- Request: keep the existing duplicate-entry prevention unchanged and remove duplicate records from the connected sheet.
- Inspected the tracker POST handler and `normalizeVideoUrl`: existing normalized platform/video identity checks still reject a previously logged video before inserting. No application code changed.
- Live target: `Outliers Tracker` (sheet ID 0) in the configured backend workbook. Identified 21 extra records across three Instagram video IDs. All duplicate records had identical non-timestamp fields, Pending Review status, no feedback/notes/chips and no overflow data. Kept the first record of each video, preserving original attribution and timestamp.
- Saved a pre-cleanup snapshot in ignored `scratch/tracker-before-dedup-2026-11-10.json`. Re-read live cells immediately before deletion and confirmed the snapshot still matched. Deleted original rows 29:41, 21:27 and 19 in one descending-index batch. Other tabs were untouched.
- Verification: 38 records reduced to 17 unique videos with zero duplicates. Compared all retained cell values, notes, chips and validation against the original snapshot; they match exactly. Confirmed no additional Video URLs in F61:F1088. Native Sheets visual check confirmed yellow header, plain body rows and retained fixed widths; some existing long text remains clipped at those intentionally preserved widths.
- Commit/push: this task changes the live sheet and this local progress log only; no new commit or push requested. Prior backend fix remains pushed as `ac47a15` with follow-up log commit `1e305c1`. Latest deployment verification remains outstanding.

## 2026-11-10 — Repaired Outliers Tracker saving and simplified the live sheet

- Request: fix new outliers not saving in the backend-connected tracker tab; keep only the header yellow and all data/new rows unfilled.
- Confirmed configured workbook `AHL Outliers Daily Tracker - Social Media Team`, tab `Outliers Tracker`, sheet ID 0. Other product tabs and the team roster were left unchanged.
- Root cause confirmed through a live deployed-API write: the old broad `values.append` call was selecting a detected table starting in column R, writing complete new records into R:AI instead of A:R. The normal tracker reader then missed their Video URLs because it only inspected column F.
- Recovered 26 misplaced records from R18:AI43 into A18:R43. Verified destination cells A:Q were empty, sources were literal values without formulas/chips, copied every original value in one batch, then cleared only the old overflow values in S:AI. Source/destination equality was checked. Repeated user save attempts were preserved rather than silently deduplicated.
- Final verified sheet state: 38 saved entries, 17 unique video URLs, zero misplaced video entries in column W and zero temporary connection-check markers.
- Live styling: removed three conditional fill rules; cleared body-row fills and restored readable black text; changed row 1 to yellow with black bold text; removed the tracker tab color. Existing values, dropdown validation and fixed column widths were preserved. Verified the yellow header/plain rows in the native Google Sheets browser view and through effective cell formats.
- Added `src/tracker-sheet.ts`: resolve the exact tab/schema; read through its metadata-derived grid bound; insert a row after the last actual Video URL; explicitly write 18 columns starting at A; clear any inherited body fill; confirm the written URL from the atomic batch response. A full grid grows safely by one row. No broad values.append table-detection heuristic is used by the new path.
- Tracker GET now counts actual video records, reports missing credentials as unavailable, and no longer truncates reads at row 1000. Approval matching uses the same bounded reader.
- UI library saves now await tracker sync and surface failures; save confirmations include the exact sheet row. Prevented an unrelated previous video's breakdown from being attached to a newly saved candidate; absent analysis remains labeled as unavailable instead of receiving a generic invented hook/audio strategy.
- Updated `scripts/setup-sheet-formatting.ts` to preserve the simple yellow-header/plain-body policy on future runs.
- Validation: eight tracker regression tests passed; production build passed, including type checking and page generation; `git diff --check` passed. The revised API was exercised with a temporary row using the backend service account, confirmed in A14:R14 with a plain background, then removed with all original values preserved. Two tests of the old deployed API confirmed the R:AI misalignment; both temporary probes were identified by unique markers and removed without deleting user records.
- Commit/push: user approved; committed as `ac47a15` (`fix(tracker): anchor saves to column A and keep rows unfilled`) and pushed to `origin/main`. Verified the remote main branch directly with `git ls-remote`; it points to `ac47a15993efca0e9382031b70d642d22f2baa32`.
- Deployment: completion remains unverified. The old deployment-specific URL retains its original code; use the latest Vercel deployment containing this commit.
- Files: `src/tracker-sheet.ts`, tracker/review API routes, `src/app/page.tsx`, `scripts/setup-sheet-formatting.ts`, `tests/tracker.test.ts`, `package.json`, and this log. PDF artifacts/generator from the previous task remain separate local work.

## 2026-11-10 — Personal project portfolio and interview PDF

- Request: create a comprehensive project-details PDF for personal achievements and future interviews.
- Personalization confirmed by the user: **Sushant - AI Intern; all project work completed individually**. The handbook presents end-to-end individual ownership without inventing employer details, experience dates or business-impact metrics.
- Created `output/pdf/Sushant_Outlier_Agent_Project_Portfolio.pdf`: 21 pages covering the business problem, five product modules, architecture diagram, discovery/scoring/baselines, multimodal evidence pipeline, repeated-frame debugging case study, Format Map, eight-table data model, API inventory, operations, validation, personal contributions, interview pitches, STAR story, 12 interview questions/answers, resume wording, demo plan, roadmap and setup/source appendix.
- Included explicit distinctions between implemented behavior, verified results and remaining work. Recorded the successful six-frame live check and the Gemini upload/audio verification limitation accurately.
- Added 21 navigation bookmarks, clickable source links, embedded fonts, consistent typography, page numbers and a personalized cover. Excluded credential values, private contact details and production Sheet IDs.
- Editable text is saved alongside the PDF as `output/pdf/Sushant_Outlier_Agent_Project_Portfolio.md`. Reproducible generator: `scripts/create-project-portfolio.py` (ReportLab; Windows Arial fonts).
- Validation: confirmed 21 pages, 21 bookmarks and 4 hyperlinks with pypdf; extracted text with pdfplumber; checked page bounds, expected name/role, key facts and absence of private values. Rendered all 21 pages with bundled Poppler, reviewed contact sheets, and inspected final detailed renders after formatting corrections. Final PDF size: 154,392 bytes; approximately 5,407 words.
- No application code or external services were changed. Generated documentation and this log update are local and uncommitted. Latest pushed application/documentation snapshot remains `edf3c9e`.

## 2026-11-10 — Commit and push analysis corrections

- Request: commit and push the completed Deep Dive analysis fixes.
- Scope: evidence-aware analysis, removal of synthetic frames/verdicts, large-video handling, regression tests, progress instructions, this running log and the detailed project review.
- Validation: the previous implementation task passed 13 regression tests and the production build, and verified six distinct frames from the supplied Instagram video. Rechecked `git diff --check` before staging.
- Commit: `3528b6d` — `fix(analysis): require real video evidence and remove synthetic frames` (17 files).
- Push: succeeded to `origin/main`; Git confirmed `55ad3ca..3528b6d main -> main`. This follow-up documentation records that confirmed result.
- Deployment: not verified; the older deployment-specific URL does not automatically become the current deployment.

## 2026-11-10 — Corrected repeated frames and unsupported analysis claims

- Request: Deep Dive displayed the same image at multiple timestamps and appeared not to analyze the video properly.
- User's verification video: `https://www.instagram.com/p/DRu3u9cEbX9/`.
- Confirmed the root cause in code: the cover fallback returned four copies of the same image with invented timestamps, retention percentages and a fabricated expert verdict labeled as FFmpeg multimodal analysis.
- Removed synthetic cover timelines, unverified YouTube-thumbnail/carousel timestamps, preset retention scores, heuristic visual/audio verdicts, template camera/scene timelines, unsupported audience themes and synthetic viral scores.
- Actual FFmpeg samples now carry explicit video-frame provenance and measured timestamps. Duplicate images are removed. Cover fallback returns at most one image with no timestamp, trigger or score.
- Replaced the old frame-stream panel with an evidence panel that distinguishes actual video supplied to AI, sampled-frame analysis, cover-only previews and unavailable analysis. Updated the enlarged image preview and failure toast accordingly.
- Real AI output is required for creative findings. Cover-only input cannot produce a six-reasons report. Sample-only analysis explicitly marks audio as unverified, even if a model supplies an audio claim.
- Added analysis version 2 so old cached reports with synthetic evidence are reanalyzed rather than reused.
- Added direct YouTube video-link input for Gemini, and a bounded Gemini Files API upload/processing/cleanup path for large videos. Instagram media is shared between frame extraction and AI to avoid duplicate downloads. Download limit is now 64 MiB for Deep Dive; Format Map retains its 18 MiB/20-second inline behavior.
- Live diagnosis: provider returned a 134-second video with a direct MP4 response of 36,508,516 bytes. This exceeded the old 18 MiB inline cutoff. Larger-video download/processing budgets and the breakdown route limit were increased; the route now requests 300 seconds, supported by Vercel Fluid Compute. Actual project Fluid Compute settings remain unverified.
- Live verification: retrieved the supplied video, extracted six distinct actual frames at `00:00.00`, `00:01.50`, `00:47.01`, `01:20.58`, `01:50.13` and `02:13.90`, and generated six creative findings through OpenRouter GPT-4o mini. Visually inspected the first and last frame; they show different moments from the supplied video.
- Live limitation: Gemini large-file preparation timed out from this machine. Full video/audio analysis was not verified; the successful report correctly identifies itself as sampled-frame analysis and states that audio was unavailable. Gemini file upload success/failure and cleanup are covered by mocked regression tests.
- Validation: 13 targeted tests passed, covering duplicate covers, unavailable/media-invalid paths, large video downloads/uploads/cleanup, YouTube links, audio provenance, stale report rejection and rendered evidence UI. Production build passed after the large-file and request-budget additions, including app type checking and page generation. `git diff --check` passed. The production browser UI has not been deployed or visually tested with this change.
- Files: `src/breakdown/{analyze,ffmpeg,hook-analysis,social-agent,evidence,gemini-video,format-tagger}.ts`, `src/types.ts`, `src/app/api/breakdown/route.ts`, `src/app/components/AnalysisEvidence.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `tests/breakdown.test.ts`, `package.json`, and this log.
- Local diagnostics and downloaded frame previews are in git-ignored `scratch/`; no credential values were printed or stored in tracked documentation. Live scraping/AI calls were made for the user-supplied public video; no database/Sheet writes, WhatsApp sends or deployment occurred.
- Commit/push status: implementation and documentation remain local and uncommitted; latest pushed commit is still `55ad3ca`.

## 2026-11-10 — Investigated missing Deep Dive loading on deployed app

- Request: loading text/animation still not visible in Deep Dive.
- User-provided URL: `https://outlier-agent-d78grwf73-ai-americanhairs-projects.vercel.app/`.
- Confirmed the local checkout and pushed commit `55ad3ca` contain the loading panel, spinner CSS, busy/status semantics and error feedback.
- Opened the supplied URL in the browser and inspected its radar and Deep Dive screens. The navigation lacks the Format Map tab present in the current repository, establishing that this deployment serves older application code.
- Diagnosis: the user is opening an older deployment-specific URL; pushing the source did not update the version served at that URL. No additional application code change was made.
- Next action: open the latest successful deployment from the Vercel project's dashboard and use its current production URL. The latest deployment's address/status and loading behavior still need verification.
- Browser limitation: further computer inspection stopped because the tool could not confidently determine the native Chrome browser's current URL. No authentication or deployment action was attempted.
- Validation: inspected deployed navigation and Deep Dive idle state; did not run a paid analysis or mutate external data.
- Commit/push status: no new commit or push; this progress update remains local with the other documentation files.

## 2026-11-10 — Persistent progress documentation

- Request: record all project progress in a Markdown file every time.
- Added this running log with the current session's analysis, implementation, validation and push history, plus earlier milestones from Git history.
- Added `AGENTS.md` so future project work follows the same documentation requirement.
- Detailed repository analysis remains in [PROJECT_REVIEW_2026-11-10.md](PROJECT_REVIEW_2026-11-10.md).
- Validation: reviewed the documentation against the observed Git history and completed task results. No application code changed in this documentation task.
- Commit/push status: these documentation files and the detailed review are currently local and uncommitted. Latest pushed application commit is `55ad3ca` on `origin/main`.

## 2026-11-10 — Commit and push Deep Dive changes

- Request: commit and push the Deep Dive loading improvements.
- Committed only `src/app/page.tsx` and `src/app/globals.css`; the separate review document was left local.
- Commit: `55ad3ca` — `fix(deep-dive): show clear loading and error states`.
- Push: succeeded to `origin/main` at `https://github.com/ahl-official/outlier-agent.git`.
- Validation: Git reported `465da8e..55ad3ca main -> main`; two application files changed.
- Deployment: not checked; a successful push does not establish a successful deployment.

## 2026-11-10 — Clear Deep Dive loading and failure feedback

- Request: make it obvious that a newly selected video's Deep Dive analysis is loading.
- Added a prominent loading panel with a spinning icon, the requested video title/URL, waiting instructions and animated skeleton lines.
- Cleared the previous analysis, selected candidate and frame preview when starting a new analysis so stale content cannot look like the new result.
- Disabled the URL input and prevented another analysis from starting while the current request is running.
- Kept the requested URL in the input for retries, including videos selected from the radar/examples.
- Added persistent failure feedback and instructions to retry with Get Deep Dive.
- Added accessible busy/status/error semantics and reduced-motion support. Defined the shared `.spin` animation, which existing spinner icons referenced without a CSS definition.
- Files: `src/app/page.tsx`, `src/app/globals.css`.
- Validation: `node node_modules/typescript/bin/tsc --noEmit --incremental false` passed; `git diff --check` passed. No live AI call or browser rendering check was performed for this change.
- Commit/push: completed in `55ad3ca`; see the entry above.

## 2026-11-10 — Repository progress and file analysis

- Request: understand project progress and analyze all files.
- Inspected all 66 tracked files, application/API structure, scripts, configuration, Git history, dependency lockfile and all eight JSON data snapshots.
- Checked credential configuration presence/structure without exposing secret values; inventoried ignored diagnostic media without visually evaluating it.
- Produced [PROJECT_REVIEW_2026-11-10.md](PROJECT_REVIEW_2026-11-10.md), including a file-by-file inventory, implemented features, historical milestones, prioritized findings and verification limits.
- Assessment: substantial functional MVP; production readiness remains unverified.
- Implemented areas: dual-brand radar, creator baselines, AI analysis, saved library, team/Sheets tracker, WhatsApp handoff, token review links, Format Map and daily cron configuration.
- Main findings: unreliable analysis provenance; missing administrative API access controls/rate limits; silent storage errors and non-atomic replacements; incomplete request deadlines; forced cache bypass; registry refreshes overwriting stored analyses; inconsistent follower filters; notes resetting board status; approval/disapproval display errors; identity normalization gaps; fragile Sheets/team sync; shared global brand state; media-input risks; missing automated regression suite.
- Local JSON snapshots date mainly to October 20–21 and are no longer read by application storage. Supabase is the current source of truth; live contents were not checked.
- Validation: TypeScript passed. Production build passed after retrying outside the filesystem sandbox; the first attempt hit an EPERM creating a `.next` output directory. All eight JSON snapshots parsed. Confirmed every tracked file appears in the review inventory.
- Limits: no live provider/AI requests, database/Sheet mutations, WhatsApp sends, deployment checks, or UI visual verification.
- Commit/push: review document remains local and uncommitted.

## Earlier milestones — Reconstructed from Git history

These summarize repository history, not fresh integration verification.

| Date | Commit | Progress |
| --- | --- | --- |
| 2026-11-02 | `465da8e` | Increased scraper limits and added browser-local seen-video tracking |
| 2026-10-31 | `a504218` | Added per-video creator baselines and baseline-method metadata |
| 2026-10-31 | `80cbc84` | Enabled YouTube-link Format Map tagging and capped extreme multiplier display |
| 2026-10-31 | `ff68b52` | Added Format × Editing Style map, white-space suggestions and picks |
| 2026-10-27 | `f2b3e5a` | Added stronger topic relevance rejection |
| 2026-10-26 | `2be48da` | Included original video links in WhatsApp visual-review messages |
| 2026-10-26 | `c497ca7` | Added six-reasons AI analysis and swipeable leadership review |
| 2026-10-23 | `4df75cf` | Migrated storage to Supabase and added scheduled radar scans |
| 2026-10-23 | `31fb5e4` | Improved Instagram profile fetching, reduced Apify cost and added evergreen fallback |
| 2026-10-23 | `7bf0482` | Lowered discovery thresholds to include smaller creators |
| 2026-10-22 | `f6aa2b0` | Ran provider searches in parallel and corrected follower-filter behavior |
| 2026-10-22 | `0bca49f` | Sanitized Instagram queries and added core-term fallback |
| 2026-10-22 | `62d4150` | Added cloud frame fallback and cascading discovery windows |
| 2026-10-22 | `e1a0360` | Improved Google credentials handling and live tracker feed |
| 2026-10-21 | `fe5b33f` | Added WhatsApp handoff, Sheets tracker and team quota management |
| 2026-10-20 | `1e518cf` | Added adaptive whole-video keyframe sampling |

## Outstanding work

The findings below were identified in the review and have not been fixed by the loading-state change:

1. Verify the new Gemini large-file path and full-video/audio analysis on the deployed app. Synthetic cover timelines, heuristic visual verdicts and unsupported metrics were removed locally in the latest task; live verification succeeded using actual sampled frames.
2. Add administrative/API access controls, rate limits and explicit database RLS; harden media inputs.
3. Make persistence failures visible, use atomic/per-record writes, preserve analyses during scans and preserve status during notes edits.
4. Restore intentional cache use and enforce end-to-end deadlines or move long tasks to background jobs.
5. Align unknown-follower handling, canonical video identity and explicit brand ownership.
6. Fix review conflict/disapproval handling and reliable Sheets reconciliation; remove fixed row limits.
7. Re-score stale data and apply evidence-quality rules to Format Map recommendations.
8. Add targeted regression coverage, split the large dashboard and update setup/handoff documentation.

Full evidence and file references are in the detailed review. Future entries should record which items are actually resolved.
