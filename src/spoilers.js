const SIX = "(?:6|vi|six|ⅵ|六|٦|۶|६)";
const AND = "(?:and|&|n|y|i|e|et|und|и|і|と|和|과|와|و)";
const DIES = `(?:${[
  "dies|died|dying|death|dead|killed|kills|murdered|ending|endings|betrayal|betrays|betrayed|fate|arrested|jailed",
  "muere|murió|muerte|final|traición",
  "meurt|mort|fin|trahison",
  "stirbt|tod|ende|verrat",
  "muore|morte|tradimento",
  "morre|morreu",
  "ginie|zginął|zginie|śmierć|umiera|zakończenie|zdrada",
  "умирает|умер|умрет|смерть|концовка|предательство",
  "ölüyor|ölümü|sonu",
].join("|")})`;

const EXPLICIT_TERMS = {
  title: [
    ["gta", SIX],
    ["grand", "theft", "auto", SIX],
    ["гта", SIX],
    ["グランド", "セフト", "オート", SIX],
    ["グラセフ", SIX],
    ["侠盗猎车手", SIX],
    ["俠盜獵車手", SIX],
    ["그랜드", "테프트", "오토", SIX],
    ["جي", "تي", "[اأ]ي", SIX],
    ["جراند", "ثفت", "[اأ]وتو", SIX],
    ["जीटीए", SIX],
    ["rockstar", "(?:6|vi)"],
  ],
  characters: [
    ["jason", "duval"],
    ["lucia", "caminos"],
    ["jason", AND, "lucia"],
    ["lucia", AND, "jason"],
    ["джейсон", AND, "лю[сч]ия"],
    ["ジェイソン", AND, "ルシア"],
    ["杰森", AND, "露西亚"],
    ["제이슨", AND, "루시아"],
    ["cal", "hampton"],
    ["boobie", "ike"],
    ["dre", "quan", "priest"],
    ["real", "dimez"],
    ["raul", "bautista"],
    ["brian", "heder"],
  ],
  places: [
    ["leonida"],
    ["レオニダ"],
    ["莱昂尼达"],
    ["레오니다"],
    ["vice", "city"],
    ["вайс", "сити"],
    ["バイス", "シティ"],
    ["罪恶都市"],
    ["罪惡都市"],
    ["바이스", "시티"],
    ["port", "gellhorn"],
    ["grass", "rivers"],
    ["mount", "kalaga"],
  ],
  spoilers: [
    ["(?:jason|lucia)", DIES],
    ["(?:джейсон|лю[сч]ия)", DIES],
  ],
};

const FRANCHISE_TERMS = [
  ["gta(?:v|iv|o|sa|vc)?"],
  ["grand", "theft", "auto"],
  ["гта"],
  ["グラセフ"],
  ["グランド", "セフト", "オート"],
  ["侠盗猎车手"],
  ["俠盜獵車手"],
  ["그랜드", "테프트", "오토"],
  ["جي", "تي", "[اأ]ي"],
  ["जीटीए"],
  ["rockstar", "games"],
  ["rockstar['’]s"],
];

const SEP = "[\\s\\-_.+:'’#·•・]*";
const LETTER = "[\\p{Script=Latin}\\p{Script=Cyrillic}\\p{Script=Greek}]";
const WORD_CHAR = `(?:${LETTER}|\\p{N})`;
const START = `(?<!${WORD_CHAR})`;
const INVISIBLE = /[\u00AD\u200B-\u200D\u2060\uFEFF]/g;

const compile = (terms, end) =>
  new RegExp(
    terms.map((words) => START + words.join(SEP) + end).join("|"),
    "iu",
  );

const EXPLICIT = compile(
  Object.values(EXPLICIT_TERMS).flat(),
  `(?!${WORD_CHAR})`,
);
const FRANCHISE = compile(FRANCHISE_TERMS, `(?!${LETTER})`);

const ROCKSTAR_SOURCES = [
  /^https?:\/\/(?:www\.)?rockstargames\.com(?:[/?#]|$)/i,
  /^https?:\/\/(?:www\.|m\.)?youtube\.com\/(?:@|c\/|user\/)rockstargames(?:[/?#]|$)/i,
  /^https?:\/\/(?:www\.|mobile\.)?(?:x|twitter)\.com\/rockstargames(?:[/?#]|$)/i,
  /^https?:\/\/(?:www\.)?(?:instagram|facebook|threads)\.(?:com|net)\/@?rockstargames(?:[/?#]|$)/i,
  /^https?:\/\/(?:www\.)?tiktok\.com\/@rockstargames(?:[/?#]|$)/i,
  /^https?:\/\/(?:www\.)?twitch\.tv\/rockstargames(?:[/?#]|$)/i,
];

const clean = (text) => text.normalize("NFKC").replace(INVISIBLE, "");

function decodeUrl(url) {
  try {
    return decodeURIComponent(url.replace(/\+/g, " "));
  } catch {
    return url;
  }
}

export function mentionsGta6(text, { strict = false } = {}) {
  if (!text) return false;
  const cleaned = clean(text);
  return EXPLICIT.test(cleaned) || (strict && FRANCHISE.test(cleaned));
}

export function urlMentionsGta6(url) {
  if (!url) return false;
  if (ROCKSTAR_SOURCES.some((source) => source.test(url))) return true;
  return mentionsGta6(decodeUrl(url));
}
