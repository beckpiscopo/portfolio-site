# Exploded constellation — scene 2 figure redesign

**Date:** 2026-07-16
**Branch:** homepage-refresh
**Status:** Approved for planning

## Problem

The Abstract scene (`#abstract`, scene 2 of the deck) uses the `dispersal`
formation. `assignDispersal()` in `assets/js/figure-engine.js` re-homes every
node to a uniform random position (`Math.random()` across the full canvas),
with edges and hub off and stage alpha 0.55. On the dark plate this reads as
snow / static — ambient randomness with no visible intent. It is the only
formation with no composition rule; every other formation (constellation,
margins, grid, rows, orbit) has a legible shape.

The scene's caption — "Fig. 2 — Dispersal. Scattered information, awaiting
relation." — describes a deliberate contrast with Fig. 1's connected
constellation, but the visual doesn't deliver it.

## Concept

Scene 2 becomes an **exploded diagram of Fig. 1**: the same clusters, taken
apart. Clusters separate radially and loosen internally, and faint ghost
marks remain where structure used to be. The scene 1 → 2 morph becomes the
story: the constellation visibly comes apart rather than dissolving into
noise. The relation is absent but *indicated* — which is what "awaiting
relation" means.

The formation keeps its name (`dispersal`), its scene markup, and its
caption. Only the home-assignment geometry and a formation-scoped annotation
draw pass change.

## Design

### Explode geometry (replaces `assignDispersal` internals)

1. Use the current `clusters` array (the constellation's composition, built
   by `layout()`). Compute the composite center as the weighted centroid of
   the clusters.
2. For each cluster, compute an **exploded center**: push it radially
   outward from the composite center to ~1.6–1.9× its original distance
   (per-cluster factor randomized within that band), clamped inside canvas
   padding (`PAD`-derived margin).
3. Assign each **non-dust** node to its nearest cluster, measured from the
   node's current home (`hx`,`hy`) — the constellation home if arriving from
   scene 1, or wherever the previous formation left it. Nearest-cluster
   membership is computed against the *original* cluster centroids.
4. Re-home the node around its cluster's exploded center using a **freshly
   sampled** gaussian offset at ~2.2× the cluster's spread (same sampling
   style as `clusterSample`) — groups stay legible but visibly loosened.
   Offsets are resampled rather than scaled from the node's previous home:
   arriving from a non-constellation formation (e.g. margins), existing
   offsets can be enormous and scaling them would clamp nodes into the
   canvas edges. Clamp final homes to canvas padding.
5. **Dust nodes** keep their existing behavior (uniform scatter at 0.38
   alpha) — they are the ambient layer and remain so.
6. Store the explosion metadata in a module-level object (pattern follows
   the existing `orbit` object): original centroids, exploded centers, and
   per-cluster ghost radius (derived from cluster spread).

### Resize behavior

On `resize()` while in this formation, the existing code calls
`FORMS.dispersal.assign()`. That assign must first re-run `layout()` for a
fresh composition sized to the new canvas, then explode from it. Resize is
already a visual discontinuity; no continuity requirement.

### Ghost annotations (formation-scoped draw pass)

Drawn only while `formation === 'dispersal'`, in the ink color (theme-aware,
same `inkA` convention as nodes):

- A **dashed hairline circle** at each former cluster centroid, radius
  derived from that cluster's spread (~2× spread, min ~18px), stroke ~0.7px,
  at ~15% ink alpha (multiplied by `stageAlpha` and ghost visibility).
- A small **"+" registration tick** (~5px arms) at each ghost center, same
  alpha treatment.
- A **dotted hairline leader** from each ghost center toward its exploded
  cluster center, stopping short of the cluster (~70% of the way),
  indicating the direction structure departed. Leaders are behind a single
  module-level flag (`GHOST_LEADERS = true`) so they can be A/B'd live and
  dropped without surgery if they read as busy.

**Ghost visibility easing:** a new eased 0→1 multiplier (`ghostVis` /
`ghostTarget`), identical pattern to `edgeVis`/`hubVis`, with target 1 only
for this formation. Ease rate chosen so ghosts fade in after the morph has
substantially settled (slower than the 0.05 used for edges — ~0.02, tune in
polish). Leaving the formation eases ghosts back out.

**Reduced motion:** the existing `setFormation` reduced-motion path snaps
nodes to homes and forces multipliers to targets; ghost multiplier joins
that snap so ghosts render immediately in the single painted frame.

### Unchanged

- Formation name `dispersal`; `index.html` scene markup and
  `data-formation` attribute; caption text.
- `FORMS.dispersal` visibility profile: `edges: 0, hub: 0, alpha: 0.55,
  interactive: false`.
- All other formations and the intro choreography.

## Verification

- Expose a read-only debug getter on `window.FigureEngine` (e.g.
  `getDebug()` returning `{ formation, ghostCenters, explodedCenters }`)
  for the test suite.
- Extend `scripts/verify-deck.mjs`:
  - After navigating to scene 2 and settling, assert node homes are
    **clustered, not uniform**: mean distance from each non-dust node home
    to its nearest exploded center must be well below the uniform-scatter
    baseline for the canvas size (threshold derived at implementation time
    from the 2.2× spread scale).
  - Assert ghost centers exist (≥ 2) and lie within canvas bounds.
  - All pre-existing checks stay green (17/17 at last run).
- Manual pass: watch the 1 → 2 morph and 3 → 2 morph live, both themes,
  plus reduced-motion snap. Confirm ghosts read as annotation, not clutter;
  decide `GHOST_LEADERS` on/off.

## Out of scope

- Any change to other scenes/formations, scene controller, captions, or
  markup.
- The deferred non-blockers on record in `.superpowers/sdd/progress.md`.
