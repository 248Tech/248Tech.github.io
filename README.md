# 248Tech.github.io

Portfolio directory of my GitHub Pages projects: https://248tech.github.io/

`scripts/build.mjs` finds every public, non-fork repo whose Pages site responds at `https://248tech.github.io/<repo>/` and writes `projects.json`. A GitHub Action runs it on every push and daily, so new sites appear automatically. No dependencies, no build step for the front-end.

```bash
node scripts/build.mjs   # regenerate projects.json
npx serve .              # preview
```
