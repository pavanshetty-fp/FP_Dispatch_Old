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

---

## The day, down the driver card (round 7)

**Asked for.** Once orders have been added, the driver card shows the order
numbers, the expected delivery time, and whether that time falls in the
delivery window — as a vertical timeline.

**Built.** A `Route` block at the foot of the driver card, under a hairline,
drawn only when the rig has orders. One row per stop, in the order the day runs
them:

- a node on a rail — green in window, blue early, red late
- the expected time, tabular, and the order number
- under it, the verdict in words plus the window itself: `In window · 8a–11a`,
  `Waits 2h 46m · 12:55p–3:55p`, `13m late · 6:16a–8:16a`

The head reads `Route · 3 stops`, and adds `· 1 outside` when a stop misses.
A row selects its order, the same as the stop chip does. Hovering it gives the
ship-to, the window and the gallons. A shut lane shows four stops and offers
`+N more stops`, which opens the lane; the open lane shows them all.

**How the time is worked out.** Twenty minutes to load out of the hub, then
drive; thirty minutes on the hose at each ship-to; legs between two ship-tos
are pseudo-distance from the same hash the hub trips already use, so the day is
consistent with itself. A driver who arrives before the window opens **waits** —
the wait is carried into the next leg, which is how a run drifts late. The
verdict is the raw arrival against the window, not the waited one.

**Said out loud.**

- *The colour is on the node, not the words.* Thirty lanes of coloured text is
  not a reading. The words carry the fact; the node carries the glance.
- *The lane got taller.* A driver card with five stops is about 110px taller
  than one with none, and the lane takes the taller of its two cards.
- *The stop chips at the foot of the truck card now repeat the order numbers* —
  and carry the order's own time, not the expected one, so one lane shows two
  times per order. Left alone pending a decision.

---

## The row, and the day behind it (round 8)

**The row.** Ship-to first and largest, the expected time at the right-hand
edge, the order number and the verdict on the line below:

```
●  Harbor Marine — Slip 40                  07:24
   D-5157218 · In window
```

The window itself moved into the row's tooltip, with the ship-to and the
gallons, because the three facts plus a window do not fit 226px and the verdict
already answers the question the window would.

**The time model is no longer mine.** It is the one in
`FP-DS-2026/docs/context/fleet-trucks-and-routes.md`:

| Component | Rule |
|---|---|
| Dispensing | gallons ÷ the truck's own meter gpm |
| Service | 20 min + 1.2 min × assets, per ship-to |
| Buffer | <500 gal 5 min · <1,500 10 · <3,000 15 · else 20 |
| Loading | gallons ÷ 600 gpm + 25 min, once, at the hub |
| Travel | miles ÷ 25 mph wagon / 31 mph transport |
| Return | the last stop back to the hub always counts |

Assets sit at the low end of the doc's 5–100 (fuel sites with a handful of
tanks), which is ~25–40 min on site. **That skew is load-bearing**: at the
middle of the range the model says five stops will not fit an eight-hour shift,
which is also why the field research reads "3–4 deliveries per shift".

A wait shorter than ten minutes is not called a wait — the stop's own buffer is
5–20 minutes wide and absorbs it.

**The day rebuilt as runs.** The orders were cut to fill whole rigs one at a
time, which is the opposite shape to a route. So the planned side is now built
from the dispatch docs:

- *"typical 3–4 deliveries per shift"* and *4.0 stops per load* on the
  consolidated Corpus Christi day → **every planned rig runs 4 or 5 ship-tos**
- *"drivers own regions; cross-region delivery is unusual"* → a hub serves the
  states around it, read off the ship-to's own address. Twenty-two sites were
  added so each of the five regions holds two whole runs
- *"single truck per ship-to is the norm"* → sites are reserved as runs are
  built, so two rigs out of one hub never share a stop
- *"low product mix"* → one product down the run, a second on the last stop
- average fill 76% on the consolidated day → runs are cut to 74–92% of the rig,
  and the rigs that left the yard full stay full
- a trip **out of region** is now 160–500 miles, so the planner refuses it
  instead of quietly offering a Denver rig a Tampa drop

The whole-rig cuts stay in the unplanned column, where the fit chip and the fit
sort still need them. The day now reads: 10 rigs with runs, 45 planned orders,
54 unplanned, 50 ship-tos, 31 stops in window, 11 waiting, 3 late.

**Said out loud.**

- *Capacities were not touched.* The class bands are fixed in the truck-types
  doc, and a 2,800-gal bobtail running five 500-gal drops is a real day.
---

