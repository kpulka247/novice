import { test } from "node:test";
import assert from "node:assert/strict";
import { mentionsGta6, urlMentionsGta6 } from "../../src/spoilers.js";

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
  "グランド・セフト・オートVI",
  "日本語GTA6の発売日",
  "Jason Duval",
  "Lucia Caminos",
  "Jason and Lucia",
  "jason & lucia",
  "Lucia y Jason",
  "Jason i Lucia",
  "Dre'Quan Priest",
  "Boobie Ike",
  "Welcome to Leonida",
  "Vice City nights",
  "Port Gellhorn",
  "Grassrivers",
  "Mount Kalaga National Park",
  "JASON DIES",
  "Lucia killed",
  "lucia betrayal",
  "jason ending",
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
];

for (const text of SPOILERS) {
  test(`blocks: ${text}`, () => assert.equal(mentionsGta6(text), true));
}

for (const text of SAFE) {
  test(`allows: ${text}`, () => assert.equal(mentionsGta6(text), false));
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
    "https://www.ign.com/articles/gta-6-review",
    "https://en.wikipedia.org/wiki/Grand_Theft_Auto_VI",
  ]) {
    assert.equal(urlMentionsGta6(url), true, url);
  }
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
  ]) {
    assert.equal(urlMentionsGta6(url), false, url);
  }
});
