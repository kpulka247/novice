# Store listing

Text to paste into the Chrome Web Store and Firefox Add-ons forms. The extension name and summary are translated in `src/locales.js` (`extName` and `extDescription`), and both stores pick them up from the package. All store graphics are in `static/store/`. Regenerate the icon and promo tiles with `pnpm icons`, and the screenshots with `pnpm screenshots`. [publishing.md](publishing.md) says which file goes in which field.

## Name

NoVice - Block GTA 6 Spoilers

## Summary (132 characters maximum)

Blurs GTA 6 trailers, leaks, videos, posts and story spoilers across the web so you go in blind. Not affiliated with Rockstar.

## Description

Blurs GTA 6 spoilers across the web, so you can play Grand Theft Auto VI knowing nothing about it.

Trailers, leaks, story details, and endings show up on every feed, search page, and news site. This extension blurs them before you see them and leaves the rest of the internet alone. Click any blurred post to see it. It works the moment you install it, with nothing to set up!

Features:
🌫️ Blur or remove. Spoilers blur in place with a small tag that shows which words matched, or disappear from the page if you prefer.
🧠 Knows the game. Every spelling of the title in every script, the characters and places of Leonida, and Rockstar's own channels.
🎯 Strict mode. Also catches GTA and Rockstar posts, insiders, leakers, GTA creators and roleplay servers from many countries, and posts that hide GTA VI behind "See more".
✍️ Your own keywords. Add any word or phrase, and it is blocked everywhere, like GTA VI.
🌅 Covers whole pages. Trailers, reviews, and wikis about GTA VI get a see-through cover, and their videos pause.
🌍 20 languages. The popup and labels follow your browser language.
🔒 Private. Everything runs on your device. Nothing is collected or sent anywhere.
🆕 Automatic updates. New terms and fixes are released regularly.

Works on every website, with extra support for:

- YouTube, Reddit, X, Facebook, Instagram, TikTok
- Twitch, Steam, Google, Bing, DuckDuckGo

You stay in control. Click the toolbar icon to switch between blur and remove, turn strict mode off, add your own keywords, or turn the extension off for one site.

Changelog: https://github.com/kpulka247/novice/blob/main/CHANGELOG.md

Unofficial fan project, not affiliated with Rockstar Games or Take-Two Interactive.

If you like the extension, please rate it. I would be very grateful and happy to develop it further! ;)

## Category

- Chrome Web Store: Productivity > Tools (or Fun)
- Firefox Add-ons: Privacy & Security, Social & Communication

## Single purpose (Chrome Web Store)

Blur content about the video game Grand Theft Auto VI on web pages, so the user avoids story spoilers.

## Permission justifications (Chrome Web Store)

- **Host permission `<all_urls>`.** Spoilers can appear on any website. The content script reads the text of each page the user opens and blurs parts that mention GTA VI. It does not read or send form data, and it sends nothing off the device.
- **`storage`.** Stores five settings on the device: whether protection is on, whether strict mode is on, whether to blur or remove, the list of sites where the user turned it off, and the user's own keywords.

- **`scripting`.** On install, injects the content script into tabs that were already open, so they are protected without a reload.

## Data usage (Chrome Web Store)

- Collects no user data.
- Does not sell or transfer user data.
- Does not use data for purposes unrelated to the single purpose.

## Firefox data collection

The manifest declares `data_collection_permissions: { "required": ["none"] }`.

## Reviewer notes

The extension has no remote code and no network requests. To test it, open https://www.youtube.com/results?search_query=rockstar+games. GTA VI videos are blurred. Click one to show it. Then open https://en.wikipedia.org/wiki/Grand_Theft_Auto_VI. The page is covered. The full source is at https://github.com/kpulka247/novice, and `pnpm install && pnpm build` reproduces the uploaded package.
