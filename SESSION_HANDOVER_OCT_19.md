# 📋 Outlier Agent — Complete Project Handover & Context (October 19, 2026)

> **Status:** 🟢 All systems operational, production-ready, TypeScript clean (0 errors), dev server running on `http://localhost:3001/`.

---

## 🏢 1. Brand Architecture & Keywords System

### **Brand 1: American Hairline (AHL) — Men's Systems**
* **Brand Focus:** Men's Non-Surgical Hair Systems, Hair Patches, Toupees & Grooming.
* **Keywords Managed:**
  * Hair patch for men
  * Toupee for men (and topee for men)
  * Clip-on hair patch for men
  * Men's hair patch without glue
  * Men's hair system
  * Hair patch for bald head
  * Men's toupee wig (and Men's topee wig)
  * Skin hair patch for men
  * Lace hair patch for men
  * Hair replacement patch for men
* **Categories:** `Core Hair Systems & Patches` and `Attachment, Base & Material Types`.

### **Brand 2: Alchemane — Women's Solutions**
* **Brand Focus:** Women's Hair Toppers, Clip-in Extensions, Human Hair Wigs & Volumizers.
* **5 Categorized Product Groups (23+ Keywords):**
  1. **Wigs:** Wigs for women, Human hair wigs for women, Lace front wigs for women, Monofilament wigs for women.
  2. **Hair Toppers:** Hair toppers for women, Human hair toppers for women, Silk base hair topper for women, Monofilament hair toppers for women, Clip-in hair toppers for women, Crown hair toppers for female thinning.
  3. **Permanent Extensions:** Tape-in hair extensions for women, Micro-ring hair extensions for women, Keratin bond hair extensions for women.
  4. **Clip-In & Temporary Extensions:** Clip-in hair extensions for women, Halo hair extensions for women, Ponytail hair extensions for women, Invisible clip-in hair extensions for women.
  5. **Bangs / Specialized Pieces:** Clip-on bangs for women, Human hair fringe for women, Hair patch for women, Volumizer hair extensions for women, Frontal hair piece for women.
* **Brand Switcher:** Instant toggle between AHL and Alchemane in header and `/api/keywords`.

---

## 🎯 2. Follower-to-Views Reach Ratio & Filtering Engine

### **Mathematical Formulation:**
$$\text{Reach Ratio} = \frac{\text{Total Views}}{\text{Creator Followers / Subscribers}}$$

* **Mega Breakout ($\ge 20\times$):** $+15$ pts bonus + `🚀 20x+ Reach` tag. (e.g. 500k views on 20k account = $25\times$).
* **Super Outlier ($\ge 10\times$):** $+12$ pts bonus.
* **Breakout Hit ($\ge 5\times$):** $+8$ pts bonus.
* **Viral Spillover ($\ge 2\times$):** $+4$ pts bonus.
* **Mega-Account Penalty ($< 0.2\times$):** $-12$ pts penalty (e.g. 1M views on 10M account = $0.1\times$).
* **Discovery Radar Filter Dropdown:**
  * `Reach Ratio: Any Ratio`
  * `Reach Ratio: 🚀 2x+ Followers (Viral Reach)`
  * `Reach Ratio: 🔥 5x+ Followers (Breakout Hit)`
  * `Reach Ratio: ⚡ 10x+ Followers (Super Outlier)`
  * `Reach Ratio: 👑 20x+ Followers (Mega Viral)`
* Real-time client-side filtering (`useMemo`) + Server-side query filtering in `/api/radar`.
* Video Card UI:
  * Creator row badge: `👥 20k followers` `🚀 25.0x Reach`
  * 4-Column stats grid: `VIEWS` | `REACH RATIO` | `LIKES` | `COMMENTS`

---

## 🔍 3. Frame-by-Frame Social Media Director Deep Dive

### **AI Multimodal Video Diagnosis:**
* **Model:** Google Gemini (`gemini-flash-latest`, fallback `gemini-2.5-flash-lite`).
* **Frame Analysis:** Inspects 12 sequential frames + audio waveform/music sync + text OCR.
* **Diagnostic Focus:**
  * Visual hook trigger & camera angle (Macro 90° top-down vs eye-level).
  * Pacing & narrative retention curve.
  * Audio mood & trending sound synergy.
  * Algorithmic distribution hypothesis.
* **Cleaned per user preference:** Removed all brand remake playbooks / SOP adaptation plays from the Deep Dive tab so the desk is 100% focused on pure competitor viral reverse-engineering.
* **Token Caching:** 72-hour cache in `data/video_registry.json` prevents duplicate API token consumption when revisiting videos.
* **Live UI Status:** Displays `🟢 🤖 Gemini AI Multimodal Audit Active` badge when fresh AI breakdown runs.

---

## 🛠️ 4. Active Ports, Keys & Files

* **Dev Server:** Running on `http://localhost:3001/` (task-321).
* **Environment (`.env`):**
  * `GEMINI_API_KEY`: Configured and live.
  * `YOUTUBE_API_KEY`: Configured.
  * `RAPIDAPI_KEY`: Configured for Instagram Reel scraping.
* **Key Codebase Files:**
  * [src/types.ts](file:///c:/Users/HP/Desktop/Outlier%20Agent/src/types.ts): Data models (`viewToFollowerRatio`, `minFollowerRatio`, `OutlierCandidate`, `DetailedOutlierBreakdown`).
  * [src/scoring/outlier.ts](file:///c:/Users/HP/Desktop/Outlier%20Agent/src/scoring/outlier.ts): Follower reach multiplier scoring logic.
  * [src/keywords.ts](file:///c:/Users/HP/Desktop/Outlier%20Agent/src/keywords.ts): AHL & Alchemane keyword definitions & category groupings.
  * [src/breakdown/analyze.ts](file:///c:/Users/HP/Desktop/Outlier%20Agent/src/breakdown/analyze.ts): Gemini multimodal video frame analysis.
  * [src/app/page.tsx](file:///c:/Users/HP/Desktop/Outlier%20Agent/src/app/page.tsx): Main dashboard (Radar, Deep Dive, Saved Library).
  * [src/app/globals.css](file:///c:/Users/HP/Desktop/Outlier%20Agent/src/app/globals.css): Dark glassmorphic design & 4-column card grid.

---

## 🚀 How to Resume Tomorrow
1. Check dev server: `http://localhost:3001/` (or run `npm run dev` if terminal was closed).
2. Continue researching outlier reels across American Hairline & Alchemane.
3. All code is committed and fully working with 0 build errors.
