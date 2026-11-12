const SIX = "(?:6|vi|six|ⅵ)";
const AND = "(?:and|&|n|y|i|e|et|und)";
const DIES =
  "(?:dies|died|dying|death|dead|killed|kills|murdered|ending|endings|betrayal|betrays|betrayed|fate|arrested|jailed)";

export const TERM_GROUPS = {
  title: [
    ["gta", SIX],
    ["grand", "theft", "auto", SIX],
    ["гта", SIX],
    ["グランド", "セフト", "オート", SIX],
    ["rockstar", "(?:6|vi)"],
  ],
  characters: [
    ["jason", "duval"],
    ["lucia", "caminos"],
    ["jason", AND, "lucia"],
    ["lucia", AND, "jason"],
    ["cal", "hampton"],
    ["boobie", "ike"],
    ["dre", "quan", "priest"],
    ["real", "dimez"],
    ["raul", "bautista"],
    ["brian", "heder"],
  ],
  places: [
    ["leonida"],
    ["vice", "city"],
    ["port", "gellhorn"],
    ["grass", "rivers"],
    ["mount", "kalaga"],
  ],
  spoilers: [["(?:jason|lucia)", DIES]],
};

const SEP = "[\\s\\-_.+:'’#·•・]*";
const WORD_CHAR =
  "[\\p{Script=Latin}\\p{Script=Cyrillic}\\p{Script=Greek}\\p{N}]";
const START = `(?<!${WORD_CHAR})`;
const END = `(?!${WORD_CHAR})`;
const INVISIBLE = /[­​-‍⁠﻿]/g;

const termSource = (words) => START + words.join(SEP) + END;

const PATTERN = new RegExp(
  Object.values(TERM_GROUPS).flat().map(termSource).join("|"),
  "iu",
);

const ROCKSTAR_SOURCES = [
  /^https?:\/\/(?:www\.)?rockstargames\.com(?:[/?#]|$)/i,
  /^https?:\/\/(?:www\.|m\.)?youtube\.com\/(?:@|c\/|user\/)rockstargames(?:[/?#]|$)/i,
  /^https?:\/\/(?:www\.|mobile\.)?(?:x|twitter)\.com\/rockstargames(?:[/?#]|$)/i,
  /^https?:\/\/(?:www\.)?(?:instagram|facebook|threads)\.(?:com|net)\/@?rockstargames(?:[/?#]|$)/i,
  /^https?:\/\/(?:www\.)?tiktok\.com\/@rockstargames(?:[/?#]|$)/i,
  /^https?:\/\/(?:www\.)?twitch\.tv\/rockstargames(?:[/?#]|$)/i,
];

export function mentionsGta6(text) {
  if (!text) return false;
  return PATTERN.test(text.normalize("NFKC").replace(INVISIBLE, ""));
}

export function urlMentionsGta6(url) {
  if (ROCKSTAR_SOURCES.some((source) => source.test(url))) return true;
  let decoded = url;
  try {
    decoded = decodeURIComponent(url.replace(/\+/g, " "));
  } catch {}
  return mentionsGta6(decoded);
}
