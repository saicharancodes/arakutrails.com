# AI Coding Guardrails & Project Guidelines

## Project Context
- **Repository**: https://github.com/saicharancodes/arakutrails.com.git
- **Website Purpose**: Araku Trails — travel, tourism, and guide portal for Araku Valley.
- **Deployment Platform**: Cloudflare Pages (Free Tier).

---

## 1. Cloudflare Free Tier Constraints (Strict)
- **Static First**: All code must build to static files (`.html`, `.css`, `.js`, media) that can be served directly by Cloudflare Pages without a Node.js server.
- **No Heavy SSR/Server Dependencies**: Do not introduce Express, Next.js SSR, or persistent background server runtimes. If dynamic serverless logic is strictly needed, use Cloudflare Pages Functions (`/functions`).
- **Asset Size Limits**: Keep individual media files well below 25MB (Cloudflare Pages limit). Compress images (WebP/AVIF format preferred) in the `images/` folder.
- **Zero-Cost Policy**: Do not introduce third-party paid APIs, paid databases, or paid services without explicit user approval.

---

## 2. Technology Stack & Architecture
- **Core**: Semantic HTML5, Vanilla JavaScript, and clean CSS.
- **Dependencies**: Keep external dependencies minimal or zero. Prefer modern native browser APIs (`fetch`, `IntersectionObserver`, `dialog`, CSS Grid/Flexbox).
- **Structure**:
  - `index.html`: Main landing page
  - `images/`: Local media assets
  - Clean modular styling and scripts (avoid unnecessary bulky build tools unless requested).

---

## 3. SEO & Tourism Site Standards
- **Mobile First**: Araku Valley visitors browse primarily on mobile devices while traveling. Ensure responsive layouts and touch-friendly controls.
- **SEO Best Practices**:
  - Semantic HTML tags (`<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`).
  - Single descriptive `<h1>` per page with proper heading hierarchy (`<h2>`, `<h3>`).
  - Essential meta tags: `<meta name="viewport">`, `<meta name="description">`, Open Graph (`og:*`), and Twitter Card tags.
  - Alt text on all informational imagery.

---

## 4. AI Behavior & Drift Prevention
- **No Framework Drift**: Never rewrite the codebase into heavy client-side frameworks (React, Angular, Vue, Next.js) without explicit user instructions.
- **Preserve Existing Content & Links**: Retain existing copy, guide trails, contact links, and styling; enhance incrementally rather than wiping existing sections.
- **Path Resolution**: Use clean relative paths (e.g., `./images/...` or `/images/...`) compatible with Cloudflare Pages hosting.
- **Documentation Integrity**: When updating features, keep documentation and comments synchronized.
###test
