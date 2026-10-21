# Design Overhaul Plan (revised)

## Goal

Move `dariuslung.github.io` off the generic Tailwind card look and onto a calm, editorial, technical style that feels like *me*: networked systems, kernels, PC building, hi-fi audio, badminton, films, games. Every hover and click responds instantly. The page should feel precise without looking like a costume.

## Principles

1. **One idea, held back.** The reference is a well-set technical document: a clear grid, hairline rules, small monospace index numbers. That's the whole concept. No patch bays, rack modules, VU meters, telemetry footers, or `SYS.*` labels.
2. **Instant feedback.** Colour and border changes on hover are immediate (`transition: none`). Motion appears only in the 1px press on `:active`.
3. **Nothing fake.** No made-up metrics, build info, or "latency" readouts. Every number on the page has to be real.
4. **Content over chrome.** A projects section and a CV link do more for "professional" than any widget.
5. **Accessible by default.** AA contrast, visible focus states, reduced-motion support, and nothing that only works on hover.

---

## Design tokens

### Colour

| Token | Light | Dark | Use |
| :--- | :--- | :--- | :--- |
| `paper` / `carbon` (bg) | `#F5F3EE` | `#0B0D10` | Page background |
| `surface` | `#FFFFFF` | `#12151A` | Cards, panels |
| `ink` (text) | `#16181C` | `#E7E5E0` | Body text |
| `muted` | `#5F6368` | `#9AA0A6` | Secondary text, labels |
| `rule` | `#D6D3CB` | `#262A31` | Hairlines, borders |
| `signal` (accent fill) | `#FF4F00` | `#FF4F00` | Fills, borders, markers, focus rings |
| `signal-text` | `#C23B00` | `#FF6A26` | Accent *text* and links |

- `#FF4F00` on paper is about **3:1**, which fails AA for text. Use it only for fills, borders and markers. Accent text in light mode uses `#C23B00` (about 4.8:1 on paper).
- **One accent sitewide.** Spotify green `#1DB954` appears only inside the Spotify sorter. No second green for "status".
- Check every final pairing with a contrast checker before shipping.

### Typography

- **Two families, self-hosted** as `woff2` in `assets/fonts/`, with `font-display: swap` and the primary weight preloaded:
  - **Inter** (variable): headings and body. It's already in `tailwind.config.js` but was never loaded; this fixes that.
  - **JetBrains Mono** (400 only): section indices, weights, complexity badges, small labels.
- Drop Space Grotesk. A third family costs load time and adds little.
- Body text is left-aligned (remove `text-justify`, which leaves gaps between words at narrow widths).

### Interaction

```css
@layer components {
  .card {
    @apply relative bg-surface border border-rule;
    transition: transform 60ms ease-out;
  }
  .card:hover {
    @apply border-ink;
    box-shadow: 2px 2px 0 0 theme('colors.ink'); /* explicit colour, not currentColor */
  }
  .card:active {
    transform: translateY(1px);   /* whole pixels only, so text stays sharp */
    box-shadow: 1px 1px 0 0 theme('colors.ink');
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
- Plain name on the left, links on the right (`Home`, `Tools`, `CV`), with the active page marked by an underline or accent rule.
- The theme toggle stays an icon button with an `aria-label`. Delete the `setTimeout`/`theme-transitioning` lines in the click handler.
- Mobile menu: add `aria-expanded` and `aria-controls` to the toggle button.

### `index.html`
Section headers use small mono indices (`01`, `02`, `03`) as the only typographic flourish.

1. **Intro**
   - Keep the profile photo. Replace the blurred glow and conic spinner with a single thin ring (static, or slowly rotating and stopped under reduced motion).
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
6. **Reduced motion**: enable it in the OS or DevTools and confirm the avatar ring and press effect are off.
7. **Widths**: 360px, 768px, 1280px. No horizontal scroll, and the contact grid wraps cleanly.
8. **Spotify sorter regression**: sign in, sort a small playlist end to end, and confirm the order matches the pre-redesign behaviour.
