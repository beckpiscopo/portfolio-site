# Design Reference — beckpiscopo.xyz

Quick reference for keeping any material (dashboards, decks, charts, social) coherent with the portfolio site. Source of truth: `src/theme.css` (`:root`) and `src/input.css`.

---

## Color palette

Four-color warm/earthy palette. These four are the whole brand — everything else is a tint or a role mapping.

| Name | Hex | RGB | Role |
|------|-----|-----|------|
| **Van Dyke** (brown) | `#3E1F14` | `62, 31, 20` | Primary text (light mode) · background (dark mode) · darkest anchor |
| **Caramel** | `#BE7C4D` | `190, 124, 77` | Hover/accent surfaces · secondary warm tone · mid-ramp |
| **Jasper** (terracotta) | `#BE5A38` | `190, 90, 56` | Emphasis: links, italic accents, key data points |
| **Isabelline** (cream) | `#F2E9E4` | `242, 233, 228` | Background (light mode) · text (dark mode) · lightest tone |

### Light vs dark roles

| Token | Light mode | Dark mode |
|-------|-----------|-----------|
| Background | Isabelline `#F2E9E4` | Van Dyke `#3E1F14` |
| Text | Van Dyke `#3E1F14` | Isabelline `#F2E9E4` |
| Nav links | Van Dyke `#3E1F14` | Caramel `#BE7C4D` |
| Link/accent (emphasis) | Jasper `#BE5A38` | Caramel `#BE7C4D` |
| Link hover bg / text | Caramel bg / Isabelline text | Caramel bg / Van Dyke text |
| Text selection | bg Caramel `#BE7C4D`, text Isabelline `#F2E9E4` | same |

**Rule of thumb:** in light mode, *jasper* carries emphasis; in dark mode, *caramel* takes over (jasper gets muddy on the dark brown).

---

## For Tableau / external charts

Tableau accepts hex directly (Edit Colors → custom). Suggested derivations from the brand palette:

**Categorical (distinct series)** — order by salience:
1. Jasper `#BE5A38` (primary / the thing you want noticed)
2. Caramel `#BE7C4D` (secondary)
3. Van Dyke `#3E1F14` (anchor / totals)
4. (neutral filler) a muted taupe like `#9B8579` or `#C9B8AD` if you need a 4th that won't compete

**Sequential ramp (low → high)** — the warm ramp the site uses for its contribution heatmap, flattened to solid stops:
`#F2E9E4` → `#BE7C4D` → `#BE5A38` → `#3E1F14`
(cream → caramel → jasper → van dyke). Good for intensity/density. Set the chart background to Isabelline `#F2E9E4` so the lightest step reads as "near-zero," matching the site.

**Diverging** — the palette isn't built for true diverging (no cool counter-hue). If you need one, pair Jasper `#BE5A38` (high) against a desaturated slate like `#5B6B6E` (low) with Isabelline `#F2E9E4` at the midpoint, and treat it as off-brand-but-compatible.

**Backgrounds:** use Isabelline `#F2E9E4` for light, Van Dyke `#3E1F14` for dark — not pure white/black. Gridlines/borders: a faint version of the text color (~14–20% opacity), e.g. van dyke at ~15% (`rgba(62,31,20,0.15)`).

---

## Typography

| Use | Font | Notes |
|-----|------|-------|
| Display / headings (h1–h3) | **Young Serif** | Chunky slab-ish serif. Headings, big numbers, the name lockup. |
| Body / UI / nav / lists / tables | **Hanken Grotesk** | Warm humanist sans. Chosen for readability at body sizes. Weights: 400/500/700, italic 400. |
| Hero tagline only | **Cormorant Garamond** *(italic)* | Elegant italic serif, kept as a single accent on the home hero ("I build…"). Loaded on index only. |
| Mono (data terms) | `ui-monospace, SFMono-Regular, Menlo` | Inline code-style terms only. |

All Google Fonts. The pairing is a **serif display + humanist sans body** (Young Serif headings over Hanken Grotesk body), with one deliberate serif accent on the hero. For Tableau, neither web font is on the Tableau server; fall back to a sturdy sans (e.g. system default / Arial) for body and a serif (Georgia) for titles, and reserve the exact look for exported/static pieces where you control fonts.

### Fluid type scale (`clamp(min, preferred, max)`)

Headings/body size themselves fluidly between mobile and desktop. For static materials, use the **max** (desktop) values as fixed sizes:

| Token | Role | min → max |
|-------|------|-----------|
| `--step-3` | h1 / display | 2.20 → **3.20 rem** (~35–51px) |
| `--step-2` | h2 | 1.75 → **2.20 rem** (~28–35px) |
| `--step-1` | h3 / lead-in | 1.40 → **1.70 rem** (~22–27px) |
| `--step-0` | body | 1.10 → **1.30 rem** (~18–21px) |
| `--step--1` | caption / meta | 0.94 → **1.05 rem** (~15–17px) |

Roughly a 1.25 (major-third) modular ratio. Line-heights: headings tight (1.08–1.20), body 1.6.

---

## Texture & detail tokens

- **Faint borders:** current text color at low opacity — `border-faint` = 20%, `border-faint-soft` = 14%. (Auto-adapts to light/dark since it's `currentColor`.)
- **Tinted surfaces:** very light caramel washes, e.g. `color-mix(in srgb, var(--color-caramel) 7–16%, transparent)` for figure frames, card placeholders, callouts.
- **Section heading accent:** a 2.5rem caramel hairline (`#BE7C4D`, 2px) under each `h2`.
- **Corner radius:** `0.5rem` on cards/figures/video embeds.
- **Emphasis style:** italic + jasper for inline emphasis (`.accent`), rather than bold.

---

## One-line summary

Warm earthy four-color palette (terracotta **#BE5A38** for emphasis, caramel **#BE7C4D**, deep brown **#3E1F14**, cream **#F2E9E4**), serif display + sans body (Young Serif headings, Hanken Grotesk body, Cormorant Garamond italic only on the hero), cream/brown backgrounds instead of white/black, italic-jasper for emphasis over bold.
