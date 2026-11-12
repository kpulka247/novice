<div align="center">

![banner](static/images/banner.png)

<a href="https://github.com/kpulka247/gta6-spoiler-blocker/actions" title="GitHub Actions Workflow Status"><img src="https://img.shields.io/github/actions/workflow/status/kpulka247/gta6-spoiler-blocker/release.yml"></a>
<a href="https://github.com/kpulka247/gta6-spoiler-blocker/releases" title="GitHub Release"><img src="https://img.shields.io/github/v/release/kpulka247/gta6-spoiler-blocker?logo=github&logoColor=white"></a>
<a href="https://github.com/kpulka247/gta6-spoiler-blocker/blob/main/LICENSE" title="GitHub License"><img src="https://img.shields.io/github/license/kpulka247/gta6-spoiler-blocker?color=%23ff2d95"></a>

</div>

## Overview

GTA 6 Spoiler Blocker is a browser extension for people who want to play Grand Theft Auto VI knowing nothing about it. Once the game is out, its story, characters, and ending will be on every feed, search page, and news site. Muting a few keywords on one social network does not stop that.

The extension reads every page you open and removes anything about GTA VI before you see it: video tiles, posts, comments, search results, article cards, and image captions. Pages that are entirely about the game, such as a trailer on YouTube or a review, are covered with a full-screen shield instead. Everything else on the internet stays untouched.

It is on from the moment you install it. There is nothing to configure.

## Features

- 🛡️ **Blocks by meaning, not by one keyword list.** It catches every spelling of the title (`GTA 6`, `GTA VI`, `gta6`, `#GTA6`, `GTA-VI`, `Grand Theft Auto: VI`, `ГТА 6`, `グランド・セフト・オートVI`), the main characters, and the locations of Leonida. Fullwidth digits, Roman numeral characters, and hidden zero-width characters do not get past it.
- 🧱 **Removes whole cards, not single words.** It has card rules for YouTube, Reddit, X, Facebook, Instagram, TikTok, Twitch, Google, Bing, DuckDuckGo, and Steam, so the whole video tile, post, or result goes and the thumbnail goes with the title. On other sites it finds the nearest card, list item, or paragraph.
- 🌅 **Covers pages that are about the game.** If the address or the tab title mentions GTA VI, a shield covers the page, pauses any video or audio, and renames the tab. You choose **Take me back** or **Show anyway**.
- 🎬 **Treats Rockstar's own channels as spoilers.** The Rockstar Games website, YouTube channel, X, Instagram, Facebook, Threads, TikTok, and Twitch accounts are covered, and any post that links to them is hidden. Their key art often has no text a keyword could catch.
- ⚡ **Works before the page paints.** The content script starts at `document_start` and watches the page as it loads, so endless feeds and single-page apps are covered as you scroll.
- 🔢 **Shows a count on the icon.** The badge shows how many spoilers it removed from the current page.
- 🔒 **Collects no data.** Everything runs locally. There are no servers, no analytics, and no remote block lists.

## Screenshots

A YouTube search for `rockstar games trailer` without the extension, then with it:

![YouTube search without the extension](static/images/screenshot-youtube-off.png)

![YouTube search with the extension](static/images/screenshot-youtube-on.png)

A page about GTA VI is covered:

![Full-page shield](static/images/screenshot-shield.png)

The popup:

<img src="static/images/screenshot-popup.png" alt="Extension popup" width="320">

## Installation

