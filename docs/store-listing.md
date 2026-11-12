# Store listing

Text to paste into the Chrome Web Store and Firefox Add-ons forms. Images are in `static/store/` and `static/images/`. Regenerate the store images with `pnpm icons`.

## Name

GTA 6 Spoiler Blocker

## Summary (132 characters maximum)

Hides GTA 6 trailers, leaks, videos, articles and story spoilers across the web so you go in blind. Not affiliated with Rockstar.

## Description

Want to play Grand Theft Auto VI knowing nothing about it? Once the game is out, its story, characters, and ending will be on every feed, search page, and news site. GTA 6 Spoiler Blocker removes them before you see them, and leaves the rest of the internet alone.

It works the moment you install it. There is nothing to set up.

What it blocks:
• Every spelling of the title: GTA 6, GTA VI, gta6, #GTA6, GTA-VI, Grand Theft Auto VI, and more
• The main characters, the state of Leonida, and its cities
• Spoiler phrases such as "Jason dies" or "Lucia ending"
• Rockstar Games' own website and social accounts, which are full of GTA VI art

How it blocks:
• Hides whole video tiles, posts, comments, and search results on YouTube, Reddit, X, Facebook, Instagram, TikTok, Twitch, Google, Bing, DuckDuckGo, and Steam, so thumbnails go with their titles
• Hides the matching card, list item, or paragraph on every other site
• Covers pages that are about GTA VI with a full-screen shield and pauses their videos
• Shows how many spoilers it removed on the toolbar icon

You stay in control:
• Turn protection off for one site, or everywhere, from the popup
• Choose "Show anyway" on any covered page

Privacy: everything runs on your device. The extension collects no data, sends nothing anywhere, and has no analytics.

Open source: https://github.com/kpulka247/gta6-spoiler-blocker

This is an unofficial fan project. It is not affiliated with, endorsed by, or sponsored by Rockstar Games or Take-Two Interactive.

## Category

- Chrome Web Store: Productivity > Tools (or Fun)
- Firefox Add-ons: Privacy & Security, Social & Communication

## Single purpose (Chrome Web Store)

Hide content about the video game Grand Theft Auto VI on web pages, so the user avoids story spoilers.

## Permission justifications (Chrome Web Store)

- **Host permission `<all_urls>`.** Spoilers can appear on any website. The content script reads the text of each page the user opens and hides parts that mention GTA VI. It does not read or send form data, and it sends nothing off the device.
- **`storage`.** Stores two settings on the device: whether protection is on, and the list of sites where the user turned it off.
- **`scripting`.** On install, injects the content script into tabs that were already open, so they are protected without a reload.

## Data usage (Chrome Web Store)

- Collects no user data.
- Does not sell or transfer user data.
- Does not use data for purposes unrelated to the single purpose.

## Firefox data collection

The manifest declares `data_collection_permissions: { "required": ["none"] }`.

## Reviewer notes

The extension has no remote code and no network requests. To test it, open https://www.youtube.com/results?search_query=rockstar+games. GTA VI videos are hidden. Then open https://en.wikipedia.org/wiki/Grand_Theft_Auto_VI. The page is covered. The full source is at https://github.com/kpulka247/gta6-spoiler-blocker, and `pnpm install && pnpm build` reproduces the uploaded package.
