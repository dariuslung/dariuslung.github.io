# Design Overhaul Plan (revised)

## Goal

Move `dariuslung.github.io` off the generic Tailwind card look and onto a calm, editorial, technical style that feels like *me*: networked systems, kernels, PC building, hi-fi audio, badminton, films, games. Every hover and click responds instantly. The page should feel precise without looking like a costume.

## Principles

1. **One idea, held back.** A well-set document with hand-inked detail: a clear grid, hairline rules, a few drawn ornaments. No patch bays, rack modules, VU meters, telemetry footers, or `SYS.*` labels, and no illustrated backgrounds (the faint Soul Motes in the home page gutters are the one ambient exception).
2. **Instant feedback.** Colour and border changes on hover are immediate (`transition: none`). Motion appears only in the 1px press on `:active`, plus optional whisper-quiet ambient Soul Motes strictly in the outer desktop gutters on the home page (`>= 1024px`, masked clear of the 720px column and disabled under `prefers-reduced-motion`).
3. **Nothing fake.** No made-up metrics, build info, or "latency" readouts. Every number on the page has to be real.
4. **Content over chrome.** A projects section and a CV link do more for "professional" than any widget.
5. **Accessible by default.** AA contrast, visible focus states, reduced-motion support, and nothing that only works on hover.

---

## Design tokens

> **Revision (Hollow Knight direction).** The original orange-on-paper palette and the "no decoration" rule were replaced: the site now takes its palette and hand-inked detail from Hollow Knight's Hallownest. Layout, typography, instant hover and accessibility rules are unchanged. No game art, logos or characters are used; the ornaments are original shapes.

### Colour

| Token | Light (parchment) | Dark (Hallownest abyss) | Use |
| :--- | :--- | :--- | :--- |
| `paper` (bg) | `#E9E2CE` | `#090B10` | Page background |
| `surface` | `#F4EEDD` | `#10141C` | Cards, panels |
| `ink` (text) | `#15171D` | `#E4DFD0` (bone) | Body text |
| `muted` | `#5C5748` | `#98A0B0` | Secondary text, labels |
| `rule` | `#CBC1A5` | `#1F2735` | Dividers, panel borders |
| `rule-strong` | `#7F775F` | `#5B6A82` | Control borders, ornaments (3:1 or better) |
| `signal` (accent fill) | `#6FB0D0` | `#8EC9E8` (soul blue) | Fills such as the primary button |
| `signal-text` | `#1D5B7C` | `#9ED3EE` | Accent text, links, focus rings, hover glow |
| `on-signal` | `#15171D` | `#090B10` | Text on `signal` fills |

- Measured contrast: body text 13.9:1 or better, muted 5.6:1 or better, accent text 5.7:1 or better, control borders 3.3:1 or better, in both themes. Re-check any new pairing.
- The light theme's pale `signal` fill is only 1.9:1 against parchment, so `.btn-primary` gets a `signal-text` border.
- **One accent sitewide.** Spotify green `#1DB954` appears only inside the Spotify sorter.

### Ornament

Hand-inked shapes live in `assets/img/ornaments/` (`corner.svg`, `divider-line.svg`, `divider-gem.svg`, `filigree-top.svg`, `filigree-bottom.svg`) and are applied as CSS masks, so they take the theme colours: `.divider` (section and page-header dividers), `.flourish` (corner brackets on major panels) and `.filigree` / `.filigree-bottom` (the scrollwork above and below the name on the home page, sized with `max-width`).

