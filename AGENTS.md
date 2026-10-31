# dariuslung.github.io

Personal site and small web tools for Darius Lung. Jekyll 4 + Tailwind 3 (PostCSS), vanilla JS, D3 from a CDN. Hosted on GitHub Pages.

## Layout
- `assets/css/styles.css` is **generated and committed**. Rebuild it with `npm run build:css` (not the `--watch` build) and commit it with every change to classes, `input.css` or `tailwind.config.js`: `.github/workflows/deploy.yml` rebuilds it and fails the deploy if it differs from the committed copy.
- Colours are CSS variables (`--c-*`) in `assets/css/input.css`, mapped to Tailwind names (`paper`, `ink`, `muted`, `rule`, `signal`) in `tailwind.config.js`. Dark mode swaps the variables; don't add per-element `dark:` colour pairs.
- Shared components (`.card`, `.btn`, `.field`, `.tag`, `.panel`, `.section-title`) live in `input.css`. Reuse them before adding new ones.
- Home page sections come from `index.html`; the Projects section renders from `_data/projects.yml` (empty list hides it). The CV link appears only when `assets/cv.pdf` exists.
- Tools: each page in `tools/` pairs with a script in `assets/js/`. A new tool also needs a card in `tools.html`; `sitemap.xml` lists every `layout: default` page on its own. Layout, navbar and footer are in `_layouts/default.html` and `_includes/navbar.html`.

## Rules
- Tailwind only sees classes written out in full in `_layouts`, `_includes`, `tools/`, `*.html`, `*.md` and `assets/js`. Never build class names by interpolation (`bg-${x}`), including in JS-rendered markup.
- Design: one orange accent (`signal`); Spotify green only inside the Spotify tool. Orange is for fills and borders; use `signal-text` for orange text (contrast). No `transition-all` or long hover transitions; hover feedback is instant, only `:active` moves 1px. Keep `prefers-reduced-motion` working.
- Set user-controlled strings (e.g. playlist names) with `textContent`, not `innerHTML`.
- `spotify-sorter.js`: the auth (PKCE), MusicBrainz rate limiting and sort logic are not styling concerns. Change only markup and classes there unless asked. The redirect URI is the page's own URL, so it must stay whitelisted in the Spotify dashboard.
- Non-site files (`docs/`, `.github/`, `README.md`, `AGENTS.md`, `CLAUDE.md`) are listed under `exclude` in `_config.yml`, or Jekyll publishes them. New ones need the same.

## Commands
```
npm install && bundle install          # one-time setup
npm run build:css                      # rebuild assets/css/styles.css (commit the result)
npx postcss assets/css/input.css -o assets/css/styles.css --watch
bundle exec jekyll serve --livereload  # http://localhost:4000 (restart after _config.yml edits)
bundle exec jekyll build               # output in _site/
```

## More
- `docs/design-plan.md`: design tokens, principles and what was deliberately left out.
- `README.md`: tech stack and local setup.