## Does the driver get home? (round 9)

The stops answer *"does this one make its window"*. The run as a whole has its
own question, and the return leg is the part nobody sees until it is too late.
So the route closes with a line:

```
Back at the hub 14:12 · 1h 12m past the shift
```

Always the hub time; the overrun only when there is one, and only that clause
is red. It counts the wait at the last stop, the time on site there, and the
drive home — the return leg always counts, as the docs have it. Five of the ten
runs come in clean; the other five overrun, two of them by about ten minutes.

**And the truck stands on the card.** The drawing beside the compartment table
was centred in the band; it now sits on the table card's baseline, so the
bottom of the truck and the bottom of the card are the same line.
- *The miles are still a hash.* In region they are 2–30 miles and the arithmetic
  on top of them is now the documented model, but no road distance is real.
- *Off-duty drivers no longer carry planned orders.* They have no shift to run
  one in. Yard rigs still read "Load planning not started", which is the point
  of the yard.

---

## The head of a column (round 10)

Both columns are now built the same way, and nothing that narrows a list sits
on the line that names it.

```
Orders 54                               [funnel] [sort] [≡ ⋮] [↗]
[ Unplanned 54 | Planned 45 | Outside 3 | All 99 ]

Driver & truck 30   [search driver, truck or hub]           [↗]
[ All 30 | Available 20 | Driving 10 | On duty 10 | Off duty 10 ]  [🕐 All AM PM]
```

- **The count sits with the name**, not out in the row.
- **Quick filters are out**, on their own line under the name: Unplanned ·
  Planned · **Outside** · All for the orders, the availability tabs and the
  shift for the drivers.
- **Outside** is new: the planned orders a run does not reach inside the window
  the customer was given. It is a property of the *run*, not of the order — the
  same order on another rig may well be made — so it is read off the routes
  once per render, and the quick filter and its count come from that one read.
- **The funnel** holds the rest of the filters. Blend lives there now, and the
  funnel carries a dot whenever anything behind it is narrowing the list, so a
  short list never passes for the whole list.
- **Sorting is its own icon** beside it: Time · Fit · **Driver**. Only one of
  the two menus stands open at a time.
  - *Driver* puts every driver's orders together, in the order their day runs
    them. It is a planned reading, so orders nobody has taken fall to the
    bottom rather than scattering through the list.
  - *Fit* is offered only while a rig is chosen, and names the rig it would
    rank against. Clicking the open lane lets go of it — and letting go puts
    the list back in time order.
  - A time axis cannot be re-ordered, so the horizontal view is locked under
    any sort but Time.
- **The shift unit names itself from the inside** — a clock in the unit instead
  of a SHIFT label beside it.
- **`fit vs BT-4` is gone.** The rig the fit is measured against is now named
  on the Fit row in the sort menu, where the fit sort is chosen.
- **Collapse / expand is gone**, root and branch: the switch, the handler, the
  state and the eighteen compact rules.

**Said out loud.**

- *Every lane is now drawn in full.* Dropping compact cost about a third of the
  drivers that used to fit on a screen.
- *The driver column's funnel has nothing to hold yet*, so it has none. Hub
  would be the obvious first filter to put behind one.

---

## Built on the design system's own unit (round 11)

The head was in two control rows. **`unit.toolbar` forbids that** — *"Don't add
a second toolbar row"* — and the second row was also the bug: a menu opened
from the tools dropped straight onto the quick filters underneath it. Both
columns are now the DS list page:

```
Orders 54                                              ← the name, alone
[ Unplanned · Planned · Outside · All ] [⚲] [⇅]   [≡][⋮] [↗]   ← unit.toolbar
```

Taken from `unit.toolbar` and `template.list-page`:

- **One control row, never two.** Left narrows, right scopes and presents.
- **Quick filters lead the left, before search** — *they decide which set you
  then search inside* (ui §10c).
- **Every control in the row is 32px.** Search is the DS's 320px, shrinking
  before it wraps.
- **The display switch is icon tools on the right, the current one on the chip
  fill** — `--chip`, not the accent (ui §10p).
- **Filters carries its applied count** in a bubble, the way the DS's trigger
  does. Sort carries what the list is in — nothing while it is in time order,
  because that is the list's natural order and not something the reader did.
- Both are icon triggers named by their tooltip, as the DS's icon tools are.

**The bug.** Two things were wrong and both are fixed: the menu hung off its
own button, so on a two-row head it landed on the filters — it now hangs off
the **head**, lines itself up under whichever button opened it, and always
clears the head onto the list. And picking a sort left the menu standing open
over a list it had just re-ordered — a sort is one choice, so the menu closes
behind it. Filters is a set, so that one stays open until you click away.

