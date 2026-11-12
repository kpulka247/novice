# Store listing

Text to paste into the Chrome Web Store and Firefox Add-ons forms. The extension name and summary are translated in `src/locales.js` (`extName` and `extDescription`), and both stores pick them up from the package. All store graphics are in `static/store/`. Regenerate the icon and promo tiles with `pnpm icons`, and the screenshots with `pnpm screenshots`. [publishing.md](publishing.md) says which file goes in which field.

## Name

GTA 6 Spoiler Blocker

## Summary (132 characters maximum)

Blurs GTA 6 trailers, leaks, videos, posts and story spoilers across the web so you go in blind. Not affiliated with Rockstar.

## Description

Want to play Grand Theft Auto VI knowing nothing about it? Once the game is out, its story, characters, and ending will be on every feed, search page, and news site. GTA 6 Spoiler Blocker blurs them before you see them, and leaves the rest of the internet alone. Click a blurred post to see it.

It works the moment you install it. There is nothing to set up.

What it blurs:
• Every spelling of the title, in every script: GTA 6, GTA VI, gta6, #GTA6, ГТА 6, グラセフ6, 侠盗猎车手6, and more
• Every character, business, region, and district Rockstar has shown so far
• In strict mode, Rockstar and Take-Two leaders, and the insiders and leakers who post GTA VI news
• Spoiler phrases such as "Jason dies" or "Lucia ending"
• Rockstar Games' own website and social accounts, which are full of GTA VI art
• In strict mode (on by default), any post about GTA or Rockstar, because many hide GTA VI behind "See more"

How it works:
• Blurs spoilers in place, or removes them from the page if you prefer
• Tags each one in its corner: "GTA VI" when it names GTA VI, "GTA" when strict mode caught it
• Reads Facebook posts in full, so nothing hides behind "See more"
• Blurs whole video tiles, posts, comments, and search results in place on YouTube, Reddit, X, Facebook, Instagram, TikTok, Twitch, Google, Bing, DuckDuckGo, and Steam
• Blurs the matching card, list item, or paragraph on every other site
• Covers pages that are about GTA VI with a see-through blur and pauses their videos
• Shows how many spoilers are blurred on the toolbar icon
• Speaks 20 languages

You stay in control:
• Click any blurred post to see it
• Choose blur or remove, turn strict mode off, or turn protection off for one site or everywhere, from the popup
• Choose "Show anyway" on any covered page

Privacy: everything runs on your device. The extension collects no data, sends nothing anywhere, and has no analytics.

Source code: https://github.com/kpulka247/gta6-spoiler-blocker

This is an unofficial fan project. It is not affiliated with, endorsed by, or sponsored by Rockstar Games or Take-Two Interactive.

## Category

- Chrome Web Store: Productivity > Tools (or Fun)
- Firefox Add-ons: Privacy & Security, Social & Communication

## Single purpose (Chrome Web Store)

Blur content about the video game Grand Theft Auto VI on web pages, so the user avoids story spoilers.

## Permission justifications (Chrome Web Store)

- **Host permission `<all_urls>`.** Spoilers can appear on any website. The content script reads the text of each page the user opens and blurs parts that mention GTA VI. It does not read or send form data, and it sends nothing off the device.
- **`storage`.** Stores four settings on the device: whether protection is on, whether strict mode is on, whether to blur or remove, and the list of sites where the user turned it off.
- **`scripting`.** On install, injects the content script into tabs that were already open, so they are protected without a reload.

## Data usage (Chrome Web Store)

- Collects no user data.
- Does not sell or transfer user data.
- Does not use data for purposes unrelated to the single purpose.

## Firefox data collection

The manifest declares `data_collection_permissions: { "required": ["none"] }`.

## Reviewer notes

The extension has no remote code and no network requests. To test it, open https://www.youtube.com/results?search_query=rockstar+games. GTA VI videos are blurred. Click one to show it. Then open https://en.wikipedia.org/wiki/Grand_Theft_Auto_VI. The page is covered. The full source is at https://github.com/kpulka247/gta6-spoiler-blocker, and `pnpm install && pnpm build` reproduces the uploaded package.
