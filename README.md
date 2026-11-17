# 248Tech.github.io

Portfolio directory of my GitHub Pages projects: https://248tech.github.io/

`scripts/build.mjs` finds every public, non-fork repo whose Pages site responds at `https://248tech.github.io/<repo>/` and writes `projects.json`. A GitHub Action runs it on every push and daily, so new sites appear automatically.

Commercial products with private source (currently RentalOS) are listed through their public site/demo repo via the `COMMERCIAL` map in `scripts/build.mjs`: they get a "Commercial" tag and a **Product site** button instead of **Source**, and the hero stat counts only projects whose source is public. No dependencies, no build step for the front-end.

```bash
node scripts/build.mjs   # regenerate projects.json
npx serve .              # preview
```
