# Darius Lung

A modern, static personal website.

## Tech Stack

### Core Architecture
* **[Jekyll](https://jekyllrb.com/):** Static Site Generator (Ruby-based). Handles layout templating (`_layouts`, `_includes`) and markdown processing.
* **[Node.js](https://nodejs.org/):** Package management and build environment for frontend assets.

### Styling & UI
* **[Tailwind CSS](https://tailwindcss.com/):** Utility-first CSS framework for rapid, custom UI development.
* **[PostCSS](https://postcss.org/):** Tool for transforming styles with JS plugins (handles Tailwind compilation and Autoprefixer).
* **[Fancybox & Carousel](https://fancyapps.com/):** Lightweight JavaScript library for the image gallery and slider on the landing page.

### Data Visualization
* **[D3.js](https://d3js.org/):** Dynamically render responsive, data-driven SVG bar charts for statistical distributions.

### Hosting & Deployment
* **[GitHub Pages](https://pages.github.com/):** Static hosting environment.
* **[GitHub Actions](https://github.com/features/actions):** Automated workflow (`deploy.yml`) that sets up Node and Ruby, compiles Tailwind CSS, builds the Jekyll site, and deploys it to the `gh-pages` environment.

## Local Development Setup

To run this project locally, you will need **Ruby**, **Bundler**, and **Node.js** installed on your machine.

### 1. Install Dependencies
Clone the repository and install both Ruby and Node dependencies:

```
# Install Node dependencies (Tailwind, PostCSS, etc.)
npm install

# Install Ruby dependencies (Jekyll)
bundle install
```

### 2. Start the Development Servers

Because this project uses PostCSS to compile Tailwind classes, you must run two processes simultaneously in separate terminal windows.

**Terminal 1: Tailwind Watcher** This command watches your HTML/JS files for new Tailwind classes and compiles them into `assets/css/styles.css` in real-time.

```
npx postcss assets/css/input.css -o assets/css/styles.css --watch
```

**Terminal 2: Jekyll Local Server** This command serves the static site and automatically reloads the browser when layout or configuration changes occur.

```
bundle exec jekyll serve --livereload
```

Open `http://localhost:4000` in your browser.