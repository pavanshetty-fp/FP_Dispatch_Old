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


---

## The order card, rebuilt (2026-11-20, round 2)

Pavan: *"it's not good enough."* Three lo-fi directions went to him in
`prototypes/ui2-card-sketches.html`; he picked **B, capped**.

**What was wrong with the first card**

1. No headline figure — the total gallons, the number that decides everything,
   was not on the card at all.
2. Four zones at one volume (head row, left column, right column, foot strip)
   with no reading order; the height was set by whichever column was taller.
3. The products floated in an unlabelled right column.
4. The loudest thing was the least useful — a full-width tinted fit strip.
5. Five pills competing: type, status, blend, the window when it clashed, the fit.

**B, as built** — three bands, grouped by space, no rules between them:

| Band | Holds |
|---|---|
| **Which order it is** | checkbox · order number · type disc · planned / unplanned · **the fit**, quiet, on the right (a planned order says who has it instead) · the button into the sheet |
| **Where it goes** | ship-to · address · the delivery window (amber only when it cannot be met) · the run from the hub |
| **What is on it** | a chip per product, the blend's share beside the name, every quantity on one right edge — **capped at two** — then a foot: "3 products · 2 in a blend" · **+1** · **8,950 gal** |

The `Blend` pill is gone; the load foot says it in words. The fit strip is gone;
the fit is a line in the head where its question belongs.

**Height** 178–207px, near-constant whatever is on the order, because the cap
holds the load band to two rows. Uncapped it ran to 248.

**Checks** V1 54/54, V2 54/54, no console errors, no clip findings at 1512×950.
`_smoke.js` gained a V2 branch for the band stack, the capped load band and its
"+N", and the blend label moving to the foot.

---

## The order card, round 3 (2026-11-20) — Pavan driving

Pavan: *"it's not working, so let me guide you on how to design this."* What
follows is his spec, not mine. It replaced the band card on **every** card.

**Two units, a rule between them.**

| Unit | Holds |
|---|---|
| **Which order, where, when** | checkbox · order number · order type · **status and a forward chevron on the right edge** · a pin and the ship-to, with the address one hover away · the delivery window as a clock time with AM/PM, behind a clock icon |
| **What was asked for** | the FPDS **lines table**, in a card of its own 6px off the order card's left, right and bottom edges |

**Off the card:** the fit ("13% fits"), the run from the hub, the external-link
icon, the address as a printed line.

### The lines table
The FPDS `unit.lines-table`: a tinted header band, 44px rows, cells that *are*
the control rather than a bordered box inside a cell, everything left-aligned,
a total closing it with a top rule only.

**Product · Blend ratio · Quantity · Type.** The quantity and the type are
editable in place; the product is not. Type defaults to `gal` and offers
`L · each · case · drum · pail`.

**A blend is its constituents, one row each** (Pavan, second pass): CLR DSL at
B5 · 95% and Biodiesel at B5 · 5%, each with its own quantity, **joined by a
bracket** so two blends on one order read as 2 + 2 rather than four unrelated
products. Typing into a constituent moves the whole blend and its partner
follows in ratio — a blend trimmed on one side is off-spec fuel, not a smaller
order.

### The lane, and the card itself
- **No status rail.** Plain white cards, a soft resting shadow lifting on hover.
- **The orders lane is white**, and its sticky hour ruler with it.
- The horizontal view's cards are auto-height and each lane takes its tallest;
  the card widened from 290 to 400 to hold the table.

---

## Fill the rest (2026-11-20)

Under the drawn truck in the open lane: the orders that would fill the room
left. Each is a **whole order** — no splitting — and has to clear four things
at once:

1. the fuel fits the compartments still open,
2. the delivery window can be met inside this driver's shift,
3. the run there, the drop and the run back fit what is left of the shift,
4. and that time also fits the hours Samsara says the driver has.

Picked greedily, so the list builds on itself. Each suggestion is a **row with
its own filled Add button** — an order goes on without being dragged — plus
"Add all N" when there are several. Drag and drop is untouched.

**Room is not placeable room.** One product can spread across the empty
compartments and top up compartments already holding that product, but it
cannot share a compartment with something else. So the head states both —
"3,055 gal of room · at most 2,500 in one order" — and when nothing fits, the
strip says why rather than going blank.

### The data had to change for it to be testable
The day's orders are cut to fill **whole rigs**, so on a part-loaded truck
nothing fits and the strip only ever fired on an empty one. A handful of the
unplanned orders are therefore **re-cut at load** to the room the fleet
actually has left — one per driver who would otherwise be offered nothing —
with a ship-to near that driver's hub and a window that closes with their
shift. No orders were added: the pool is still 26, and the smallest went from
2,100 gal to 1,300.

**18 of the 20 on-duty drivers** can now be offered something, part-loaded rigs
among them. Two cannot, correctly: their rigs are full, or their hours will not
cover the run. The figure is a *starting* one — plan orders yourself and the
fleet drifts away from what those orders were cut for.

