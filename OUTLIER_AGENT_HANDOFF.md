# Outlier Agent — Conversation Handoff

**Last updated:** 2026-10-17  
**Brand:** [American Hairline](https://americanhairline.com/) — non-surgical hair systems / hair patches for men (India)  
**Workspace:** `C:\Users\HP\Desktop\Outlier Agent`  
**Owner:** Vinitt (Software engineer)

Use this file to resume work in Antigravity (or any other agent). Do not paste API keys into chat; they live in `.env`.

---

## Problem

The social media team finds viral creators in the same niche (hair systems, men’s hair loss, patches, transplant alternatives), reverse-engineers why a video worked (script, style, audio, hooks), and remakes it for American Hairline.

That research is slow. The **Outlier Agent** automates discovery + breakdown so the team chooses what to shoot instead of hunting.

### What “outlier” means

Not “a big creator with lots of views.”  
A video that did **far better than that creator’s normal videos** (e.g. small account hits 800k while their median is 5k). Stronger signal than a big channel’s average post.

---

## Product decision (approved)

Build **both**:

1. **Discovery radar** — scheduled search finds recent niche outliers on YouTube + Instagram.
2. **Breakdown desk** — paste a Reel/YouTube URL (or open a radar hit) → hook, transcript, format, audio notes, comment themes, then **3 rewritten American Hairline scripts** (15s Reel, 30s Reel, YouTube Short; English/Hindi).

Team workflow board: **New → Approved to shoot → Shot → Posted** (avoid researching the same video twice).

### Brand voice / rewrite rules

- Keep the **structure** of the viral piece; change words, proof, and offer.
- Do **not** copy their script, face, or audio.
- Proof points to lean on: natural look, no surgery/side effects, trusted by many men / Bollywood angle, consultation CTA.
- Prefer formats the team can shoot: face-to-camera, before/after, text-on-screen. Skip formats that need the original creator’s face, exact audio, or a set they don’t have.

### Outlier scoring signals (planned)

| Signal | Meaning |
|--------|---------|
| Views ÷ creator’s median views | True outlier |
| Posted in last ~7 days | Still worth riding |
| Topic match | Hair system, patch, wig for men, hair loss, transplant alternative |
| Comment pattern | Price / “is it real?” / “where?” = buying intent |
| Shootable format | Face-cam, B/A, text overlays |

---

## Instagram vs YouTube (important technical fact)

- **YouTube:** Official **YouTube Data API v3** — real public keyword search. Suitable for full radar.
- **Instagram app** has clean public search (keywords, hashtags, Reels). **Meta’s Graph API does not expose that** the same way:
  - Hashtag search only (Business/Creator + app review)
  - ~30 unique hashtags / 7 days
  - Recent media often last 24h; Reels often excluded
  - No general keyword search across public Reels
- **Practical Instagram radar:** third-party Reels data API (Apify or HikerAPI), behind one interface so providers can be swapped.

**Do not** rely on Meta Graph hashtag search for the radar.

---

## API keys / env

### Current `.env` (user filled)

```
YOUTUBE_API_KEY=...
INSTAGRAM_API_KEY=...   # Apify API token (named INSTAGRAM_API_KEY)
```

**Security:** Keys were present in `.env`. Rotate if they were ever pasted into chat logs. Never commit `.env`. Add `.gitignore` with `.env` if missing.

### Verified working (2026-10-16 session)

| Provider | Status | Notes |
|----------|--------|--------|
| YouTube Data API | OK (HTTP 200) | Search `hair system men` returned items |
| Apify token | OK (HTTP 200) | User `jungle_yodeler` |
| Apify `apify/instagram-search-scraper` | OK | `searchType: "popular"` = popular reels; sample query `hair system` returned Reels with `videoPlayCount`, caption, owner, musicInfo, etc. |

### Getting keys again (if needed)

**YouTube (free, ~5 min)**  
1. [Google Cloud Console](https://console.cloud.google.com/) → create project  
2. Enable **YouTube Data API v3**  
3. Credentials → API key → restrict to YouTube Data API v3  
4. Default quota: ~**100 `search.list` / day** + 10k units for other calls (resets midnight PT). Design radar to stay under 100 searches/day.

**Instagram options**

| Option | Start cost | Role |
|--------|------------|------|
| **Apify** (chosen for now) | Free account + ~$5 monthly credit | Token in `INSTAGRAM_API_KEY`. Actors: search + single reel |
| **HikerAPI** | 100 free req after Telegram; then pay-as-you-go (~$1/1k; $100 first top-up) | Cleaner REST if Apify gets expensive/awkward |
| Meta Graph | Free + review | Skip for radar |

**Apify actors to use**

- Radar: `apify/instagram-search-scraper`  
  - Input: `search` (string), `searchType: "popular"`, `searchLimit` (int)  
  - Sample fields: `shortCode`, `url`, `caption`, `videoPlayCount`, `likesCount`, `commentsCount`, `ownerUsername`, `ownerFullName`, `timestamp`, `videoDuration`, `musicInfo`, `audioUrl`, `displayUrl`, `productType: "clips"`
- Breakdown (paste Reel URL): `apify/instagram-reel-scraper`  
  - Input field `username` accepts username **or** reel URL; options for transcript, shares, etc.

**Later (scripts):** Gemini / OpenAI / OpenRouter — not required for search scaffolding.

---

## Suggested architecture (not built yet)

Workspace was empty except `.env` when handoff started. Scaffold next.

```
outlier-agent/
  .env                 # YOUTUBE_API_KEY, INSTAGRAM_API_KEY
  .gitignore           # .env
  package.json
  src/
    providers/
      youtube.ts       # search + video/channel stats
      instagram.ts     # Apify popular reels + reel-by-url
    scoring/
      outlier.ts       # views vs creator median
    breakdown/
      analyze.ts       # transcript/hook/format + AH rewrite (LLM later)
    keywords.ts        # niche query list
    types.ts
  scripts/
    radar-run.ts       # one-shot / cron entry
  web/                 # optional UI: board + paste URL
```

### Starter niche queries (examples)

- hair system  
- hair system for men  
- hair patch  
- non surgical hair replacement  
- hair prosthesis / hair piece men  
- transplant alternative  
- (add Hindi / India-specific terms as team prefers)

### Daily radar shape for the team

~8–12 videos from last 7 days, each with:

- Why outlier (vs creator baseline + freshness)
- Hook (first 1–3s + on-screen text)
- Format type
- Audio notes
- Why it spread (short)
- 3 American Hairline remakes

---

## What was done in Cursor chat

1. Understood AH niche and social workflow.  
2. Proposed radar + breakdown + board; user approved **both**.  
3. Clarified Instagram: app search exists; official Meta API is not enough for keyword Reels radar.  
4. Documented YouTube + Apify/HikerAPI key steps.  
5. User added `YOUTUBE_API_KEY` + `INSTAGRAM_API_KEY` (Apify).  
6. Verified both keys; sample Apify popular-reels run succeeded and field map captured.  
7. **App not scaffolded yet** — next session should build providers + first radar CLI/UI.

---

## Resume checklist (Antigravity)

1. Read this file + `.env` (confirm keys still present; do not print them).  
2. Add `.gitignore` with `.env`.  
3. Scaffold Node/TypeScript (or Next.js if UI first) project.  
4. Implement `youtube` search + stats under daily quota.  
5. Implement Apify Instagram popular search + normalize to shared `OutlierCandidate` type.  
6. Run one local radar for AH keywords; print ranked list.  
7. Add paste-URL breakdown path (YouTube + Instagram reel scraper).  
8. Add LLM rewrite for AH scripts when an AI key is available.  
9. Simple UI board (New / Approved / Shot / Posted) + optional daily email/WhatsApp later.

---

## Open product choices (ask if unclear)

- Delivery: web app vs daily WhatsApp/email brief (lean web board + paste URL).  
- Primary language mix: English / Hindi / both.  
- Whether to keep Apify long-term or migrate Instagram to HikerAPI.  
- Exact keyword list from the social team.

---

## Links

- Brand: https://americanhairline.com/  
- YouTube API keys: https://console.cloud.google.com/  
- YouTube register app: https://developers.google.com/youtube/registering_an_application  
- Apify: https://apify.com/  
- Instagram Search Scraper: https://apify.com/apify/instagram-search-scraper  
- Instagram Reel Scraper: https://apify.com/apify/instagram-reel-scraper  
- HikerAPI (optional later): https://hikerapi.com/
