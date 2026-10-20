export interface KeywordGroup {
  category: string;
  keywords: string[];
}

export const AHL_SPECIFIC_KEYWORDS: string[] = [
  'Hair patch for men',
  'Toupee for men',
  'Topee for men',
  'Clip-on hair patch for men',
  "Men's hair patch without glue",
  "Men's hair system",
  'Hair patch for bald head',
  "Men's toupee wig",
  "Men's topee wig",
  'Skin hair patch for men',
  'Lace hair patch for men',
  'Hair replacement patch for men'
];

export const AHL_CATEGORY_GROUPS: KeywordGroup[] = [
  {
    category: 'Core Hair Systems & Patches',
    keywords: [
      'Hair patch for men',
      'Toupee for men',
      'Topee for men',
      "Men's hair system",
      'Hair patch for bald head'
    ]
  },
  {
    category: 'Attachment, Base & Material Types',
    keywords: [
      'Clip-on hair patch for men',
      "Men's hair patch without glue",
      'Skin hair patch for men',
      'Lace hair patch for men',
      "Men's toupee wig",
      "Men's topee wig",
      'Hair replacement patch for men'
    ]
  }
];

export const ALCHEMANE_CATEGORY_GROUPS: KeywordGroup[] = [
  {
    category: '1. Wigs',
    keywords: [
      'Wigs for women',
      'Human hair wigs for women',
      'Full wigs for women',
      'Chemotherapy wigs',
      'Cancer wigs for women',
      'Wigs for women with hair loss',
      'Natural-looking wigs for women',
      'Glueless wigs for women',
      'Full lace wigs',
      'Wigs for alopecia',
      'Medical wigs for women',
      'Grey hair wigs for women'
    ]
  },
  {
    category: '2. Toppers',
    keywords: [
      'Hair toppers for women',
      'Hair topper',
      'Hairline toppers for women',
      'Hairline patches for women',
      'Hair toppers for thinning hair',
      'Crown hair toppers',
      'Silk base hair toppers',
      'Lace top hair toppers',
      'Clip-in hair toppers',
      'Hair toppers for widening parting',
      'Hair toppers for alopecia',
      'Natural-looking hair toppers',
      'Hair toppers for women with thin hair',
      'Front hair toppers',
      'Hair toppers before and after'
    ]
  },
  {
    category: '3. Permanent & Semi-Permanent Hair Extensions',
    keywords: [
      'Hair extensions',
      'Permanent hair extensions',
      'Semi-permanent hair extensions',
      'Professional hair extensions',
      'Tape-in hair extensions',
      'Invisible tape-in hair extensions',
      'V-Light hair extensions',
      'K-tip hair extensions',
      'I-tip hair extensions',
      'Keratin bond hair extensions',
      'Nano ring hair extensions',
      'Micro ring hair extensions',
      'Genius weft hair extensions',
      'Sew-in hair extensions',
      'Weft hair extensions',
      'Feather hair extensions',
      'Beaded row hair extensions',
      'Hand-tied weft extensions',
      'Invisible bead extensions',
      'Hair extensions for thin hair',
      'Hair extensions for short hair',
      'Natural-looking hair extensions',
      'Damage-free hair extensions',
      'Hair extensions before and after'
    ]
  },
  {
    category: '4. Clip-On Hair Extensions',
    keywords: [
      'Clip-on hair extensions',
      'Clip-in hair extensions',
      'Clip-on extensions for women',
      'Human hair clip-in extensions',
      'One-piece clip-in hair extensions',
      'Clip-in extensions for thin hair',
      'Clip-in extensions for short hair',
      'Clip-in extensions for volume',
      'Clip-in extensions for length',
      'Clip-in ponytail extensions',
      'Halo hair extensions',
      'Temporary hair extensions',
      'DIY hair extensions at home',
      'Easy-to-apply hair extensions',
      'Natural-looking clip-in extensions',
      'Clip-in extensions before and after'
    ]
  },
  {
    category: '5. Fringe & Bangs Extensions',
    keywords: [
      'Fringe extensions',
      'Bangs extensions',
      'Clip-on bangs for women',
      'Clip-in fringe extensions',
      'Fake bangs for women',
      'Human hair fringe extensions',
      'Curtain bangs extensions',
      'Wispy bangs clip-in',
      'Side-swept bangs extensions',
      'See-through bangs extensions',
      'Clip-on front hair extensions',
      'Fringe for thinning front hair',
      'Bangs without cutting hair',
      'Clip-in bangs before and after',
      'Natural-looking fringe extensions'
    ]
  }
];

export const ALCHEMANE_SPECIFIC_KEYWORDS: string[] = ALCHEMANE_CATEGORY_GROUPS.flatMap((g) => g.keywords);

export const DEFAULT_RADAR_KEYWORDS: string[] = AHL_SPECIFIC_KEYWORDS;

export const NICHE_KEYWORD_GROUPS = AHL_CATEGORY_GROUPS;
