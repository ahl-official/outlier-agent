/**
 * Format x Editing Style taxonomy for the Format Map tab.
 *
 * Adapted from Kallaway's "Format Finder" skill (which uses Sandcastles' Collections) and narrowed
 * to what actually shows up in hair-system / topper / wig reels. A winning reel is two things
 * layered: the FORMAT is how the spoken words / story are organized (the script skeleton), the
 * EDITING STYLE is how it's filmed and cut. Separating them is the point - the same Before/After
 * can be a salon b-roll montage or a talking head with cutaways, and those are different videos.
 *
 * The AI tagger may only answer with these keys, so this file is the classifier: to add a label,
 * add it here (and to INCOMPATIBLE if needed) - never in the prompt or the UI.
 */

export interface TaxonomyEntry {
  key: string;
  label: string;
  /** one plain sentence for the explainer - assume the reader has never heard "b-roll" */
  what: string;
}

export const FORMATS = [
  { key: 'before_after_reveal', label: 'Before/After Reveal', what: 'Shows the bald or thinning look, then the finished hair - the contrast is the payoff' },
  { key: 'process_walkthrough', label: 'Process / Fitting Walkthrough', what: 'Takes you through the fitting, cutting or bonding step by step' },
  { key: 'client_testimonial', label: 'Client Testimonial', what: 'A real client tells their own story or verdict on camera' },
  { key: 'personal_story', label: 'Personal Story / Journey', what: 'My hair-loss struggle, the turning point, and where I am now' },
  { key: 'myth_bust', label: 'Myth-Bust', what: 'Takes a common belief ("patches look fake", "they fall off") and proves it wrong' },
  { key: 'common_mistake', label: 'Common Mistake / Warning', what: 'Most people get this wrong - here is what to avoid and the fix' },
  { key: 'comparison', label: 'A vs B Comparison', what: 'Two options side by side - patch vs transplant, lace vs skin, cheap vs premium' },
  { key: 'price_cost', label: 'Price / Cost Explainer', what: 'What it really costs and why, answering the money question head on' },
  { key: 'q_and_a', label: 'Q&A / FAQ', what: 'Answers one question people keep asking, often read from a comment' },
  { key: 'listicle', label: 'Listicle', what: '"3 things", "5 signs" - a numbered list counted through' },
  { key: 'tutorial_care', label: 'Care / Styling Tutorial', what: 'How to wash, style or maintain it yourself at home' },
  { key: 'day_in_life', label: 'Day in the Life / Behind the Scenes', what: 'A day at the salon or with a client, start to finish' },
  { key: 'reaction', label: 'Reaction', what: 'Reacts to someone else\'s clip, a celebrity, or a comment' },
  { key: 'skit_humor', label: 'Skit / Humor', what: 'An acted scene or relatable joke about hair loss' },
  { key: 'trend_lifestyle', label: 'Trend / Lifestyle Aesthetic', what: 'Rides a trending audio or vibe - the hair is shown, not explained' }
] as const satisfies readonly TaxonomyEntry[];

export const EDITING_STYLES = [
  { key: 'talking_head', label: 'Talking Head', what: 'One person talking to camera in a room, salon or car' },
  { key: 'talking_head_cutaways', label: 'Talking Head + Cutaways', what: 'Face to camera, cut with full-screen shots of the hair, the client or the work' },
  { key: 'broll_voiceover', label: 'B-roll + Voiceover', what: 'No face to camera - footage of the work with someone narrating over it' },
  { key: 'broll_music_text', label: 'B-roll + Music + Text', what: 'Footage set to music, with the story told in on-screen text, no voice' },
  { key: 'selfie_mirror', label: 'Selfie / Mirror POV', what: 'Phone in hand or in a mirror, filmed by the person themselves' },
  { key: 'split_screen', label: 'Split Screen', what: 'Two frames at once - before beside after, or face beside the thing' },
  { key: 'greenscreen', label: 'Greenscreen', what: 'Face over a photo, screenshot, comment or clip that stays up behind' },
  { key: 'street_interview', label: 'Street / Client Interview', what: 'Someone asked questions on the spot, interviewer off or on camera' },
  { key: 'podcast_clip', label: 'Podcast / Long-form Clip', what: 'A clip cut from a longer sit-down conversation' },
  { key: 'acted_scene', label: 'Acted Scene', what: 'Scripted, acted on location - one or more people playing parts' },
  { key: 'photo_slideshow', label: 'Photo Slideshow', what: 'Still photos one after another, often with text and music' }
] as const satisfies readonly TaxonomyEntry[];

export type FormatKey = (typeof FORMATS)[number]['key'];
export type EditingStyleKey = (typeof EDITING_STYLES)[number]['key'];

/** Combos that can't physically exist - never shown as white space. */
export const INCOMPATIBLE: ReadonlySet<string> = new Set([
  'reaction|broll_music_text', 'reaction|acted_scene', 'reaction|photo_slideshow', 'reaction|street_interview',
  'skit_humor|podcast_clip', 'skit_humor|photo_slideshow', 'skit_humor|greenscreen',
  'client_testimonial|acted_scene', 'client_testimonial|photo_slideshow',
  'day_in_life|podcast_clip', 'day_in_life|greenscreen', 'day_in_life|photo_slideshow',
  'process_walkthrough|podcast_clip', 'process_walkthrough|photo_slideshow', 'process_walkthrough|acted_scene',
  'tutorial_care|podcast_clip', 'tutorial_care|acted_scene', 'tutorial_care|street_interview',
  'personal_story|street_interview'
]);

export function isIncompatible(format: string, style: string): boolean {
  return INCOMPATIBLE.has(`${format}|${style}`);
}

const FORMAT_KEYS = new Set<string>(FORMATS.map((f) => f.key));
const STYLE_KEYS = new Set<string>(EDITING_STYLES.map((s) => s.key));

/** Accepts the model's answer (key or label, any casing) and returns a valid key, or null. */
export function normalizeFormatKey(value: unknown): FormatKey | null {
  return normalize(value, FORMAT_KEYS, FORMATS) as FormatKey | null;
}

export function normalizeEditingStyleKey(value: unknown): EditingStyleKey | null {
  return normalize(value, STYLE_KEYS, EDITING_STYLES) as EditingStyleKey | null;
}

function normalize(value: unknown, keys: Set<string>, entries: readonly TaxonomyEntry[]): string | null {
  if (typeof value !== 'string') return null;
  const raw = value.trim().toLowerCase();
  if (keys.has(raw)) return raw;
  const asKey = raw.replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  if (keys.has(asKey)) return asKey;
  const byLabel = entries.find((e) => e.label.toLowerCase() === raw);
  return byLabel ? byLabel.key : null;
}

/** The two allowed-value lists, ready to paste into an AI prompt. */
export function taxonomyPromptBlock(): string {
  const fmt = FORMATS.map((f) => `- ${f.key}: ${f.label} - ${f.what}`).join('\n');
  const sty = EDITING_STYLES.map((s) => `- ${s.key}: ${s.label} - ${s.what}`).join('\n');
  return `FORMAT (how the words/story are organized - pick exactly one key):\n${fmt}\n\nEDITING STYLE (how it is filmed and cut - pick exactly one key; label the dominant look):\n${sty}`;
}
