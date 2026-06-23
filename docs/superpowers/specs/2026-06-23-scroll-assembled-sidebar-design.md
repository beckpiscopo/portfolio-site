# Scroll-Assembled Sidebar — Design Spec

**Date:** 2026-06-23
**Branch:** `feature/scroll-sidebar`
**File affected:** `index.html` (plus rebuilt `dist/output.css`)

## Goal

Turn the single-screen hero on `index.html` into a longer scrolling page. As the
visitor scrolls past the hero, the name, navigation menu, and social links
"morph" from the centered hero into a fixed left sidebar. The menu becomes a
working table of contents that highlights the active section. On mobile, the
sidebar is replaced by a sticky top bar with a hamburger drawer.

## Non-Goals

- No new dependencies or build tooling beyond the existing Tailwind/PostCSS setup.
- No real content for Projects/Writing yet — placeholders only (owner fills later).
- No live-reload/dev-server changes.
- No changes to other pages (`resume.html`, `connect.html`, syllabus pages, etc.).

## Page Structure

One scrolling document with three regions:

1. **Hero** — full viewport height (`100vh`), content centered. Keeps the existing
   copy: "Hello," / "I'm Beck Piscopo." / "I build research intelligence systems".
   The longer intro paragraphs currently in the hero move down into the About
   section, leaving the hero short and punchy.

2. **Main column** — contains four anchored sections in order:
   - `#about` — the intro paragraphs relocated from the hero.
   - `#projects` — 2–3 placeholder project cards (title, blurb, GitHub link).
   - `#writing` — 2–3 placeholder post links (title, date, link to paragraph.com).
   - `#contact` — closing call-to-connect with the social icons.
   On desktop the main column is inset from the left (padding) to leave room for
   the fixed rail. On mobile it spans full width.

3. **Sidebar (`#sidebar`)** — `position: fixed` left rail (desktop only) holding:
   - Compact name ("Beck Piscopo").
   - TOC menu: About / Projects / Writing / Contact (in-page anchor links).
   - Social icons (GitHub, X, Paragraph, Farcaster) — reused from current hero.
   - The existing dark-mode toggle, relocated here.

## Desktop Behavior — the "morph"

True single-element morphing from center to rail is fragile, so we use a robust
approximation that reads as one continuous motion:

- A scroll handler, throttled with `requestAnimationFrame`, computes
  `progress = clamp(scrollY / heroHeight, 0, 1)` and writes it to a CSS custom
  property `--p` on `:root`.
- CSS interpolates off `--p` as it goes 0 → 1:
  - The centered hero copy **fades out and lifts** (`opacity` 1→0, slight upward
    `translateY`).
  - The sidebar **slides in from the left** (`translateX` negative→0, `opacity`
    0→1), with the compact name scaling up from small — timed to the same
    progress so the name appears to travel from center into the rail.
- **Graceful degradation:**
  - `prefers-reduced-motion: reduce` → skip interpolation; sidebar is simply
    docked and visible (the "always-on" fallback).
  - JS disabled → sidebar defaults to visible. Page remains fully usable.

## Active Section Highlighting

An `IntersectionObserver` watches the four sections. When a section enters the
viewport's active band, the matching TOC link gets an `active` class (styled with
the site's accent color / weight). Clicking a TOC link smooth-scrolls to the
section (`scroll-behavior: smooth` or JS `scrollIntoView`).

## Mobile Behavior (below Tailwind `md` breakpoint)

- No morph, no fixed rail.
- A slim **sticky top bar** shows the name + a `☰` hamburger button (`#menu-toggle`).
- Tapping the hamburger toggles a slide-out **drawer** (`#sidebar`) containing the
  TOC and social icons. Reuses the `menu-toggle`/`sidebar` hooks already stubbed
  in the existing inline script.
- Sections stack vertically; full-width main column.

## Content (Placeholders)

All new section content is clearly marked placeholder, preserving the site's
fonts, colors, and dark mode:

- **About:** existing intro paragraphs (real content, just relocated).
- **Projects:** 2–3 cards with placeholder titles/descriptions and `#` GitHub
  links, marked with `<!-- TODO: replace placeholder -->`.
- **Writing:** 2–3 placeholder post entries (title + date + link), marked TODO.
- **Contact:** short connect message + existing social icons.

## Styling Constraints

- Use existing Tailwind utilities and theme (`font-libre`, theme colors, dark
  mode classes) — no new color values introduced.
- Dark mode must work across hero, sidebar, and all sections (existing
  `dark:` variants and the auto-by-hour + manual toggle logic preserved).
- After editing, rebuild CSS via `npm run build-css` so new utility classes land
  in `dist/output.css`.

## Out-of-Scope Cleanup Worth Noting

The current inline script already references `#menu-toggle` and `#sidebar`
elements that don't exist; this design makes those references valid by adding the
elements. The "hide dark toggle on scroll" logic is superseded by moving the
toggle into the sidebar and will be removed/replaced.

## Verification

After implementation, rebuild CSS and (with owner's OK) drive the page in Chrome to confirm:

1. Hero → sidebar morph animates smoothly on scroll (desktop).
2. TOC active-link highlighting tracks the visible section.
3. TOC links smooth-scroll to their sections.
4. Mobile: hamburger opens/closes the drawer; links work and close the drawer.
5. Dark mode renders correctly in hero, sidebar, and all four sections.
6. `prefers-reduced-motion` shows the docked sidebar without animation.

Capture screenshots of desktop (top + scrolled) and mobile (bar + open drawer)
for review.