**Said out loud.**

- *The availability tabs no longer stretch.* They filled the row because they
  were told to; they are 376px of content now, not 735px of air.
- *Both heads come out at 83px*, one toolbar row each, with 4px to spare in the
  orders column at the default split — which is what makes the two columns
  behave alike. A test holds them to it.
- *Filters and Sort lost their words* to make that 4px. The tooltip names them,
  which is how the DS names an icon tool, but a word is always clearer than a
  glyph — if the orders column were wider they could carry one.

---

## The card states its load, and opens for the detail (round 12)

An order card is a table most of the time, and most of the time nobody needs
the table. So at rest the card ends in **one line** instead:

```
▸  3 products        Blend        5,700 gal
```

- **The count is the table's own rows**, so what the line says and what opening
  it shows are the same thing — a splash blend's constituents count as the
  products they are.
- **The total is the table's total**, printed by the same code.
- **A blend says so on the line.** Every place an order's products are listed
  has to carry that label (blends §3.10), and a summary is such a place.
- Opening swaps the line for the table **inside the same frame**, so the card
  changes its contents and not its shape. The caret moves to the Total row,
  which is where you shut it again.
- **One icon does the lot**, in the toolbar's right cluster beside the view
  switch: expand every order, or collapse every one. The glyph and the tooltip
  say which it will do next.
- **Everything starts collapsed.**

The cards drop from ~340px to 150px, so the column holds four or five orders
at a glance instead of one and a half. The horizontal view's lane heights know
the difference — a shut card is one line, an open one is a row per line the
table actually draws.

**Also.** The pop-out moved from the toolbar to the name line. It is a window
action, not a view tool, and the toolbar needed the 36px: with the new icon in
it, the orders row was wrapping again and the two column heads stopped matching.
They are both 95px now, one control row each, with 24px to spare.

---

## A planned order answers with its own rig (round 13)

A planned order already has a driver, and therefore a truck. Nobody else can
take it without releasing it first. So the question "which rig?" is already
answered, and thirty rows of fleet are thirty rows in the way of the answer.

Selecting a planned order now:

- **opens that driver's lane** — the truck, the compartments, the load and the
  whole day's route, with this order's stop marked as the one selected;
- **shows that rig and no other.** The column is pinned to it, whatever the
  availability tabs and the shift filter say, because those narrow a search and
  this is not a search any more;
- **carries no tick.** The checkbox gathers orders to drag onto a rig; a
  planned order is already on one.

Picking another planned order moves the column to that rig. Three things let
the fleet back: picking an unplanned order (any rig might take it), pressing an
availability tab, or typing in the search — each of them is the reader asking
the column a question of their own.

**Said out loud.**

- *The pin has no control of its own.* There is no "show all" button; the way
  out is to ask the column something, which is what a reader does next anyway.
  If it turns out to strand people, a chip on the driver head is the fix.
- *The counts on the availability tabs still describe the fleet*, not the one
  rig shown. They are what you would get if you pressed them, which is the
  useful reading.

---

## The Unified View's list head, on the driver column (round 14)

The orders column is untouched. The driver column is now headed by the units
the Unified View uses, in the DS list page's order:

```
Driver & truck 30                                          [↗]
All · Denver Hub ⟳ ⋯            + View                     [Export]   ← unit.view-row
[All·Available·Driving·On duty·Off duty] [🕐 All AM PM] [search] [Filters 1] [Group ▾]
Hub Denver Hub ×   Clear all                                          ← unit.chip-shelf
```

**unit.view-row.** All first, never "Default". Saved views after it, each with
a gray `RefreshCw` **update icon** while it has unsaved changes and a ⋯ menu
(Update view · Rename · Delete) that fades in on hover. `+ View` opens *Save
current view*; the box is empty with a **suggested name** read from what is
narrowing the list, and → or Tab takes the suggestion. Export is rightmost and
goes through a sheet that states the narrowing — never a silent export.

Each tab keeps its own unsaved changes: leaving a view parks them, coming back
finds it as it was left, and **pressing the tab you are on is the reset**. A
view stores the whole state — availability, shift, search, facets and the
grouping — and opens in it.

**unit.toolbar.** Left narrows, in the order somebody actually narrows: quick
filters (availability, shift), then the 320px search with its glyph and clear
X, then Filters, then Group by.

