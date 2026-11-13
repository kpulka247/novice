# How to connect the stores and publish automatically

Every merge to `main` builds a release and uploads it to the Chrome Web Store and Firefox Add-ons. The stores accept automated uploads only for an item that already exists, so the first version goes up by hand. After that, you only merge.

## 1. Create the first release on GitHub

1. Create the repository `kpulka247/novice` on GitHub if it does not exist yet. Keep it empty: no README, license, or `.gitignore`.
2. Make sure the workflow can push the release commit and tag. In the GitHub repository, open **Settings > Actions > General** and set **Workflow permissions** to **Read and write permissions**.
3. Push both branches:
   ```bash
   git push -u origin main dev
   ```
4. Open the **Actions** tab and wait for the **Release** workflow. It creates the tag `v1.0.0`, a GitHub Release with `novice-1.0.0-chrome.zip` and `novice-1.0.0-firefox.zip`, and a `CHANGELOG.md` commit.

The two publish jobs finish with a notice that says the store secrets are not set. That is expected.

## 2. Upload the first version to the Chrome Web Store

1. Open the [Chrome Web Store developer dashboard](https://chrome.google.com/webstore/devconsole) with the account that publishes Dark Connect.
2. Click **New item** and upload `novice-1.0.0-chrome.zip` from the GitHub Release.
3. On **Store listing**, paste the description from [store-listing.md](store-listing.md) and upload the graphics:

   | Field                           | File                                                                              |
   | ------------------------------- | --------------------------------------------------------------------------------- |
   | Store icon (128×128)            | `static/store/store-icon-128.png`                                                 |
   | Screenshots (1280×800, up to 5) | `static/store/screenshot-1-blur.png` to `static/store/screenshot-5-languages.png` |
   | Small promo tile (440×280)      | `static/store/promo-tile-440x280.png`                                             |
   | Marquee promo tile (1400×560)   | `static/store/marquee-1400x560.png`                                               |

4. On **Privacy**, paste the single purpose, the permission justifications, and the data usage answers from [store-listing.md](store-listing.md).
5. Click **Submit for review**.
6. Copy the item ID from the dashboard address. It is the 32-letter string after `/detail/` or `/edit/`.
7. In `README.md`, replace every `CHROME_EXTENSION_ID` with that ID. The Chrome badges and links start working once the listing is public.

## 3. Upload the first version to Firefox Add-ons

1. Open the [Firefox Add-on Developer Hub](https://addons.mozilla.org/developers/) and click **Submit a New Add-on**.
2. Choose **On this site** and upload `novice-<version>-firefox.zip` from the latest GitHub Release. The add-on ID is `novice@kpulka.com`.

3. When the form asks whether you use a build tool or minifier, answer **Yes**. Upload **Source code (zip)** from the same GitHub Release. Reviewers build it with `pnpm install && pnpm build`, as the README says.
4. Fill in the listing from [store-listing.md](store-listing.md). Set the add-on URL to `novice`, because the README badges point to `addons.mozilla.org/firefox/addon/novice/`. For the license, choose **All Rights Reserved**. If the form only offers a custom license, choose **Custom License** and paste the text of `LICENSE`. Then upload the same five screenshots.
5. Submit the add-on.

## 4. Add the repository secrets

If `AMO_JWT_ISSUER` is already set, the Firefox job tries to sign each release. Until the first version is on Firefox Add-ons, AMO has no add-on with this ID. A new listed add-on needs listing details, such as categories and a license, that the workflow does not send, so AMO rejects the upload and nothing is published. It starts working once step 3 is done.

Open **Settings > Secrets and variables > Actions** and add these repository secrets:

| Secret                 | Value                              |
| ---------------------- | ---------------------------------- |
| `CHROME_EXTENSION_ID`  | The item ID from step 2.           |
| `CHROME_CLIENT_ID`     | The same value as in Dark Connect. |
| `CHROME_CLIENT_SECRET` | The same value as in Dark Connect. |
| `CHROME_REFRESH_TOKEN` | The same value as in Dark Connect. |
| `AMO_JWT_ISSUER`       | The same value as in Dark Connect. |
| `AMO_JWT_SECRET`       | The same value as in Dark Connect. |

The Chrome client and refresh token belong to your Google account, and the AMO keys belong to your Mozilla account. Both work for every extension you publish, so Dark Connect's values work here. GitHub does not show saved secrets again. If you no longer have the values:

- The Chrome client ID and secret are in the OAuth client in Google Cloud Console. Create a new refresh token with `npx chrome-webstore-upload-keys`.
- The AMO keys are on [the API keys page](https://addons.mozilla.org/developers/addon/api/key/). Generating new keys revokes the old ones, so update Dark Connect too.

## 5. Release from now on

1. Work on `dev`, or on a branch from `dev`.
2. Open a Pull Request from `dev` to `main` with a Conventional Commits title, such as `feat: block spoilers on threads` or `fix: blur reddit search cards`.
3. Merge it. The **Release** workflow picks the version, updates `CHANGELOG.md`, creates the GitHub Release, uploads the Chrome build with auto-publish, and signs and uploads the Firefox build with its source code.

Both stores review each version before users get it. The Chrome Web Store rejects an upload while an earlier version is still in review, so wait for the first review to finish before you merge the next release.