### Checks
`_smoke.js` V2 **55/55**, V1 **54/54**, merged file green, no console errors and
no clip findings at 1512×950. Two V1-only checks (the left/right split, the
constituent chips) are skipped for V2, which has its own: the card's bands, the
inner card's 6px inset, the blend brackets, the ratio-preserving edit, the
suggestion rules, and a guard that at least 15 drivers — 4 of them part-loaded —
can be offered a real order from the day's own pool.

---

## Cleaning up the right column (2026-11-20, round 4)

Pavan's spec again, in his order.

### The driver
Avatar · name · **an edit pencil** (changes the driver) · **a forward chevron**
(opens the record). Then the shift time behind a clock icon, and under it what
is left of it — "starts in 30m", "4h 12m left", "ended 1h ago", "Off duty" —
**dotted-underlined**, because there is more behind it.

**Hovering the shift** opens a card holding everything about that driver's
clock: the shift drawn with its buffer, the four Samsara boxes, and a filled
**Open driver details** CTA. The card sits inside the hovered group with no
gap, so the pointer can travel into it.

Off the lane: the duty-state pill, the hub and sync line, the always-on HOS
strip, the "Change driver" link. **Cost, stated:** the at-a-glance HOS warning
chip is gone — a driver near a limit now only shows it on hover.

**The driver is its own card**, standing beside the truck's: white, outline
rim, 10px corners, a resting shadow lifting on hover, the selected rim on the
chosen lane. The column behind them is white and its sticky header with it;
the lane is only the row that holds the two cards. Width 180 → 264px, because
the longest name in the roster ("Owen Fitzgerald", 109px) has to sit beside the
avatar, the grip and two controls.

### Moving a lane
The **Move** link is gone. **Six dots** at the head of the driver card, grab
cursor. It indicates; clicking it runs the same move the link did. *True
drag-to-reorder is not built.*

### The truck, collapsed
With **nothing planned**, the card says only what the rig is — `LT-46 ·
Transport · 5 compartments · 10,500 gal` — and then **"Load planning not
started."** No empty compartment boxes, no divider, no "0 orders", no
"0% · 0 of 10,500 gal".

With **load on it**, the order count moves up into the head as its own group
and the divider above the stops goes:
`TW-7 · Tank wagon · 3 compartments   1 order   62% · 3,100 of 5,000 gal`

---

## Rearranging fuel: the load is a table (2026-11-20, round 5)

Pavan: *"not satisfactory, or not even intuitive."* Three ways went to him in
`prototypes/ui2-move-fuel.html`; he picked **A**.

**What was wrong.** Five steps — click the source, read a toast, click the
target, set a number in a popover, press Move. It was a mode, and the mode was
invisible between the two clicks. It was the one thing on the screen you
clicked twice. The rules (full, wrong product) only arrived after you had
picked. And the number field being asked for was already there, three clicks
deep.

**A, as built.** The compartments are the lines table: **Comp · Product ·
Gallons · Full**, the gallons typed in place. It is a budget you balance — take
400 out of C3 and the card holds **"400 gal of CLR DSL still to place"**, the
rim goes amber, and every empty compartment reads **"Empty — takes CLR DSL"**.
Type it into C4, or press **Put it where it fits**. **Undo** restores the whole
round, not the last keystroke.

The rules now arrive as you type: a compartment clamps to its capacity and says
why; one product per compartment is refused by name; a second product cannot be
loosened while one is still loose. *Only one product is loose at a time — two
pools would need the foot to list both.*

The two-click move is retired. Compartments on the drawing are still drop
targets for orders.

---

## The open lane's middle, side by side (2026-11-20, round 6)

The compartment table on the **left at 300px**, the truck drawn **beside it on
the right**, one band instead of two. Head and foot of the card unchanged.

**The drawing drops its numbers there.** It used to print `C1 · 1,200 / Empty /
0 gal / 0% · Empty` in every compartment — all four now sit in the table a few
inches away. Beside the table it keeps `C1 C2 C3` and does what it is for: the
shape, the fill levels, the colours. It scales to its column rather than
scrolling.

Checked on the worst case — a transport **and** a trailer, eight compartments:
eight table rows, the drawing a readable silhouette at 52px. *Cost, stated: on
a full rig the drawing is a thumbnail.*

One real bug this surfaced: `sp2FitRig` redraws the SVG after layout once it
knows the width, and it did not know about the split — it was putting the
labels back and sizing to the card. It now draws bare and measures the column.

### Checks
V2 **55/55**, V1 **54/54**, merged file green, no console errors and no clip
findings at 1512×950. Checks that read the drawing's product, gallons and fill
now read the **table**, and one asserts the drawing does not repeat it; the rig
geometry check measures "fits its column" rather than V1's fixed side padding.
