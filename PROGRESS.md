# Outlier Agent progress

This is the ongoing project log. Update it for every project task. Entries distinguish completed implementation, verification, and pending work. Dates use the user's Asia/Calcutta timezone.

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
