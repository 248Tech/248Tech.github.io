# 248Tech.github.io

Portfolio directory of my GitHub Pages projects: https://248tech.github.io/

`scripts/build.mjs` finds every public, non-fork repo whose Pages site responds at `https://248tech.github.io/<repo>/` and writes `projects.json`. A GitHub Action runs it on every push and daily, so new sites appear automatically.

Commercial products with private source (currently RentalOS) are listed through their public site/demo repo via the `COMMERCIAL` map in `scripts/build.mjs`: they get a "Commercial" tag and a **Product site** button instead of **Source**, and are never counted as open source.

Unofficial fan projects with private source (currently GTAIndex) are listed the same way through their public demo repo via the `FAN` map in `scripts/build.mjs`: they get a "Fan Project" tag and a **Try demo** button only, and count as neither open source nor commercial.

"Open source" means GitHub detects a real SPDX license in the repo (e.g. MIT). Repos with no license file or a custom/proprietary license (such as source-available GarageIQ) are excluded from both the hero's open-source stat and the lines-of-code counter, which only counts open-source repositories.

Each card gets a **Download** button for the repo's latest published release (drafts and pre-releases are skipped). The build picks the best asset (`.exe`/`.msi`, then OS packages, then archives; never checksums). Open-source releases with no assets link the tag's source zip. Proprietary or commercial projects without assets, and repos with no releases, get no button. No dependencies, no build step for the front-end.

```bash
node scripts/build.mjs   # regenerate projects.json
npx serve .              # preview
```