**unit.filter-panel.** 600px, the facets down a 200px menu with their ticked
counts, options to the right, and a footer that counts the rows **before** you
commit — ticks stage until Apply, and Esc discards them. Four facets: Hub ·
Truck class · Trailer · Planning. Clear All empties and applies at once.

**Group by** puts the lanes in headed sections — Hub · Truck class · Shift ·
Planning — with a count per section; pressing the same dimension again ungroups.

**unit.chip-shelf** appears only while something narrows the list, one removable
pill per value, with Clear all.

**Said out loud.**

- *Availability and shift stayed out as quick filters* rather than becoming
  facets. They are short, exhaustive and flipped many times a session, which is
  the DS's own test for a quick filter.
- *The head is 186px* — a view row, a toolbar that wraps its Filters and Group
  onto a second line at this column width, and a chip shelf. The orders column
  stays at 95px, which is what you asked for, so the two no longer match.
- *Hub and truck class move together in the sample fleet* — both are assigned
  off the same index, so filtering to one hub leaves one class. The facets are
  right; the data behind them is correlated. Decorrelating it needs more
  ship-tos per region, since the run builder reserves five per rig.
- *Views live for the session only.* The DS keeps them in localStorage per
  list; this is a prototype in one file.

---

## Nothing narrows from the row (round 15)

The driver column's control row is now **search and Filters, and nothing else**.

- **Available is a saved view**, not a tab — the one the planner opens on. Its
  state is the single facet `Availability: Has room`, and arriving at it still
  freezes the ordering so the rig you are loading does not slide out from under
  you.
- **Every other narrowing is a facet**: Availability · Duty · Shift · Hub ·
  Truck class · Trailer · Planning. The availability tabs and the AM/PM segment
  are gone from the row.
- **Group by is gone.** The lanes are a working surface, not a report.

`sp2SetDrvFilter()` and `sp2SetShift()` survive as the way to set those facets
in one call — the controls moved, the narrowings did not.

A bug fixed on the way: a wrapping flex box asks for its widest child, not the
sum, so the left cluster shrank to the search box's 320px and sent Filters onto
a second line. It takes the row's width now.

---

## Filters worth adding — for review

Built, and on the row before this round:

| Facet | Values | What it answers |
|---|---|---|
| Availability | Has room · Full | Can this rig take anything at all? |
| Duty | Driving · On duty · Off duty | Is the driver out, in, or off today? |
| Shift | AM · PM | Which half of the day is this rig working? |
| Hub | the five hubs | Which region's rigs am I planning? |
| Truck class | Bobtail · Tank wagon · Transport | Is the rig the right size for this order? |
| Trailer | Hitched · None | Is there pup capacity behind it? |
| Planning | Planned · Not started | Which rigs still have no day on them? |

**Proposed — none of these are built.**

| Facet | Values | What it answers | Worth it? |
|---|---|---|---|
| **Room left** | Empty · under ¼ · ¼–½ · over ½ | "I have a 2,000 gal order — who can take it whole?" Availability says yes/no; this says how much. | **Yes** |
| **Compartments free** | 0 · 1 · 2 · 3+ | One product cannot share a compartment, so free gallons are not placeable gallons. This is the number that decides whether a NEW product can go on. | **Yes** |
| **Product on board** | UNL87 · CLR DSL · … | Topping up a compartment needs no empty one. "Who already has CLR DSL?" is the fastest way to place a diesel order. | **Yes** |
| **Hours left** | over 4h · 2–4h · under 2h · out | The binding Samsara clock. A rig with room is no use if the driver cannot legally finish the run. | **Yes** |
| **Run risk** | misses a window · ends past the shift · clean | The exceptions list — the rigs that need a decision today. Pairs with Outside on the orders side. | **Yes** |
| **Shift state** | not started · mid-shift · ended | A yard rig not yet started is the one to load first; one whose shift ended cannot take anything today. | Maybe |
| **Stops planned** | none · 1–3 · 4–5 | Find the under-used rigs against the 3–4 a shift the field reports. | Maybe |
| **Line of service** | Tank wagon · Transport · Lubes & packaged · Propane | The packing rules change per line — splitting, one-full-compartment, warehouse loading. | **Needs the data model first** — trucks carry no line of service yet; truck class is standing in for it |
| **Region / state** | CO · AZ · OR · FL · CA | Redundant while a hub serves exactly one state, which is how the sample data is built. | Skip |
| **Meter rate** | under 300 gpm · 300–500 · over 500 | Dispensing is gallons ÷ meter, and a slow meter on a big drop is what pushes a run past the shift. Too thin to filter on by itself. | Skip |

