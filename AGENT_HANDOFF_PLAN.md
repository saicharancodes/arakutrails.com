# Araku Trails Agent Handoff Plan

**Last updated:** 2026-10-15
**Status:** Planning and security-first implementation
**Owner:** Araku Trails

## Purpose

This file is the working guardrail for AI-assisted changes to Araku Trails. Read it before changing architecture, deployment, authentication, booking flows, SEO, or content structure.

When requirements, architecture, priorities, or deployment assumptions change, update this file in the same change. Record the reason and the impact in the change log.

## Product

Araku Trails is a static travel website for Araku Valley, Visakhapatnam, Vanjangi, and Lambasingi tour packages. Its goals are:

- Generate trustworthy tour enquiries and bookings.
- Rank for useful regional travel searches.
- Convert visitors through phone, WhatsApp, email, and booking forms.
- Remain inexpensive and deployable on Cloudflare's free tier.

## Current Architecture

- **Frontend:** semantic HTML5, vanilla JavaScript, CSS.
- **Pages:** `index.html`, four tour pages, and the legacy `admin121100.html` redirect.
- **Backend:** Cloudflare Worker entry point at `_worker.js`.
- **Static assets:** Cloudflare Worker Assets from the repository root, configured in `wrangler.toml`.
- **Database:** Cloudflare D1 binding named `DB`.
- **API:** `functions/api/bookings.js`; legacy custom admin API is scheduled for removal.
- **Deployment:** Cloudflare Worker with static assets, not a Node.js server and not SSR.
- **Dependencies:** keep minimal; prefer browser and Cloudflare platform APIs.

## Non-Negotiable Constraints

- Keep the site static-first and compatible with Cloudflare free tier.
- Do not introduce React, Vue, Angular, Next.js, Express, SSR, a CMS, or a required build server.
- Do not add paid services or APIs without explicit approval.
- Preserve existing tour copy, prices, destinations, contact details, and working links unless the change explicitly replaces them.
- Use relative paths compatible with the current deployment.
- Do not commit passwords, tokens, API keys, or other secrets.
- Do not expose source files, database schema, worker code, or admin interfaces as public assets.
- Keep changes focused; do not rewrite unrelated pages or styling.
- Add only short comments for behavior that code cannot make clear by itself.

## Decisions Already Made

### Authentication

There are currently two admins. Replace the custom client-side admin authentication with Cloudflare Access. Protect a separate `/admin/` area with an Access policy for the two admin email addresses. Do not preserve hardcoded credentials, client-side password storage, custom reset questions, or client-managed sessions.

Before deployment:

- Rotate the previously exposed admin password; it is compromised because it was shipped in client JavaScript and git history.
- Remove admin credentials and the custom admin authentication code from public pages.
- Remove the legacy public `admin121100.html` redirect after the new protected area works.
- Keep admin booking access behind Cloudflare Access and validate Access identity at the Worker/API boundary where needed.

### Images

Use manual one-time conversion to WebP or AVIF; do not add a build pipeline for the current image count. The performance benefit comes from smaller image files, explicit dimensions, responsive loading, and lazy loading, not from whether conversion is manual or automated.

Use descriptive slugged filenames such as `araku-borra-caves.webp`. Update every HTML and CSS reference. Keep hero/LCP imagery optimized and preload only the actual above-the-fold image.

### Blog

Use a same-domain subdirectory: `/blog/`, not a separate subdomain. Blog pages can build search visibility when they answer specific Araku/Vizag travel questions with original photos, accurate timings/prices, useful advice, freshness dates, and internal links to relevant tour pages. A blog alone does not guarantee higher rankings.

## Implementation Order

### Phase 0: Security and data integrity

1. Rotate the exposed admin credential.
2. Separate the admin UI from `index.html` into protected `/admin/` content.
3. Configure Cloudflare Access for exactly the two admins.
4. Remove custom admin credentials, password reset logic, shadow passwords, and legacy admin routes.
5. Harden `POST /api/bookings` with server-side validation, payload limits, origin protection, Turnstile if configured, and server-generated IDs.
6. Make tour-page submissions use the same booking persistence path as the homepage.
7. Fix unsafe HTML/JavaScript interpolation and remove inline admin event handlers where practical.
8. Remove committed binaries and prevent repository internals from being served.
9. Add a privacy policy covering customer data and third-party form delivery.

