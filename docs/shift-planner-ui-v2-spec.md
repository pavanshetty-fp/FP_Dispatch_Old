# Shift Planner V2 — the build brief

> Written 2026-11-20 from Pavan's answers. **Settled items are final** and I
> build them without asking again. Six items are still open and are drawn in
> `prototypes/ui2-options.html`.

---

## Settled

### Levels
- **Level 3 is a side sheet** that slides over the planner (FPDS `RecordSheet`,
  right side, 56px gap).
- **Two sheets, not one**: an **order sheet**, and a **combined driver + truck
  + trailer sheet**.
- **No lane collapses.** The resting lane, the open lane and the sheet all stay.
  (The 160 → 56px collapse comes later, as part of putting the planner on the
  main page. Not now.)

### Opening things
- An order card does **not** open its sheet on click. **Selection stays** on
  click; a **dedicated button on the card** opens the order sheet.
- A lane opens on click as it does now; an **icon** opens the driver sheet,
  where the old "View detail" link was.

### New on the order card
- A **checkbox**, so several orders can be picked and dragged onto a truck in
  one go.
- **Distance and a drive estimate from the hub** to the ship-to — the hub is a
  real place, so the figure is real work.

### Order card hierarchy
1. **Primary:** order number · order type · planned / unplanned.
2. **Primary, lower:** ship-to.
3. **Kept:** the address.
4. **Products:** every product its own chip. (Arrangement open — see below.)
5. **Fit:** hidden until a truck is picked.

### The delivery window
- The window is **important** and stays on the card.
- It is **matched against the selected driver's shift**, and **says so when it
  conflicts**. The window itself carries the warning, not the whole card.

### Detail below the third level
- Tooltips and hovers carry what is below sheet-level, judged per fact.

### Header
- The label is **V1** / **V2**, beside "Shift Planner".
- **The date and time range come out of the header.**

### Theme
- **Light only.** Dark once light is finished.

### From FPDS, not asked
Type 12 / 14 / 16 / 18 (+10, 11 for named narrow jobs) · card text levels
14 semibold → 13 medium muted → 12 muted · units grouped by spacing with 10px
uppercase headings, no field labels · radii 6 / 8 / 10 / 14 / full · status by
kind · **render the absence** · "+N" opens the shared BreakdownCard on click ·
no visible scrollbars · `RecordSheet` for level 3.

---

## The six Pavan left to me (2026-11-20) — built as picked

| # | Question | Built |
|---|---|---|
| 8 | How the product chips arrange | **8B** — a chip per product, each on its own row, the quantity on one right edge, the blend's share between them |
| 11 | The truck at rest | **L-C** — the compartments survive as an 18px strip, each filled to its own level in its product's colour, still a drop target |
| 12 | Hours at rest | **Exception only** — a chip naming the binding clock when it is amber or red, nothing when every clock is fine. The full four-clock strip is in the open lane; the dials, cycle, ELD graph and duty log are in the sheet |
| 14 | What the lane states | One capacity read-out — "82% · 7,400 of 9,000 gal" — and the order count beside the stops |
| 9 | The DS "Card fields" menu | **Not built.** Good defaults instead of a menu that defers the decision |
| 15 | Can you act from the sheets | **No.** Both are read-only, no footer, Esc or ✕ to close. Changing a driver, a truck or a load stays in the lane, so the two can never disagree |
| 16 | A rail on the order sheet | **Yes** — a tinted Order summary card (products, window, run from the hub, fit against the chosen rig, then Total ordered) and an Activity card |

---

## What V2 is, as built

`prototypes/shift-planner-ui2.html` — **V1 is untouched** apart from gaining its
own `V1` label.

**The order card** now leads with the order number, its type disc and its
planned / unplanned pill on their own row, with a checkbox at the left and the
button that opens the order sheet at the right. Below that the old split holds:
ship-to, address, the delivery window and the run from the hub on the left; the
product chips in aligned rows on the right; the fit across the foot.

**Several orders at once** — tick any number of cards and drag one of them;
they all go, packed in turn into the same rig, with one toast at the end. A
"N picked · Clear" chip sits in the orders header while anything is ticked.
Dragging an unticked card is still one order.

**The run from the hub** is a stable pseudo-distance per hub + ship-to pair, so
it never moves for the same pair and it changes when you look at a driver who
sets out from somewhere else. No routing engine behind it.

**The delivery window** is matched against the selected driver's shift. A window
that merely opens before the shift is not a clash — the delivery still has hours
inside the shift. Only a window that cannot be met turns amber, and the window
itself carries the colour.

**The resting lane** is ~112px instead of 160px: name, duty, the hours chip when
one bites, shift, hub, then the truck with one capacity read-out and the
compartment strip. Every tool (+Trailer, Move, Unload, Change driver) and the
full HOS strip belong to the open lane, which is unchanged.

**Scale** — the off-ramp 7.5, 9.5 and 15px type and the 3, 5 and 9px radii are
gone; scrollbars are hidden everywhere, as the DS has them.

### Checks
`_smoke.js` runs against both files and branches on the six checks that read
V1's lane and card structure. **V1 54/54, V2 54/54**, no console errors and no
clip or overflow findings on either, at 1512×950.

### Not done
V2 is not in the merged `prototypes/fleetpanda.html`; it is a standalone file.
Dark theme is deliberately out until light is finished.