The first five are the ones a dispatcher asks while planning. Say which you
want and they go in behind Filters.

---

## The five filters, built (round 16)

Added behind Filters, in the order a dispatcher reaches for them:

| Facet | Values | Why |
|---|---|---|
| **Room left** | Empty · Over half · Quarter to half · Under a quarter · None | Availability says whether; this says how much. |
| **Compartments free** | None · 1 · 2 · 3 or more | One product cannot share a compartment, so free gallons are not placeable gallons. |
| **Product on board** | the products carried, or Nothing | Topping up needs no empty compartment. A rig answers with a LIST, and a tick matches if any of them is on it. |
| **Hours left** | Over 4h · 2–4h · Under 2h · Out | The binding Samsara clock. Room is no use if the driver cannot finish. |
| **Run risk** | Misses a window · Ends past the shift · Clean · Not planned | The exceptions. A run can both miss a window and finish late, so this one is a list too. |

Facets can now answer with a list, not just a value — `sp2FacetMatch` takes an
overlap where it gets an array.

**A contradiction fixed on the way.** Availability read *Has room / Full*, but
`sp2Avail` also excludes off-duty drivers — so ten rigs that are completely
empty read as "Full" while Room left called them Empty. The values are now
**Available / Not available**, which is what the test actually asks: can this
rig take work, on duty and with space. How much space is the facet underneath.

Not built, and why:

- **Shift state** and **Stops planned** — useful, not asked for yet.
- **Line of service** — the one worth most, since the packing rules change per
  line. Trucks carry no line of service in the model; truck class stands in.
- **Region / state** and **Meter rate** — redundant and too thin.

---

## The environment's servers (round 16)

`FP DS 2026/.claude/launch.json` now lists three, down from five:

| Kept | What it runs |
|---|---|
| `unified-view` | `dev:unified` — the Unified View prototype |
| `service-work` | `dev:service` — the Unified View locked to Service Work (`SERVICE=1 vite`; the script was added to `FP-DS-2026/package.json`, which only had `build:service`) |
| `shift-planner` | the static server on 4810 that serves the planner prototypes |

Removed: `fp-ds-gallery`, `customer-portal`, `design-reference`.

**Pricing has no server to keep.** It is not an entry point — there is no
`PRICING` flag in `vite.config.ts` and no pricing module; it is the
`pricing-handoff` **branch** of FP-DS-2026, which runs as the Unified View once
checked out. Wiring a launch entry would mean switching branches on start,
which is not something a server config should do.

The copy inside `FP-DS-2026/.claude/launch.json` still lists all five. It is a
tracked file in that repo with its own push and sync drill, so it was left
alone.

---

## Cross-checked against the design system (round 17)

Checked the driver column's head against `unit.view-row`, `unit.toolbar`,
`unit.filter-panel`, `unit.chip-shelf`, `template.list-page`, UX-36, UX-167 and
IX-12.

**Three real deviations, all fixed.**

1. **The chip shelf had the wrong anatomy.** I built one chip per *value* with
   the label in bold. The unit is one chip per **facet**: one value reads
   `Label: value ✕`; several collapse to `Label` + a count bubble + ✕, with a
   hover card listing each value and its own ✕. The label is muted and the
   value is ink, and the pill is 28px. Rebuilt.
2. **"Clear All" and "Apply Filters" carried capitals.** `unit.filter-panel`
   and IX-12 spell them that way, but **UX-167** (2026-11-13, later, and
   eval-enforced by `copy-case`) says sentence case for every button. Later
   wins: **Clear all** and **Apply filters**. *The DS contradicts itself here —
   worth settling in the DS rather than per prototype.*
3. **Two facets disagreed about the same rigs.** Availability read *Has room /
   Full* while `sp2Avail` also excludes off-duty drivers, so ten rigs that are
   completely empty read "Full" under one facet and "Empty" under another. The
   values are now **Available / Not available**.

**Already right:** All first and never "Default"; no preset view tabs; the gray
`RefreshCw` update icon on a changed view; ⋯ with Update view · Rename ·
Delete; the suggested view name with → / Tab, and Save with an empty box taking
it; Export rightmost and always through a sheet; each tab keeping its own
unsaved changes and the tab you are on being its reset; one control row, left
narrows and right presents; the 320px search with its glyph and clear X;
Filters carrying its applied count; the 600px panel with a 200px facet menu,
ticks that stage until Apply, Esc discarding them, a live "N results" on the
left and Clear all beside Apply on the right; the shelf only while something is
applied, with Clear all directly after the last chip.

