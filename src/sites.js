const SITE_UNITS = [
  {
    hosts: /(^|\.)youtube\.com$/,
    units: [
      "ytd-rich-item-renderer",
      "ytd-video-renderer",
      "ytd-compact-video-renderer",
      "ytd-grid-video-renderer",
      "ytd-playlist-renderer",
      "ytd-compact-playlist-renderer",
      "ytd-radio-renderer",
      "ytd-compact-radio-renderer",
      "ytd-channel-renderer",
      "ytd-reel-item-renderer",
      "ytd-rich-section-renderer",
      "ytd-shelf-renderer",
      "ytd-comment-thread-renderer",
      "ytd-comment-view-model",
      "ytd-backstage-post-thread-renderer",
      "ytd-post-renderer",
      "ytd-notification-renderer",
      "ytd-guide-entry-renderer",
      "ytd-movie-renderer",
      "ytd-universal-watch-card-renderer",
      "yt-lockup-view-model",
      "ytm-shorts-lockup-view-model-v2",
      "ytm-shorts-lockup-view-model",
      "ytm-video-with-context-renderer",
      "ytm-compact-video-renderer",
      "ytm-rich-item-renderer",
      ".ytSearchboxComponentSuggestion",
      ".sbsb_c",
    ],
    shelves: [
      "grid-shelf-view-model",
      "ytd-reel-shelf-renderer",
      "ytd-rich-shelf-renderer",
      "ytd-horizontal-card-list-renderer",
    ],
  },
  {
    hosts: /(^|\.)reddit\.com$/,
    units: [
      "shreddit-post",
      "shreddit-comment",
      "faceplate-tracker[noun='trending_item']",
      "search-telemetry-tracker",
      "reddit-recent-pages li",
      "li[role='presentation']",
      "article",
      ".thing",
    ],
  },
  {
    hosts: /(^|\.)(x|twitter)\.com$/,
    units: [
      "[data-testid='cellInnerDiv']",
      "[data-testid='trend']",
      "[data-testid='UserCell']",
      "[data-testid='typeaheadResult']",
      "article",
    ],
  },
  {
    hosts: /(^|\.)facebook\.com$/,
    units: [
      "[data-pagelet^='FeedUnit']",
      "div[role='article']",
      "[data-virtualized]",
      "li",
    ],
    expanders: [
      "[data-ad-rendering-role='story_message'] [role='button']",
      "[data-ad-preview='message'] [role='button']",
      "[data-ad-comet-preview='message'] [role='button']",
    ],
  },
  {
    hosts: /(^|\.)instagram\.com$/,
    units: ["article", "a[href*='/p/']", "a[href*='/reel/']"],
  },
  {
    hosts: /(^|\.)tiktok\.com$/,
    units: [
      "[data-e2e='recommend-list-item-container']",
      "[data-e2e='search_top-item']",
      "[data-e2e='search-card-item']",
      "[data-e2e='user-post-item']",
      "[data-e2e='comment-level-1']",
      "article",
    ],
  },
  {
    hosts: /(^|\.)twitch\.tv$/,
    units: [
      "[data-a-target^='shelf-card']",
      ".tw-tower > div",
      "article",
      "[data-test-selector='search-result-card']",
    ],
  },
  {
    hosts: /(^|\.)google\.[a-z.]+$/,
    units: [
      ".MjjYud",
      ".g",
      "g-inner-card",
      ".related-question-pair",
      "[jsname='yEVEwb']",
      ".sbct",
      "[role='option']",
      "article",
    ],
  },
  {
    hosts: /(^|\.)bing\.com$/,
    units: ["li.b_algo", ".b_ans", ".na_card_wrp", ".sa_sg", "li"],
  },
  {
    hosts: /(^|\.)duckduckgo\.com$/,
    units: ["li[data-layout]", "article", "[role='option']"],
  },
  {
    hosts: /(^|\.)steampowered\.com$/,
    units: [
      ".search_result_row",
      ".tab_item",
      ".store_capsule",
      ".carousel_items > a",
    ],
  },
];

const GENERIC_UNITS = [
  "article",
  "[role='article']",
  "[role='listitem']",
  "[role='option']",
  "li",
  "tr",
  "figure",
  "dd",
  "blockquote",
].join(",");

const SMALL_BLOCKS = "p,h1,h2,h3,h4,h5,h6,a,figcaption,dt,td,span,div";

const MAX_UNIT_TEXT = 3000;
const CARD_TEXT = 300;
const CARD_MEDIA = 3;
const MEDIA = "img,video,picture,canvas";
const PAGE_ROOTS = new Set(["HTML", "BODY", "MAIN"]);

const siteFor = (host) => SITE_UNITS.find(({ hosts }) => hosts.test(host));

function unitSelectorFor(host) {
  return siteFor(host)?.units.join(",") ?? null;
}

export function findEmptiedShelf(unit, host, isGone) {
  const site = siteFor(host);
  const shelf =
    site?.shelves && unit.parentElement?.closest(site.shelves.join(","));
  if (!shelf) return null;
  const units = [...shelf.querySelectorAll(site.units.join(","))];
  return units.length > 0 && units.every(isGone) ? shelf : null;
}

export function expanderSelectorFor(host) {
  return siteFor(host)?.expanders?.join(",") ?? null;
}

function isContained(element) {
  return (
    !PAGE_ROOTS.has(element.tagName) &&
    (element.textContent?.length ?? 0) <= MAX_UNIT_TEXT
  );
}

function growToCard(block) {
  let card = block;
  for (
    let parent = block.parentElement;
    parent && !PAGE_ROOTS.has(parent.tagName);
    parent = parent.parentElement
  ) {
    if (parent.textContent.length > CARD_TEXT) break;
    if (parent.querySelectorAll(MEDIA).length > CARD_MEDIA) break;
    card = parent;
  }
  return card;
}

export function findUnit(element, host) {
  const siteSelector = unitSelectorFor(host);
  const siteUnit = siteSelector && element.closest(siteSelector);
  if (siteUnit && !PAGE_ROOTS.has(siteUnit.tagName)) return siteUnit;

  const genericUnit = element.closest(GENERIC_UNITS);
  if (genericUnit && isContained(genericUnit)) return genericUnit;

  const block = element.closest(SMALL_BLOCKS);
  if (block && isContained(block)) return growToCard(block);

  return PAGE_ROOTS.has(element.tagName) ? null : element;
}
