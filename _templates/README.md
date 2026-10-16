# Araku Trails — Owner's Expansion Guide & Architecture Manual

This manual explains how to add new trails, packages, guides, experiences, and blog articles to **arakutrails.com** without breaking layout, styling, or SEO.

The site is built with pure, static HTML5, CSS, and Vanilla JavaScript. There is **no build step**, **no React**, and **no server runtime**.

---

## 1. How to Add a New Trail

1. **Duplicate the Template:**
   - Copy `_templates/TRAIL-PAGE.html` to `trails/<your-trail-slug>.html` (e.g., `trails/katiki-waterfalls-trail.html`).
2. **Replace the Placeholders:**
   - Search for `{{...}}` tags (listed at the top of the template) and replace them with your real trail details (name, distance, difficulty, partner village, safety notes).
3. **Add the Trail Card to Listings:**
   - Open `trails/index.html`.
   - Copy the `<!-- TRAIL CARD START -->` snippet from `_templates/SNIPPETS.html` into the `.grid-2` section.
   - If you want it featured on the homepage, paste the card into the `grid-2` in `index.html#trails`.
4. **Update `sitemap.xml`:**
   - Add `<url><loc>https://arakutrails.com/trails/<your-trail-slug></loc><changefreq>weekly</changefreq><priority>0.8</priority></url>`.

---

## 2. How to Add a Classic Package

1. **Duplicate the Template:**
   - Copy `_templates/PACKAGE-PAGE.html` to root `/<your-package-slug>.html`.
2. **Fill in Details:**
   - Set price, itinerary steps, inclusions, and exclusions.
3. **Link on Homepage:**
   - Open `index.html`. In the `#packages` section, copy a `<!-- PACKAGE CARD START -->` block from `_templates/SNIPPETS.html` and append it into `.carousel-snap-wrapper`.
4. **Update `sitemap.xml`:**
   - Add the new package URL entry.

---

## 3. How to Add a Guide Profile

1. **Add Portrait Image:**
   - Place a square photo in `images/` (e.g., `images/guide-ramu.jpg`).
2. **Add Guide Card:**
   - Open `guides/index.html`.
   - Copy `<!-- GUIDE CARD START -->` from `_templates/SNIPPETS.html` and insert it into `.grid-3`.
3. **(Optional) Full Profile:**
   - If they have a dedicated story, copy `_templates/GUIDE-PROFILE.html` to `guides/<guide-slug>.html`.

---

## 4. How to Add a Blog Post

1. **Duplicate the Template:**
   - Copy `_templates/BLOG-POST.html` to `blog/<your-article-slug>.html`.
2. **Add Article to Journal Index:**
   - Open `blog/index.html` and add a link card to the new guide.
3. **Update `sitemap.xml`:**
   - Add `<url><loc>https://arakutrails.com/blog/<your-article-slug></loc><changefreq>monthly</changefreq><priority>0.6</priority></url>`.

---

## 5. How to Add Images

- Place images in `images/`.
- Use descriptive WebP or compressed JPG formats (e.g. `araku-katiki-stream.webp`).
- Always keep image files under 1MB (ideally under 250KB for fast mobile loading).

---

## 6. How to Change Colors or Fonts

- Open `css/tokens.css`.
- All design tokens are located in `:root`.
- To adjust the primary Araku earth red accent, change `--laterite: #B5442A;`.
- To adjust the page mist background, change `--paper: #FAF7F2;`.

---

## 7. Cloudflare Deployment Checklist

- `_templates/` is listed in `.assetsignore` and will **never** be served publicly.
- When committing changes to git, do **not** add secrets or passwords.