The Chrome Web Store and Firefox Add-ons listings are in review. Until they are live, install the latest build from [GitHub Releases](https://github.com/kpulka247/gta6-spoiler-blocker/releases):

- **Chrome, Edge, Brave, or Opera.** Download `gta6spoilerblocker-<version>-chrome.zip` and unzip it. Open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked**, and select the unzipped folder.
- **Firefox.** Download `gta6spoilerblocker-<version>-firefox.zip`. Open `about:debugging#/runtime/this-firefox`, click **Load Temporary Add-on**, and select the zip.

## Usage

Install it and browse. The extension is on by default on every site.

Click the toolbar icon to open the popup:

- **Protection** turns blocking on or off everywhere.
- **Block on this site** turns blocking off for the current site only. Use it if you write about GTA VI or moderate a GTA community.

To report a spoiler that got through, [open an issue](https://github.com/kpulka247/gta6-spoiler-blocker/issues) with the page address. Leave the spoiler itself out of the issue.

## Known limitations

- **Images with no text.** The extension reads text, links, and image descriptions. A thumbnail that shows GTA VI art under a title like "All Rockstar trailers 1997-2026" stays visible, because nothing in the page says GTA 6.
- **Vice City.** The extension treats "Vice City" as a GTA VI location. Pages about Grand Theft Auto: Vice City from 2002 are hidden too.
- **Shadow DOM.** The extension does not check text inside shadow roots.
- **Site layouts change.** The card rules for each site match that site's current markup. When a site redesigns, a rule can stop matching. The fallback still hides the nearest list item or paragraph, but a thumbnail can be left behind until the rule is updated.

## Development and build

This project uses Node.js for its build system, Conventional Commits, and `semantic-release` for automated versioning, packaging, and publishing.

### 🚀 Getting started

You need:

- [Node.js](https://nodejs.org) (LTS)
- [pnpm](https://pnpm.io/) (`npm install -g pnpm`)
- [Git](https://git-scm.com/)

Install dependencies:

```bash
pnpm install
```

### 🔧 Build the extension

```bash
# Production build for Chrome and Firefox (minified, with ZIPs)
pnpm build

# Development build that rebuilds on every change (source maps, no ZIPs)
pnpm dev
```

Webpack writes unpacked builds to `dist/gta6spoilerblocker-chrome/` and `dist/gta6spoilerblocker-firefox/`. A production build also writes `dist/gta6spoilerblocker-<version>-chrome.zip` and `dist/gta6spoilerblocker-<version>-firefox.zip`.

### 🧪 Test

```bash
# Unit tests for the matcher: every spoiler that must be caught and every phrase that must not
pnpm test

# End-to-end tests: loads the built extension into Chromium and checks real pages
pnpm test:e2e

# Mozilla's linter on the Firefox build
pnpm lint:firefox
```

Before the first `pnpm test:e2e`, download the test browser with `pnpm exec playwright install chromium`.

To try the extension by hand, run `pnpm dev`, open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked**, and select `dist/gta6spoilerblocker-chrome/`.

### 🏷️ Versioning and releases

Every merge to `main` runs [semantic-release](https://github.com/semantic-release/semantic-release) in GitHub Actions. It reads the [Conventional Commits](https://www.conventionalcommits.org/) since the last release, then:

1. Picks the next version (`fix:` is a patch, `feat:` is a minor, `BREAKING CHANGE:` is a major).
2. Updates `package.json` and `CHANGELOG.md` and commits them.
3. Builds both browsers. The build copies the version from `package.json` into each manifest.
4. Creates a Git tag and a GitHub Release with both ZIPs attached.
5. Uploads the Chrome build to the Chrome Web Store.
6. Signs and uploads the Firefox build to Firefox Add-ons.

You do not bump versions by hand.

## How it works

| File                     | Owns                                                                                                                                                                          |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/spoilers.js`        | What counts as GTA VI content. `TERM_GROUPS` lists every title variant, character, place, and spoiler phrase. `mentionsGta6()` and `urlMentionsGta6()` are the only matchers. |
| `src/sites.js`           | Where a self-contained card starts and ends on each supported site, plus the fallback for every other site.                                                                   |
| `src/settings.js`        | The stored settings (`enabled`, `allowedSites`) and their defaults.                                                                                                           |
| `src/content/blocker.js` | Walks the page, checks text and attributes, and hides matching cards.                                                                                                         |
| `src/content/shield.js`  | The full-page cover.                                                                                                                                                          |
| `src/content/index.js`   | Starts the blocker, watches the page for changes, and decides when to show the shield.                                                                                        |
| `src/background.js`      | The toolbar badge, and protecting tabs that were open at install time.                                                                                                        |
| `public/manifest.json`   | The shared manifest. `webpack.config.js` adds the Chrome or Firefox background and Firefox ID at build time.                                                                  |
| `scripts/build-icons.js` | Renders the icons, README banner, and store images from `src/assets/logo.svg`. Run it with `pnpm icons`.                                                                      |

To block a new term, add it to `TERM_GROUPS` in `src/spoilers.js` and add an example to `test/unit/spoilers.test.js`. Add a phrase that must stay visible to the `SAFE` list in the same file.

## Contributing

Contributions are welcome. 💖 New terms, site support, and false-positive reports help the most.

Read **[CONTRIBUTING.md](./CONTRIBUTING.md)** to set up the project, find the target branch (`dev`), and name your Pull Request.

## Disclaimer

This is an unofficial fan project. It is not affiliated with, endorsed by, or sponsored by Rockstar Games or Take-Two Interactive. Grand Theft Auto is a trademark of Take-Two Interactive Software, Inc.

## Changelog

Each release is documented in [CHANGELOG.md](./CHANGELOG.md).