**Deviations kept, and why:**

- The orders column's display switch is two icon tools on the chip fill, not
  the DS's bordered segment (2026-10-23). You asked for that column untouched.
- No per-facet search in the panel. The DS marks facets `searchable`; the
  longest list here is eight products.
- No Create CTA on the view row — rule 8, no create handler means no button.
  Drivers are not created from the planner.
- Views live for the session. The DS keeps them in localStorage per list; this
  is one HTML file.
- Recent history in the filter panel is not built.

---

## The filters, regrouped (round 17)

The panel's left menu now lists **groups**, and each group's dimensions are
headed sections inside its options pane — the DS's own `sections`, used for
what a dispatcher actually asks about a rig:

| Group | Dimensions |
|---|---|
| **Driver & shift** | Availability · Duty · Shift |
| **Location** | Hub |
| **Truck & trailer** | Truck · Trailer |
| **Load** | Room left · Compartments free · Product on board |
| **Planning** | Planning · Hours left · Run risk |

The **dimension** is still the DS facet: ticks inside one are OR, every
dimension with ticks must match, and the chip says the dimension, not the
group. The group is a menu heading, not a filter.

**On leave** joins Duty. It is a word, not a fourth state — everything that
asks whether a rig can work today already answers no for off duty, and leave is
the same answer. Three of the ten off-duty drivers are on leave.

---

## Six groups, the rigs themselves, and a capacity slider (round 18)

**Driver and shift are their own groups.** They were one, and they are two
questions: who is on, and when are they on.

| Group | Dimensions |
|---|---|
| **Driver** | Availability · Duty |
| **Shift** | Band (AM/PM) · Shift window · Hours left |
| **Location** | Hub |
| **Truck & trailer** | Truck · Class · Trailer |
| **Capacity** | Room left (slider) · Compartments free · Takes product |
| **Planning** | Planning · Run risk |

Hours left moved under Shift — it is a fact about the driver's clock, not about
the plan.

**The rigs list themselves.** Truck and Trailer no longer offer class names;
they offer the actual rigs, each saying what it is on a second line:

```
☐  BT-4          ☐  TR-410
   Bobtail · 3 compartments · 2,800 gal      Tandem pup · 3 compartments · 5,000 gal
```

Thirty trucks is more than you can scan, so that facet is **searchable** — the
DS's per-facet search field, which matches the name and the description, so a
rig is found by "transport" or by "10,500" as well as by its number.

**Capacity is a range you slide**, not a set of buckets: two thumbs over
0–17,500 gal of room left, reading out as you drag. At its full width it is not
a filter, so it takes itself off rather than sitting on the shelf saying
"0–17,500". The chip reads `Room left: 2,000–8,000 gal`.

**Takes product** replaces "Product on board", because the useful question is
not what a rig is carrying but what it could take: a product it already has
with room left in that compartment, or **anything at all if a compartment is
empty**. Tick Kerosene and only the rigs that can actually place it remain.

**Said out loud.**

- *A facet can now be a range.* It is held as one value, `"2000-8000"`, so the
  chips, the saved views and the suggested name all keep working unchanged.
- *"Compatible" means placeable, not permitted.* The model has no rule about
  which products a truck may legally carry — every compartment takes anything —
  so a rig with an empty compartment takes all eight products. If some trucks
  cannot carry some products, that rule has to exist in the data first.
- *Class stayed* beside Truck. The thirty rigs answer "which one"; the class
  answers "what size", which is the coarser cut you usually want first.

---

## V1 archived, and V2 is the one that ships (round 19)

`prototypes/archive/` now holds the planners that came before:

| File | Was |
|---|---|
| `shift-planner-v1.html` | the design V2 replaced |
| `shift-planner-v0.html` | the earliest planner — orders grouped into load orders by driver |

Both still open and run on their own, and the smoke suite keeps their checks
(every branch guarded by `!V2`), so an archived file can be opened and tested
without reviving it. Nothing builds them.

**And the combined file now carries V2.** This was the standing Pending every
round — "V2 is not in `fleetpanda.html`" — and the reason given was wrong. The
merge renames the **18 globals that collide between screens**; V2's are all
`sp2`-prefixed and collide with nothing, and its CSS is scoped per screen like
everything else. Pointing `merge.py` at `shift-planner-ui2.html` was the whole
job.

The bundle is 515 KB (from 377) and runs **89 of 89**: create-order 16,
load-order 10, shift planner 63.

---

## One head for the whole planner (round 20)