### Phase 1: Crawlability and deployment hygiene

1. Add `robots.txt` with a sitemap URL and admin exclusion.
2. Add `sitemap.xml` for public pages and later blog URLs.
3. Add a useful `404.html` and route missing assets to it.
4. Add `_headers` with security headers and long-lived cache rules for versioned static assets.
5. Add canonical URLs and normalize the chosen production host.
6. Mark admin pages `noindex` as defense in depth.
7. Verify that `_worker.js`, `functions/`, `wrangler.toml`, and `d1_schema.sql` are not publicly downloadable.

### Phase 2: Search and sharing metadata

1. Add concise canonical titles and descriptions to every public page.
2. Add Open Graph and Twitter metadata with a real 1200x630 share image.
3. Add `TravelAgency`/`LocalBusiness` JSON-LD to the homepage using the exact verified business NAP.
4. Add tour/offer and breadcrumb structured data to tour pages.
5. Add FAQ structured data only when the visible FAQ content exists and is accurate.

### Phase 3: Performance, accessibility, and conversion

1. Make the homepage H1 available in static HTML, not only injected by JavaScript.
2. Optimize and dimension all content images; add useful alt text, `loading="lazy"`, and responsive sources where useful.
3. Remove failed or unnecessary font requests and reduce render-blocking third-party assets.
4. Extract duplicated tour-page JavaScript only when behavior remains identical.
5. Link tour pages from navigation, footer, and related-package sections.
6. Add inclusions, exclusions, price conditions, cancellation/refund terms, operator identity, and genuine testimonials.
7. Add accessible skip links, modal semantics, focus handling, keyboard escape behavior, reduced-motion support, and decorative icon labeling.
8. Track calls, WhatsApp clicks, and successful booking submissions with a privacy-conscious analytics solution.

### Phase 4: Content and audience growth

Publish original, practical `/blog/` guides such as:

- How to reach Araku Valley from Visakhapatnam.
- Vanjangi sunrise timings, access, weather, and preparation.
- Borra Caves timings, tickets, and visitor tips.
- Best time to visit Araku Valley.
- Lambasingi weather by month.
- A realistic one-day Araku itinerary.

Each article should have an author, publication and update dates, original images, accurate facts, FAQs where useful, and links to a relevant package. Do not create thin or AI-generated pages solely to increase URL count.

## Business Tasks Outside the Repository

These are part of the plan but cannot be completed safely by code alone:

1. Create and verify a Google Business Profile as a service-area/local business where eligible.
2. Keep the business name, address, phone, email, and hours consistent everywhere.
3. Verify the domain in Google Search Console and submit `sitemap.xml`.
4. Set up free privacy-conscious analytics and measure calls, WhatsApp clicks, and forms.
5. Collect genuine customer reviews and respond to them.
6. Add consistent free local listings such as TripAdvisor, Justdial, Sulekha, and IndiaMART where appropriate.
7. Publish regular original destination content and short-form photos/videos.
8. Never buy backlinks or publish false reviews.

## Required Validation Before Deployment

- Run the site's available validation/tests and inspect the changed files for errors.
- Check every public page title, description, canonical, H1, links, and structured data.
- Test the site on a narrow mobile viewport and a desktop viewport.
- Test booking submission from the homepage and every tour page.
- Confirm bookings are stored once, with server-generated IDs and validated fields.
- Confirm `/admin/` requires Cloudflare Access.
- Confirm old admin URLs do not expose credentials or an admin console.
- Confirm `robots.txt`, `sitemap.xml`, `404.html`, and security headers are served.
- Confirm repository internals and secrets return 404 or are otherwise blocked.
- Use PageSpeed Insights, Search Console URL Inspection, and Google's Rich Results Test after deployment.

## Change Guardrail

Before making a structural or architectural change, the agent must:

1. Read this file and the relevant `AGENTS.md` instructions.
2. State which current decision or phase the change affects.
3. Prefer the smallest compatible implementation.
4. Update this file if the change alters architecture, deployment, authentication, data flow, dependencies, URLs, SEO strategy, or implementation order.
5. Add a short entry to the change log below.
6. Validate the affected behavior before moving to an unrelated task.

## Change Log

- **2026-10-15:** Created this handoff plan. Recorded Cloudflare Access for two admins, manual WebP conversion, same-domain `/blog/`, static-first architecture, security-first sequencing, and free-tier constraints.
