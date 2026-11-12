# Contributing to GTA 6 Spoiler Blocker

Thank you for helping people go into GTA VI blind. Bug reports, new terms, site support, and code improvements are all welcome.

## Report a spoiler that got through

Open an issue with:

- The page address.
- What you saw: a video tile, a post, a search result, or an image.
- Your browser and its version.

Do not paste the spoiler into the issue. Other people read issues too.

## 🛠️ Set up the project

1. Fork the repository on GitHub.
2. Clone your fork. Replace `YOUR_GITHUB_USERNAME` with your username:
   ```bash
   git clone https://github.com/YOUR_GITHUB_USERNAME/gta6-spoiler-blocker.git
   ```
3. Install dependencies. You need Node.js and `pnpm`:
   ```bash
   pnpm install
   ```
4. Start the development build. It rebuilds on every change:
   ```bash
   pnpm dev
   ```
5. Load the extension in your browser:
   - **Chrome.** Open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked**, and select `dist/gta6spoilerblocker-chrome/`.
   - **Firefox.** Open `about:debugging#/runtime/this-firefox`, click **Load Temporary Add-on**, and select `manifest.json` in `dist/gta6spoilerblocker-firefox/`.

## Add a term, a site, or a language

- **A new term.** Add it to `EXPLICIT_TERMS` in `src/spoilers.js` if it always means GTA VI, or to `FRANCHISE_TERMS` if it only hints at GTA and should be blurred in strict mode. Add an example that must be blocked to `SPOILERS` in `test/unit/spoilers.test.js`. If the term is close to common words, add a phrase that must stay visible to `SAFE`.
- **A new site.** Add an entry to `SITE_UNITS` in `src/sites.js`. List the selectors of the smallest element that holds one whole item, such as a post or a video tile, so its thumbnail is blurred with its title.
- **A new language.** Copy the `en` block in `src/locales.js`, rename it to the [Chrome locale code](https://developer.chrome.com/docs/extensions/reference/api/i18n#locales), and translate every value. `pnpm test` checks that no key is missing and that the store description fits in 132 characters.

Run the tests before you open a Pull Request:

```bash
pnpm test
pnpm test:e2e
pnpm lint:firefox
```

Before the first `pnpm test:e2e`, run `pnpm exec playwright install chromium`.

## 📝 Name your Pull Request (required)

This project releases automatically from **Conventional Commits**. Name your local commits however you like. The **Pull Request title** must follow the format below and must be in English. When the PR is merged, its commits are squashed into one commit with the PR title, and the release pipeline reads that title.

Format: `<type>: <description>`

Allowed types:

- `fix:` A bug fix, for example `fix: hide reddit search result cards`.
- `feat:` A new feature, for example `feat: block spoilers on threads`.
- `refactor:` A code change that neither fixes a bug nor adds a feature.
- `chore:` Build, configuration, or dependency changes.
- `docs:` Documentation only.

Use a lowercase type and a lowercase description.

## 🚀 Submit a Pull Request

All Pull Requests target the **`dev`** branch, not `main`.

1. Create a branch from `dev`: `git checkout -b feat/my-change dev`.
2. Make your change and test it in Chrome and Firefox.
3. Push the branch: `git push origin feat/my-change`.
4. Open a Pull Request against `dev`. Fill in the template and check that the title follows the format above.