The filter unit came out of both columns and went above them. There is one of
it now, because a preset like *"available orders and drivers"* narrows the
whole planner, not one half of it.

```
Shift Planner V2                                     ‹ Thu 19 Nov 2026 › Today
─────────────────────────────────────────────────────────────────────────────
All · Available orders and drivers        + View                      [Export]
[search orders, ship-tos, drivers or trucks]   [Filters 2]
─────────────────────────────────────────────────────────────────────────────
Orders 54          [sort][⇕][≡ ⋮][↗] │ Driver & truck 20                  [↗]
Status: Unplanned ✕  Clear all        │ Availability: Available ✕  Clear all
─────────────────────────────────────────────────────────────────────────────
```

- **Every facet knows its column.** The panel's menu runs Orders first, then
  the six rig groups. An Orders group counts orders in its footer ("54
  orders"), a rig group counts rigs.
- **The chips land in the column they narrow**, right under its name, and each
  shelf's *Clear all* clears only that column.
- **The search runs over both** — an order answers to its number, its ship-to
  and its address; a rig to its driver, truck and hub.
- **A preset is a narrowing of the whole planner.** The one the planner opens
  on is `Available orders and drivers` = Status *Unplanned* + Availability
  *Available*. Pressing All widens both columns at once; pressing the preset
  brings both back.
- **Each column keeps how it shows itself**, not what it shows: the orders
  column still has Sort, expand-all, the timeline switch and pop-out; the rigs
  column has its pop-out.

The status quick filters and the Blend toggle became facets (`ostatus`,
`oblend`). `sp2SetQuick()` and `sp2ToggleBlend()` stay as the way to set them
in one call — the controls moved, the narrowings did not.

**Said out loud.**

- *The per-value counts left the row with the quick filters.* They are in the
  panel now, against the values they count, which is where the DS puts them.
- *The rigs column's head is now just a name and a pop-out.* That is what is
  left once filtering is common — it will fill up again when you add to it.

---

## The orders column draws, the head narrows (round 21)

The orders column's head is down to three things: **the timeline switch, the
expand-all, and its chips.** Everything that narrows or orders a list is in the
common head.

- **Sort went up** beside Filters. It orders a list, which is the head's job
  now; the column is left with how it draws itself.
- **The pop-out came off the orders column.** The rigs column still has one.

**A preset speaks for itself.** While one is showing unchanged, neither column
puts chips up — the tab already says what is on, and a row of chips repeating
it is the same fact twice. The moment the narrowing stops matching the preset —
because you applied a filter yourself, on top of it or from All — the chips
come back, and they show the **whole** applied set, not just what you changed.
Putting the preset back takes them away again.

**Said out loud.**

- *Sort sits in a common head but only orders the orders column.* There is
  nothing to sort on the rigs side yet, so its tooltip says "Sort orders".
- *The two columns' heads are no longer alike* — one carries display tools, the
  other a pop-out. That followed from the instruction, not from a rule.

---

## Two tabs in the panel, one row in the head (round 22)

**The filter panel is two tabs**, because a tick narrows one list or the other
and the reader should never have to work out which:

```
┌ Orders 1 │ Drivers and trucks 1 ───────────────────────────┐
│ Order 1  │ ☑ Unplanned                                54   │
│ Products │ ☐ Planned                                  45   │
│          │ ☐ Outside                                   3   │
├──────────┴──────────────────────────────────────────────── │
│ 54 orders                        Clear all   Apply filters │
└────────────────────────────────────────────────────────────┘
```

Each tab carries a count of how many of its own dimensions are ticked, lists
only its own groups in the menu, and counts its own list in the footer —
"54 orders" under Orders, "20 rigs" under Drivers and trucks. The order
dimensions were split into two groups, **Order** (Status) and **Products**
(Blend), so the menu has something to list and there is somewhere obvious to
put the order filters that come next.

**The head is one row.** Search, Sort and Filters moved onto the right of the
presets row:

```
All · Available orders and drivers · + View    [search] [⇅] [Filters 2]
```

**Export is gone**, and its handler with it.

The head went from 180px to **37px** — the whole saving goes to the lanes.

**Said out loud.**

- *A tab is not a filter.* Switching tabs shows a different set of dimensions;
  it does not narrow anything by itself, and the ticks on the other tab stay
  staged while you are away from it.
- *Export was the only way the DS's view row offered to get data out.* It is
  not in the way of anything now, but the rule it obeyed — never export
  silently — goes with it.

---

## The head, settled (round 23)

```
All · Available orders and drivers · + View
[search]  [Filters 2]  [⇅]                        ‹  Thu 19 Nov 2026  ›  Today
──────────────────────────────────────────────────────────────────────────────
Orders 54                      [⇕][≡ ⋮] │ Driver & truck 20              [↗]
```

- **Search, Filters and Sort went back to their own row** under the presets.
- **Sort comes after Filters** — you narrow a list before you order it.
- **The date control joined that row, at the right.** What narrows and orders
  is on the left; what day you are looking at is on the right.
- **The planner's own header is gone** — title, V2 badge and all. The date was
  the only thing in it that did anything, and it has a better home.

The whole head is 94px: the presets row, the control row, and nothing else.
The page now opens straight onto the planner.

**Said out loud.**

- *The V2 badge went with the header.* The browser tab still reads "Shift
  Planner V2" and the file is still `shift-planner-ui2.html`, but nothing on
  the screen says which version you are looking at.

---

## Outlines, and a divider instead of a card (round 24)

**Every icon tool carries its own box now** — an outline and a surface — so it
reads as a control at rest rather than only when you hover it. The two timeline
icons are **one bordered pill of two segments** with the live view filled grey,
which is the DS's own shape for a display switch (2026-10-23). Expand-all sits
beside it in a box of its own.

**The products are a section of the order card, not a card inside it.** The
inner rim is gone; a single hairline divides the head from the products, and
the table runs to the card's edges — which the card's own radius and
`overflow:hidden` round off. Collapsed, the summary line sits under the same
rule. Expanding and collapsing are unchanged.

```
┌─────────────────────────────────┐   ┌─────────────────────────────────┐
│ ☐ D-5157100  D      Unplanned › │   │ ☐ D-5157076  D      Unplanned › │
│ 📍 Aguilar and Sons — Tampa HQ  │   │ 📍 Valley Co-op — Silo Row      │
│ 🕐 5:00 AM – 7:00 AM            │   │ 🕐 5:17 AM – 8:17 AM            │
├─────────────────────────────────┤   ├─────────────────────────────────┤
│ Product   Blend   Qty    Type   │   │ ›  1 product         9,000 gal  │
│ UNL87     E10·90% 3,150  gal    │   └─────────────────────────────────┘
│ …                               │
│ ⌄ Total           5,700 gal     │
└─────────────────────────────────┘
```

**Said out loud.**

- *The table lost its own rounded corners* and now takes the card's. At the
  card's bottom that reads as intended; at the divider it is a straight rule,
  which is what a divider should be.

---

## Three fixes (round 25)

**Expand-all moved right** of the timeline switch: `[↔│↕] [⤢]`.

**The band over the lanes is gone** — "Driver · availability | All shifts | 45
planned · 54 unplanned". The column already names itself, the count sits beside
the name, and the chips say what is narrowing it; the band was all three again
in small capitals.

**The compartment table was cropping its own head.** It had 300px and four
columns of 40 / 1fr / 76 / 66, which left the product name about 118px and the
word "Comp" short of its box. Now:

| | Was | Is |
|---|---|---|
| Band width | 300px | **348px** |
| Comp | 40px | **46px** — its head fits |
| Product | the rest (~118px) | the rest (~194px) |
| Gallons | 76px | **62px** |
| Full → **TM** | 66px | **46px** — the tank monitor, named as it is elsewhere |

The drawing beside it takes what is left (269px) and redraws itself to the
column, so the rig moved right rather than shrinking the table. Nothing in the
open lane clips.

---

## A constituent carries its share, not the blend's name (round 26)

The Blend ratio column read `E10 · 90%` on the UNL87 row and `E10 · 10%` on the
Ethanol row. **That was wrong.** UNL87 is not an E10 — it is one of the two
products an E10 is made *from*. Naming a constituent after the blend says the
truck is carrying E10 in that compartment, which is the thing splash blending
is not.

The cell now carries **the share alone**: `90%`, `10%`. The bracket down the
left already says which rows go together, and the column head is **Ratio**.
Hovering a row says the true thing — *"Blended with Ethanol · 90 : 10"*.

The order sheet's "What the truck carries" table had the same mislabel in its
first column; it carries the share now too. The blend's name stays where it
belongs: on the **ordered** line, which is what the customer actually bought.

A two-blend order reads without ambiguity on the brackets alone:

```
Product    Ratio   Quantity
● UNL87   ⌐ 90%     1,800
● Ethanol ⌙ 10%       200
● UNL87   ⌐ 30%       600
● Ethanol ⌙ 70%     1,400
● UNL93     —         400
```

The column lost 28px with the name — the product name took them.