All ornaments share one visual language: tapered strokes that end in sharp points, diamonds, thorns and pointed arches, mirrored about a centre. The dividers (a pointed oval around a diamond like the bottom filigree's centre, with a small scroll curling up and down off each side; a version with short hairline sides read as redundant next to the long tapered lines) and the corner brackets (angular double legs with a diamond) were redrawn to match the filigree after the first, rounder versions looked off-theme.

The filigree is heraldic, not a vine: tapered strokes that swell and end in points, a strong centre (pointed arch on top, shard on the bottom), two big mirrored arcs ending in inward scrolls, a thin outer hairline and a few thorns. An earlier version used an evenly spaced sine stem with round curls and leaves and read as a festive garland; avoid repeating motifs, beads and rounded leaves. The avatar's double ring is the same kind of shape, inlined in `index.html`. The chart bars use an ink cross-hatch.

`docs/ornaments.py` generates the shapes (jittered curves, tapered strokes, wobbly rings from fixed seeds). Re-run it to change them: `python3 docs/ornaments.py . <scratch-dir>`. The favicon, Apple icon and share image reuse them. Keep ornament sparse: dividers and major panels only, never on small cards or controls.

The favicon is the shard too: `favicon_shard()` (a bold pointed oval round a diamond on the dark tile, simplified so it holds at 16px) writes `assets/img/favicon.svg`, and `apple_icon_svg()` draws the full shard with its scrolls for the 180px Apple icon. `favicon.ico` (16, 32, 48px) and `apple-touch-icon.png` are rasterised from those SVGs with resvg and ImageMagick; regenerate them whenever the shard changes.

### Typography

- **Three families, self-hosted** as `woff2` in `assets/fonts/`, with `font-display: swap`; Inter and Cinzel are preloaded:
  - **Cinzel** (variable, OFL): all `h1`–`h3` and the navbar links. Trajan-style capitals, chosen to echo the Hollow Knight logotype. Lowercase renders as small caps, so headings need no `tracking-tight` (it squeezes the capitals); use `tracking-wide`.
  - **Inter** (variable): body text and controls.
  - **JetBrains Mono** (400 only): labels, weights, complexity badges, small metadata.
- Drop Space Grotesk. (Cinzel is the third family; the Hollow Knight direction justified the extra ~26 KB.)
- Body text is left-aligned (remove `text-justify`, which leaves gaps between words at narrow widths).

### Layout

One shared container, `.page-width` (`max-w-3xl` with `px-6`, so 720px of content), wraps the navbar, `main` and the footer. Their edges line up on every page; earlier the header and footer used 896px while the home content sat in a 672px column, so they stuck out past it. 720px also keeps About at about 90 characters per line. Don't add per-page width wrappers.

### Interaction

```css
@layer components {
  .card {
    @apply relative bg-surface border border-rule;
    transition: transform 60ms ease-out;
  }
  .card:hover {                   /* soul glow, applied instantly */
    @apply border-signal-text;
    box-shadow: 0 0 0 1px rgb(var(--c-signal-text)), 0 0 18px -4px rgb(var(--c-signal) / 0.5);
  }
  .card:active {
    transform: translateY(1px);   /* whole pixels only, so text stays sharp */
  }
  .card:focus-visible,
  .btn:focus-visible {
    @apply outline outline-2 outline-offset-2 outline-signal;
  }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
```

- No `transition-all` or `duration-300/500` anywhere.
- Any class used in JS-rendered markup (`spotify-sorter.js`, `weighted-rng.js`) must be written out in full in the source. No interpolated class names, or Tailwind will remove them.

---

## Phase 1: Foundation and home page

Ship this, live with it for a few days, then start phase 2.

### `tailwind.config.js`
- Add the colour tokens above (using CSS variables, so dark mode is a variable swap rather than a `dark:` class on every element).
- `fontFamily.sans` → Inter, `fontFamily.mono` → JetBrains Mono.

### `assets/css/input.css`
- Define the CSS variables for light and dark mode on `:root` / `.dark`.
- Remove `transition-colors duration-300` from `body`.
- Add `.card`, `.btn`, the focus styles, and the reduced-motion block.
- Optional: a very faint hairline grid background (`.bg-grid`), at most 4–6% opacity. Cut it if it looks busy.

### `_layouts/default.html`
- `@font-face` declarations and `<link rel="preload">` for Inter.
- Add `<meta name="description">` (from `page.description` or `site.description`), Open Graph and Twitter card tags, and `<meta name="color-scheme" content="light dark">`.
- Fix the favicon: `type="image/svg+xml"`, not `image/x-icon`.
- Delete the `.theme-transitioning` style block. Theme switches are instant.
- Minimal footer: name, year, GitHub source link. Nothing else.

### `_includes/navbar.html`
- No brand: the links (`Home`, `Tools`, `CV`) sit on the left in Cinzel uppercase, the theme toggle on the right. The name lives in the home title card, the page title and the footer. The active page is marked by an accent underline.
- The theme toggle stays an icon button with an `aria-label`. Delete the `setTimeout`/`theme-transitioning` lines in the click handler.
- Mobile menu: add `aria-expanded` and `aria-controls` to the toggle button.

### `index.html`
Section headers use small mono indices (`01`, `02`, `03`) as the only typographic flourish.

1. **Intro**
   - ~~Keep the profile photo.~~ **No photo anywhere on the site, by choice (privacy).** The hero is the name between two filigrees; the share image is the same title card. Don't reintroduce a portrait or avatar ring.
   - Name, one-line focus ("Networked systems · CS"), and two actions: `Contact` (anchor) and `CV` (PDF link).
2. **About**
   - Keep the existing bio copy word for word, as plain left-aligned prose. No tabs, no hover reveals, no footnotes.
3. **Projects** (new)
   - 3–5 entries in a simple list or two-column grid: title, one sentence, stack tags in mono, link. Candidates: networked systems coursework or research, custom Android kernel builds, the PC build, Spotify Playlist Sorter, Weighted RNG.
   - **Needs content from me.** List the projects and write a sentence for each before implementing.
4. **Contact**
   - Email card: `mailto:` link plus a **Copy** button (`navigator.clipboard.writeText`). On success the button label changes to "Copied" for about 1.5s, announced through an `aria-live="polite"` region. If the clipboard call fails, the `mailto:` link is still there.
   - Social links (LinkedIn, GitHub, Facebook, Instagram) as a compact grid using `.card`. Brand colour appears only on the icon, with an instant border change on hover.

---

## Phase 2: Tools

### `tools.html`
- Same `.card` treatment. Each card: name, one-sentence description, a row of mono stack tags (`OAuth 2.0 PKCE`, `MusicBrainz API`, `D3.js`), and an arrow.

### `tools/weighted-rng.html` + `assets/js/weighted-rng.js`
- **Restyle only (separate commit):**
  - Weights in mono, row actions visible at all times (not only on hover).
  - The O(n) and O(s log n) explanations become plain cards with complexity badges.
  - D3 chart colours read from the CSS variables, so the chart follows the theme. Bars use `signal` and axes use `muted`.
- **Feature (its own commit):** a result banner after "Pick Random" showing the chosen item and its probability (`weight / total × 100%`).

### `tools/spotify-sorter.html` + `assets/js/spotify-sorter.js`
- Restyle the page and the markup in `renderPlaylists()` with the shared tokens. Spotify green appears here only.
- **Do not touch** the PKCE auth flow, MusicBrainz rate limiting and batching, or the in-place move sorting logic. Only change markup and classes.

---

## Explicitly out of scope

- Themed section names (patch bay, telemetry, comms link, module rack, mastering deck).
- A tabbed or hover-reveal "spec sheet" for hobbies.
- Footer with build info, latency, or other fake status readouts.
- Rotary-dial or VU-meter avatar bezel, LED progress bars, inline interactive footnotes.
- View Transitions API for the theme toggle.
- A third font family or a second accent colour.

---

## Verification

1. **Build**
   ```bash
   npm run build:css
   ```
   ```bash
   bundle exec jekyll build
   ```
2. **Commit `assets/css/styles.css`.** It's checked in and there is no CI build, so if it isn't rebuilt and committed the live site breaks without any error.
3. **Lighthouse** (mobile) on `/`, `/tools`, `/tools/weighted-rng.html`, `/tools/spotify-sorter/`. Target ≥ 95 for Performance and Accessibility.
4. **Contrast**: check every text/background pair from the token table in both themes. AA is required.
5. **Keyboard-only pass**: tab through every page. Every interactive element must show a visible focus ring and nothing should depend on hover.
6. **Reduced motion**: enable it in the OS or DevTools and confirm the press effect is off.
7. **Widths**: 360px, 768px, 1280px. No horizontal scroll, and the contact grid wraps cleanly.
8. **Spotify sorter regression**: sign in, sort a small playlist end to end, and confirm the order matches the pre-redesign behaviour.
