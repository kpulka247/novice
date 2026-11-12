import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mentionsGta6,
  spoilerLevel,
  urlMentionsGta6,
} from "../../src/spoilers.js";

const SPOILERS = [
  "GTA 6 ending explained",
  "gta6 leaks",
  "#GTA6 is here",
  "GTA-VI trailer 3",
  "GTAVI",
  "GTA_VI final mission",
  "GTA Ⅵ",
  "ＧＴＡ６",
  "G​TA 6",
  "Grand Theft Auto VI",
  "Grand Theft Auto: VI",
  "grand theft auto six review",
  "Rockstar VI gameplay",
  "Обзор ГТА 6",
  "Огляд ГТА 6",
  "グランド・セフト・オートVI",
  "日本語GTA6の発売日",
  "グラセフ6の新情報",
  "侠盗猎车手6 发售日期",
  "俠盜獵車手6",
  "侠盗猎车手六",
  "그랜드 테프트 오토 6 출시",
  "جي تي أي 6",
  "जीटीए 6 ट्रेलर",
  "Jason Duval",
  "Lucia Caminos",
  "Jason and Lucia",
  "jason & lucia",
  "Lucia y Jason",
  "Jason i Lucia",
  "Джейсон и Люсия",
  "ジェイソンとルシア",
  "Dre'Quan Priest",
  "Boobie Ike",
  "Welcome to Leonida",
  "Vice City nights",
  "Вайс-Сити",
  "罪恶都市",
  "Port Gellhorn",
  "Grassrivers",
  "Mount Kalaga National Park",
  "JASON DIES",
  "Lucia killed",
  "lucia betrayal",
  "jason ending",
  "Jason muere",
  "Lucia stirbt",
  "Jason ginie",
  "Джейсон умирает",
  "Bae-Luxe and Roxy",
  "Lori Heder",
  "Only Raw Records",
  "Wyman's World Auto Salvage",
  "San4San",
  "Dale's Shopwell",
  "Vice Beach at night",
  "Vice-Dale County",
  "Ekanfinaka",
  "Leaf Links golf",
  "VCPD chase",
  "Kalaga trail",
];

const SAFE = [
  "GTA 5 online update",
  "GTA V",
  "Grand Theft Auto V",
  "GTA 60 fps",
  "GTA vice",
  "gtavideos",
  "Greater Toronto Area housing",
  "Jason Statham",
  "Lucia is my friend",
  "Leonidas",
  "Six flags",
  "rockstar energy",
  "I saw Jason. Lucia was there too.",
  "Miami Vice",
  "agta6x",
  "Rockstar Games",
  "All GTA helicopters",
  "Hamlet by Shakespeare",
  "Little Haiti restaurants",
  "Carl Johnson, accountant",
  "Dale's diner",
  "Rob Nelson interview",
  "Ambrosia salad",
];

const FRANCHISE_ONLY = [
  "All GTA helicopters",
  "Rockstar's weapon UI has changed a lot over the years",
  "Rockstar Games · Join",
  "GTA 5 online update",
  "GTA5 mods",
  "GTAV",
  "Grand Theft Auto V",
  "Обзор ГТА",
  "侠盗猎车手",
  "グラセフ",
  "Rob Nelson on the new engine",
  "Sam Houser",
  "Imran Sarwar",
  "Leslie Benzies",
  "Strauss Zelnick on earnings",
  "Take-Two Interactive",
  "Rockstar North",
  "R* confirmed it",
  "Tez2 says",
  "via Yan2295",
  "VideotechUK",
  "CyberLeek footage",
  "KiwiTalkz",
  "teapotuberhacker",
  "Arion Kurtaj",
  "Rockstar Intel",
  "GTABase",
  "Ambrosia",
  "Petra Navarro",
  "Los Santos",
  "Liberty City",
  "Niko Bellic",
  "Tommy Vercetti",
  "Trevor Philips",
  "Cluckin' Bell",
  "Pißwasser",
  "Ammu-Nation",
];

const SAFE_EVEN_STRICT = [
  "Greatest hits",
  "rockstar energy",
  "coding rockstars",
  "agtax",
  "Rockstar developer wanted",
  "212GB. Your PS5 is NOT ready",
  "Hamlet by Shakespeare",
  "Carl Johnson, accountant",
  "rockstar intelligence",
  "R2D2",
];

for (const text of SPOILERS) {
  test(`blocks: ${text}`, () => assert.equal(mentionsGta6(text), true));
}

for (const text of SAFE) {
  test(`allows: ${text}`, () => assert.equal(mentionsGta6(text), false));
}

for (const text of SPOILERS) {
  test(`level gta6: ${text}`, () => assert.equal(spoilerLevel(text), "gta6"));
}

for (const text of FRANCHISE_ONLY) {
  test(`level franchise: ${text}`, () =>
    assert.equal(spoilerLevel(text), "franchise"));
}

for (const text of SAFE_EVEN_STRICT) {
  test(`level none: ${text}`, () => assert.equal(spoilerLevel(text), null));
}

test("blocks GTA VI URLs", () => {
  for (const url of [
    "https://www.rockstargames.com/VI",
    "https://www.rockstargames.com/pl/VI/downloads",
    "https://www.rockstargames.com/",
    "https://www.youtube.com/@RockstarGames/videos",
    "https://x.com/RockstarGames",
    "https://www.instagram.com/rockstargames/",
    "https://www.tiktok.com/@rockstargames",
    "https://www.reddit.com/r/GTA6/",
    "https://www.google.com/search?q=gta+6+ending",
    "https://www.youtube.com/results?search_query=grand%20theft%20auto%20vi",
    "https://www.baidu.com/s?wd=%E4%BE%A0%E7%9B%97%E7%8C%8E%E8%BD%A6%E6%89%8B6",
    "https://www.ign.com/articles/gta-6-review",
    "https://en.wikipedia.org/wiki/Grand_Theft_Auto_VI",
  ]) {
    assert.equal(urlMentionsGta6(url), true, url);
  }
});

test("franchise terms never match URLs, which often echo the current search", () => {
  assert.equal(
    urlMentionsGta6(
      "https://consent.youtube.com/m?continue=https%3A%2F%2Fwww.youtube.com%2Fresults%3Fsearch_query%3Drockstar%2Bgames",
    ),
    false,
  );
  assert.equal(urlMentionsGta6("https://example.com/gta-5-mods"), false);
});

test("allows other URLs", () => {
  for (const url of [
    "https://support.rockstargames.com/articles/123",
    "https://www.youtube.com/@RockstarGamesFanClub",
    "https://x.com/rockstargamesnews_fan",
    "https://example.com/?ref=https://www.rockstargames.com/",
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://example.com/?lang=vi",
    "https://example.com/%E0%A4%A",
    "https://www.gtabase.com/",
  ]) {
    assert.equal(urlMentionsGta6(url), false, url);
  }
});
