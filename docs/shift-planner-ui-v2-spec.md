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

---

## Round 27 — the filters say what a dispatcher actually asks

Seven changes, all inside the one head's **Filters** panel.

### Orders

**Products was one option.** It said "Carrying a blend" and nothing else, which
is not a product filter — it is a flag. The catalogue behind the planner was
six products wide, so there was nothing else to list.

The fleet's bulk list is now **25 straight products** — gasoline by grade,
diesel clear, dyed, premium, seasonal and marine, the two ULSD cuts, DEF,
kerosene, heating oil, the aviation pair, and the two blend components a
terminal also racks on their own — plus the **five blends**. Thirty options,
searchable, each counted against the day's orders. Every one of the thirty is
on an order today; nothing in the list is a dead control.

No ratio appears anywhere in the list. A blend's ratio is decided when the
order is written, not when the list is narrowed. "Carrying a blend" survives as
its own dimension underneath, headed **Blended**, because "show me every blend"
is still one tick rather than five.

**Customer and ship-to are two filters, not one.** A ship-to is already named
`Customer — Site`, so the customer is the part before the dash and the two
lists can never fall out of step. Ship-to carries its address on the second
line.

### Drivers and trucks

| Was | Is | Why |
|---|---|---|
| Duty | **Hours of service (HOS)** | What the clock is actually called |
| Location | **Hubs** | A hub is the only location a rig has |
| Capacity | **Truck capacity** | It is the truck's room, not the order's |
| Planning | *(gone)* | — |

**Truck and trailer became one list.** Two facets asked the same question
twice: a rig is a truck and whatever is hitched behind it, and a dispatcher
looking for *TR-410* does not first decide which of the two boxes it lives in.

One list now holds every unit by its number, each wearing a **Truck** or
**Trailer** pill and saying what it holds underneath — `Bobtail · 3
compartments · 2,800 gal`. Above it, a segment: **All · Trucks · Trailers**,
opening on All. Below that, a search box that says it takes a number.

The segment is a narrowing of the *options*, not a filter: moving it ticks
nothing and Apply is unaffected.

### Cost

64 steps green at 1512×950, no console errors, nothing clipped.

---

## Round 28 — the open lane says what it is about to do

### Half each

The band under a driver's head was **348px of table and whatever was left**
for the drawing — 348 / 554 at 1512px, so the table was cramped while the
drawing had room to spare. The two say the same thing two ways; neither
outranks the other.

Both halves are `flex:1 1 0` now. The ratio is fixed at 50/50 and the widths
follow the screen: 451 / 451 at 1512, 243 / 243 at 1280.

The table's fixed columns gave 6px back to the product name so that
`PREM DSL` still fits at the narrow end — Comp 46, Gallons 58, TM 46, 7px
gutters.

### "Fill the rest" said nothing

The strip under the drawing is the orders that would fit on this rig. "Fill
the rest" names no part of the truck. The heading now names the compartments
it is talking about, and it reads the rig to say which:

| The rig has | The heading says |
|---|---|
| Empty compartments only | Fill the empty compartments |
| Part-filled only | Fill the part-filled compartments |
| Both | Fill the empty and part-filled compartments |

The distinction is not decorative: an empty compartment takes anything, a
part-filled one only takes more of what is already in it.

### The Add button says where the fuel goes

Each row carried `→ 48%`, which is where the *rig* lands. Standing beside a
button that loads the order, it read as a property of the order.

The row now carries both, stacked:

```
Into C1 and C3
Rig at 88%          [ Add ]
```

Four or more and it says `Into 4 compartments`. The hover spells it out —
*"Goes into compartment 1 and compartment 3. The rig ends at 88% full."*

The compartments are not a guess. `sp2WouldFill()` is a dry run of the packer
itself — the same two passes (top off the same product, then take an empty
cell) on a copy of the cells — so what the row promises is what Add does. The
smoke suite adds an order and checks the compartments that actually grew
against the ones the row named.

### Cost

64 steps green at 1512×950, nothing clipped at 1512 or 1280.

---

## Round 29 — one expand-and-collapse pair, on the column tool

The orders column's expand-all tool sat on a pair of diagonal box arrows — the
"open this wider" sign, not "show me the lines". It acts on every card's
product table at once, so it should draw the lines it is acting on.

It now uses the pair Pavan supplied, where **the icon draws what the press will
leave behind:**

| State | Press does | Icon |
|---|---|---|
| Everything shut | opens every card | three list lines, chevrons pushing **apart** |
| Anything open | shuts every card | one list line, chevrons coming **together** |

Each list line is an outlined bullet and a rounded bar, as in the reference.
The reference's arrows are chevrons here — a head with no shaft, which is the
direction without the weight, and the same chevron the cards use.
`sp2ListRow(y)` draws one, so the two icons are the same part repeated three
times and once — they cannot drift apart.

**The cards keep their chevron.** It was tried there and taken back out: a
14px control inside a card is read at a glance, and a chevron is the fastest
"there is more" there is. The drawn pair earns its space on the column tool,
where it is a deliberate act on the whole list; inside a card it is detail
nobody reads. The smoke suite asserts both — list lines on the tool, no
circles in the card's caret.

### Cost

64 steps green at 1512×950, nothing clipped.

---

## Round 30 — the rack, and what a suggestion actually costs

### One heading

"Fill the empty and part-filled compartments" was precise and unreadable, and
it changed under the reader as the rig filled. One statement now, true of both:

> **Fill the compartments with room left**

### The truck does not deliver out of the yard

The suggestion row said `2.8 mi · 7 min`, measured hub → ship-to. That is not
how a day runs. A truck leaves the hub **empty**, drives to the terminal its
hub loads at, racks the load, and only then starts delivering. Miles from the
yard describe a trip nobody makes.

The planner now carries the rack:

| Hub | Loads at | Out of the yard |
|---|---|---|
| Denver | Commerce City rack | 12.4 mi |
| Phoenix | Phoenix rack | 9.8 mi |
| Portland | Willbridge rack | 7.6 mi |
| Tampa | Port Tampa rack | 11.2 mi |
| San Jose | San Jose rack | 14.5 mi |

A run now begins `shift start + drive to the rack + load`, and the first leg is
**rack → first stop**, not hub → first stop. `sp2RunEnd` still drives home to
the hub.

The windows the day is built with moved with it: they are laid out from the
moment the truck **leaves the rack**, not from the start of the shift.
Without that every run in the fleet read an hour late. One bucket's window span
was tightened to 105 minutes so the day still carries a run that misses — the
day reads 35 in window, 7 waiting, 3 late, 6 runs ending past the shift.

### The row shows its working

```
5,300 gal · 12:07 PM–2:07 PM · 23.2 mi from the rack · 2h 43m driving ⓘ
```

- **the miles** are the rack to this ship-to — the leg that actually gets the
  fuel there
- **the time** is everything driven to reach it: hub → rack → each stop ahead
  of it in window order → this one. Loading and time on site are the shift's,
  not the distance's.

Hovering ⓘ opens the arithmetic — every leg with its miles, the total against
the truck's own mph, and which stop of the run this becomes:

```
HOW THIS IS WORKED OUT
Denver Hub → Commerce City rack                12.4 mi
Commerce City rack → Arapahoe Schools — …      23.2 mi
Arapahoe Schools — … → Morris Group — …         3.2 mi
…
67.9 mi at 25 mph                               2h 43m

Stop 5 of 5 once this is on. The miles shown are the rack to
Arapahoe Schools — Bus Depot; the time is everything driven to
reach it, loading and time on site aside.
```

The smoke suite adds the legs up and checks they make the stated total.

### Delivery window is a filter

Under Orders, four bands — before 8 AM, 8 AM–12 PM, 12 PM–4 PM, after 4 PM. A
window that straddles two answers with **both**, so "show me the afternoon"
finds a window that runs into it rather than only one that opens in it.

### Cost

64 steps green at 1512×950, nothing clipped.

---

## Round 31 — a hover card you can reach

The shift card behind *"starts in 30m"* could not be got to. The card sat
`top:100% + 4px`, and those four pixels were dead ground: the moment the
pointer left the text, `.sp2-hv:hover` went false and the card closed before
the pointer arrived. The card was reachable only by luck.

Two things fix it, and they are now the house rule for every hover card in the
planner:

**A bridge.** Each card carries a transparent `::before` that reaches back over
the gap to the trigger. It belongs to the card, so crossing it keeps the card
hovered — the pointer never crosses nothing.

**A held-open window.** `display` cannot be delayed, so the cards are hidden
with `visibility` instead:

```css
.sp2-hv-card{visibility:hidden;opacity:0;
  transition:opacity .12s linear, visibility 0s linear .45s;}
.sp2-hv:hover .sp2-hv-card,.sp2-hv-card:hover{visibility:visible;opacity:1;
  transition:opacity .12s linear;}
```

The card stays hit-testable for **.45s** after the pointer leaves — long
enough to land on it from any direction, short enough never to be in the way.
Move somewhere else and it goes, which is what Pavan asked for: it should
survive the trip towards it, not outstay it.

Applied to all three: the driver's shift card (`.sp2-hv-card`), a filter chip's
values (`.sp2-chipf-card`), and the working behind a suggestion's miles
(`.sp2-why-card`). The plain address tooltip is left alone — there is nothing
in it to reach for.

Measured: visible on the trigger, visible mid-gap, visible and `:hover` on the
card itself, hidden 700ms after the pointer leaves.

### Cost

64 steps green at 1512×950, nothing clipped.

---

## Round 32 — three filters out of the Order drawer

Customer, ship-to and delivery window were sections inside the **Order** group,
behind Status. A dimension you have to go looking for is a dimension nobody
uses: the menu is the index, and anything not in it is hidden.

The Orders tab's menu is five entries now, each holding exactly one filter:

```
Order              Status
Products           Product · Blended
Customers          Customer      (searchable)
Ship-tos           Ship-to       (searchable, address on the second line)
Delivery window    four bands
```

A group with one filter draws no section heading, so each of the three opens
straight onto its own list — one click from Filters instead of a click and a
scroll.

### Cost

64 steps green at 1512×950, nothing clipped.

---

## Round 33 — the tick that was six characters

The sort menu read `✓⟋Time`. The tick was not a tick: the markup said
`<span class="sp2-tick">✓</span>`, and **HTML has no `\u` escape**. Six
literal characters were sitting in a box sized `width:14px` for one glyph, so
they spilled over the label beside them. A `title` attribute carried
`driver’s` the same way.

The cause is mine and mechanical: that popup's static HTML was written through
a Python heredoc, where `✓` IS an escape, and the escapes went into the
markup unchanged. It has been wrong since the sort moved into the head, because
nobody opened the menu after writing it — including me.

Four fixed, to the characters themselves. And the smoke sweep now refuses the
whole class: any `\uXXXX` left in rendered text, or in a `title`,
`aria-label` or `placeholder`, is reported as layout damage — `script` and
`style` excluded, since source legitimately contains them.

Logged as **M-055**.

### Cost

64 steps green at 1512×950, nothing clipped.

## Round 34 — the line is the switch

The chevron is gone from the order card. The product line itself — "3 products
· 5,700 gal" — is the control, and clicking it opens the table, clicking it
again shuts it.

The thing Pavan asked to be fixed was the hit area. Before, a shut card gave
the whole 44px line to click, and an open card gave a 13px chevron buried in
the table's Total row: the target shrank to a twentieth of itself the moment
you used it, and moved. Now it is one button that does not move. The line
stays in the same slot, at the same width and the same height, whether the
products are showing or not — measured at top 98.4px, left 3px, 272.5×44 in
both states — so a second click lands where the first one did without the
cursor travelling.

The table's **Total** foot row went with the chevron. It had carried the same
figures as the line directly above it, so keeping both would have printed the
order's total twice in one card. The line is the total now, and the table is
header plus rows.

### Cost

64 steps green at 1512×950. The step that drives the card now measures the
button's box in both states and fails if it shifts or resizes by more than a
pixel, so the hit area cannot drift back. The clip check is clean with all 55
cards open.

## Round 34a — the wash turns the corner

The hover on the product line ran to square corners inside a card with a 10px
radius, so the bottom of the wash cut across the card's own curve. Shut, that
line is the card's last band, so it now carries the bottom corners itself:
7px, which is the card's 9px inner curve less the 2px the band sits inside it.

Open, it goes square again — the table is the card's bottom edge then, and a
curve in the middle of a card would be a corner with nothing behind it.

### Cost

64 steps green at 1512×950. The suite now reads the radii in both states.

## Round 35 — the two columns match, and nothing is emptied by accident

**Both tools, both columns.** Orders had the expand-all and no way out to its
own window; Driver & truck had the window and no expand-all. Each now carries
both. A lane at rest is its driver and its rig — the two head rows — and the
press shuts or opens everything under them: the shift, the route, the load,
the stops. Lanes start open, so the first press collapses; 27 rigs read as a
list at 68px a row instead of 150.

**Unload.** It was there on a rig with nothing in it, offering to empty an
empty truck. It only exists once something is loaded, it says **Unload all**,
and it asks: the dialog names the gallons coming out and says the orders stay
planned, so the load can be built again.

**The tank monitor** read left to right in a 46px column, which left the bar a
stub and the number against the card's edge. It reads top-down now: the bar
across the whole column, the percentage under it in smaller text. The column
took 22px from the product name and keeps 12px of its own on the right, where
every other cell makes do with 7px.

**Over capacity.** The card offered to *cut an order by 1,600 gal* — a promise
to a customer quietly rewritten in the planner. It lists them instead: every
order past the line, its number, the gallons it adds, and a remove on the
right that names itself when reached for. An order comes off whole. The cut
is gone from the code, not just the screen.

**The route says where it breaks.** The run fills the rig stop by stop, so
there is a stop where it stops fitting. A red line sits there — between the
last stop that fits and the first that does not — reading "Tank capacity
exceeded. Remove orders." When the breach is further down than a shut lane
shows, the line goes under the "+N more".

### Cost

67 steps green at 1512×950, archived V1 52, merged bundle 93. The suite reads
the line's position against the running total, so it cannot drift off the stop
that causes it, and it fails if the cut ever comes back.

## Round 36 — point to point

**The route lost its boxes.** Every stop was a rounded panel that filled on
hover and gained a ring when picked — a list of cards drawn over a line that
was already doing the work. The dot and the thread between them carry the run
now. Hovering underlines where it is going; the stop that is picked fills its
own point rather than drawing a box around itself.

**A stop can be dropped from the stop.** Each row carries a remove that waits
at zero opacity until the row is hovered — it holds its 20px either way, so
nothing shifts when it appears. The row became a `div` with `role="button"`,
because a button cannot hold a button.

**The order pills at the foot of the day card are gone.** They listed the same
stops as the route, with the same remove, two cards apart. What is left is the
one thing they said that the route cannot: "No orders planned — drag one
here", on a selected lane with nothing on it, which is the only cue for where
to drop an order.

**The over-capacity readings stand side by side.** Each is a short line — a
number and its gallons — and a column of them was a column of white space.
They wrap, and the one being reached for grows in place as "Remove order"
slides out.

### Cost

68 steps green at 1512×950, archived V1 52, merged bundle 94. The new step
reads the computed fill, shadow and radius of every stop, so the boxes cannot
come back quietly, and checks the remove is hidden until the row is hovered.

## Round 37 — the chips are back, and they say how well they fit

The order chips are back at the foot of the day card, and the card now splits
the orders in two: **what fits is a chip outside the banner, what is over
capacity is a reading inside it.** Both are pills, so they read as one family
at two temperatures. The fit is stated only outside — inside the banner the
question is not how well an order fits but that it does not.

**Fit** is the order against the rig, on its own: pack it into the empty
compartments the way the real packer would, then ask how much of the
compartments it took up it actually fills. 100% is an order that leaves no air
in the tanks it uses; 48% is one that half-fills a compartment. It is a
property of the order and the rig, not of what else is loaded, so it does not
move as the day is built.

**Best fit** is the top fit on that rig and anything within two points of it —
a tie, not a band. Read against the other orders on the same rig, because a
6,000 gal wagon and a 16,000 gal transport are both on screen and absolute
thresholds would mark one and never the other. A lane of four usually lights
one or two. The chip is tinted violet with a violet rim, the way every
highlight in the system is, and states its own number either way.

Two things the suite would not have caught:

- `--accent-violet` **is not declared in this screen.** The first tint silently
  resolved to nothing and took the whole `color-mix` with it — the chip had no
  fill and no rim and still passed a test comparing it to its neighbours. The
  token carries its own fallback now, as the view-rail dot already did, and the
  step fails if the tint does not resolve.
- **The contrast sweep could not read `oklab()`**, which is what `color-mix()`
  computes to. A tinted chip was a layer it skipped, so violet was measured
  against the white page rather than its own fill. It parses oklab now. The
  reading on the chip was 3.7:1 at `#7c5cff`; it is taken down the same hue to
  5.6:1.

### Cost

69 steps green at 1512×950, archived V1 52, merged bundle 95. Nothing clipped.

## Round 38 — one chip in the banner, and a refusal that reads like one

**Two kinds of chip in the red banner.** The removable order readings, and a
`Drop D-5157062 (2,050 gal) and take D-5157066 (550 gal)` button that looked
like a third reading and did something else entirely. The banner is one kind of
chip now: a reading you can take off. The swap went with it — `sp2SwapOrder`
is gone from the code, and `sp2Overload` no longer works out a drop candidate
or a replacement, because nothing asks it to.

**"I added D-5157076, 9,000 gal, and nothing happened."** It did happen, and
the planner all but hid it. D-5157076 is 9,000 gal of Diesel DEF; BT-4 is a
2,800 gal wagon whose three compartments all held other products. The packer
needs an *empty* compartment for a new product — room inside an occupied one is
only usable by the same product — so **nothing was loaded**: the compartment
table did not move, which is the thing a dispatcher is looking at. The order
was still planned on the rig, which is deliberate (that is how a day is planned
past capacity and a trailer found afterwards), so it also left the orders
column. The only sign was a toast that read

> D-5157076 on BT-4 — Diesel DEF 9,000 gal would not fit; hitch a trailer

opening with the order and the truck like a receipt, on the success styling,
gone in 2.6 seconds.

Now a refusal is built as a refusal: the failed colour on its edge, two lines,
and 5.2 seconds.

> Nothing could be loaded: Diesel DEF 9,000 gal has nowhere to go in BT-4
> (2,800 gal).
> D-5157076 is on the rig with empty tanks — hitch a trailer or take an order
> off.

The partial case says what went in before what did not. The Add button in the
suggestion row took the same path and could say "loaded onto BT-4 · 0 gal"; it
now says the same thing as the drop.

### Cost

70 steps green at 1512×950, archived V1 52, merged bundle 96. The new step
drops the biggest unplanned order onto the smallest rig whose compartments are
all spoken for, and fails if the tanks move, if nothing is said, if the line
reads "loaded onto", or if it is not styled as a warning.

## Round 39 — split order

**The banner says two numbers.** It was narrating the arithmetic — "11,050 gal
planned onto 2,800 gal of rig — over by 8,250 gal". It now says what the tanks
hold and what is over:

> Tank capacity 10,500 gal · exceeded by 10,550 gal

**An order can be split across two trucks.** Where this rig could take *part*
of an order — an empty compartment, or room beside the same product in a
part-filled one — the chip carries a second icon that opens to **Split order**,
beside the remove. Offered only where there is something to split off: with
every compartment holding another product there is no room for any of it, and
the icon is not drawn.

Splitting asks first, with the three numbers:

> **Split D-5157062?**
> 2,050 gal was ordered. 1,950 gal fits on LT-46 now and stays as D-5157062.
> The other 100 gal becomes D-5157062-2, unplanned, for another truck — same
> ship-to, same window.

On confirm the fitting part is loaded and keeps the number the customer was
given; the remainder becomes a new order in the column, same ship-to and
window, carrying a **Split** pill whose hover accounts for all three figures.
The part that stayed carries one too. Split again and the next is `-3`.

The same two passes the packer runs decide what fits, on a copy of the
compartments, so the dialog cannot promise what the load would not do.

One thing this turned up: the first `sp2SplitId` stripped `-(\d+)$` from the
order number, which is the order number — `D-5157062` became `D`, and the
remainder was offered as `D-2`. A split suffix is one or two digits after a run
of four or more; nothing else comes off.

### Cost

71 steps green at 1512×950, archived V1 52, merged bundle 97. The step checks
the halves add up to what was ordered, that the dialog states all three figures
before anything moves, and that the icon appears exactly where a split is
possible.

## Round 40 — two readings, two colours, and a day that shows the split

**The banner's head is two readings now.** What the tanks hold is a fact and is
written in the ink every other fact uses; what is over them is the warning, and
only that is red. A 14px gap between them, the warning mark still red.

> ⚠ Tank capacity: 2,800 gal      Exceeded by: 1,500 gal

**"I don't see the split logic."** It was there, with nowhere to appear. The
split lives on the chips inside the red banner — the orders the rig cannot take
— and **no rig in the day was over capacity**, so there was no banner on any of
the twenty lanes, and nothing to split. A dispatcher would have had to drag
orders onto a truck until it broke before seeing any of it.

So the day now plans one rig past its tanks on purpose. The order that grows is
one whose product already sits in a part-filled compartment, so part of it
would fit and it can genuinely be split. BT-4 opens the planner at
`Tank capacity: 2,800 gal · Exceeded by: 1,500 gal`, with two readings in the
banner, both carrying the split.

This is the same rule as the no-empty-pickers one: a state the prototype
supports but never reaches is a state nobody can review. The suite now fails if
the day has none — or more than one, which would be a packing bug rather than a
seeded demo.

### Cost

72 steps green at 1512×950, archived V1 52, merged bundle 98. The capacity step
now counts rigs planned past their tanks and insists on exactly one; the new
step checks that rig draws the banner, lists its orders, and offers a split.

## Round 41 — the fit gets its own chip

The fit was a grey reading inside the order chip. It is its own chip now,
docked to the order's right end, and it carries the best-fit highlight instead
of the order pill carrying it — the highlight is about the fit, so it belongs
on the fit.

**The shape.** Its left edge is the order chip's rounded end cut back out of
it, and its right end is an ordinary rounded chip. A 13px disc centred 5px to
the left of the fit chip's box does the cutting: that is the pill's own 12px
arc plus the 1px of air between them, so the gap reads as **1px the whole way
round** instead of closing to a wedge at the top and bottom. A naive notch —
13px centred on the chip's own left edge — would have left 1px at the corners
and 14px at mid-height.

For the cut to be possible the chip's box overlaps the pill by 7px, which is
how far the pill's arc reaches back from its rightmost point at the chip's top
and bottom edge; the mask takes those 7px off again. A mask clips a box-shadow,
so the fit chip is tinted rather than rimmed — the rim stays on the order pill.

Violet on that 22% tint reads 5.0:1.

### Cost

72 steps green at 1512×950, archived V1 52, merged bundle 99. The step measures
the 7px overlap, checks the mask is a radial gradient and that the chip is
rounded on its right only, so neither the shape nor the gap can quietly change.

## Round 42 — the fit chip carries its verdict

**Three bands, in the status colours every other verdict uses.** Under 50% is
red, 50–79% amber, 80% and over green. A compartment left half empty is a tank
of air driven around the state; 80% is where a load stops wasting room worth
another order. The inks are taken down the hue far enough to clear 4.5:1 on
their own tint — 5.1 low, 6.4 mid, 5.4 high.

**The violet moved to the order pill.** Two things were competing for the fit
chip: how good the fit is, and whether it is the best on this rig. The chip now
says the first; the pill's violet tint and rim say the second.

**The split was there; the icon was wrong.** It has been on every banner chip
since round 39 — on Arpita Shah / BT-4, the one rig the day plans past its
tanks — but it was drawn with the **shuffle** glyph: two crossing strokes with
arrowheads, which reads "swap these two". It is a fork now: one stem that
splits into two arrows. Nothing else about it changed; the dialog, the
remainder order, the numbers and the `-2` suffix are as round 39 left them.

### Cost

72 steps green at 1512×950, archived V1 52, merged bundle 100. The step checks
every chip's band against the computed fit, that no two bands share an ink or a
fill, and that the split icon forks from one stem rather than crossing.

## Round 43 — one order named, and the lane you are looking at

**The banner names the order that broke it, and nothing else.** The day fills a
rig stop by stop, so one stop is where the running total crosses capacity; that
order is listed, and the ones behind it are not. Listing everything downstream
read as "all five of these are over capacity" when one order was the problem.
Take it off and the banner comes back pointing at whatever breaks it next, if
anything does.

**Why the split "still was not implemented".** It was, and it was on screen —
600px below the fold. The planner opens with a driver selected, and that
driver's lane was **the eleventh of twenty** in a 622px column, so the planner
opened on Yusuf Demir, Jenny Kwon and Diego Fuentes while the outline, the red
banner and both split icons sat under 1,277px of other lanes. Three rounds of
"where is it" were all this.

Startup now brings the selected lane into view (`sp2ShowSelected`, once; after
that the scroll is the dispatcher's). The planner opens on Arpita Shah / BT-4
with `Tank capacity: 2,800 gal · Exceeded by: 1,500 gal`, the breaching order
`D-5157202 · 2,800 gal` and its split, and the red capacity line in the route.
Splitting it loads 550 gal, leaves 2,250 as `D-5157202-2`, and clears the
banner.

The split step no longer inherits whatever the run has done to the day: it
builds its own rig — one compartment part-filled, one order of that product
bigger than the rig — so it tests the case rather than hoping for it.

### Cost

73 steps green at 1512×950, archived V1 52, merged bundle 99. The new step
scrolls the column to the top, calls what startup calls, and fails if the
selected lane is not in view; the banner step checks the named order is the one
where the running total crosses, by the clock.

## Round 44 — the fit is a share of the truck

The old number was the order against **the compartments it would land in**, on
an empty rig. That is why three orders on one truck could each read "100% fit":
each one filled the tanks it needed. Worse, on Priya Sharma's BT-34 a 3,450 gal
order on a 2,800 gal rig scored **100%** — the best on the lane — because the
650 gal with nowhere to go was never in the denominator.

It is now the order against the whole rig:

| order | gallons | was | now |
|---|---|---|---|
| D-5157060 | 550 | 46% | 20% of truck |
| D-5157061 | 700 | 58% | 25% of truck |
| D-5157062 | 2,050 | 98% | 73% of truck |
| D-5157063 | 3,450 | **100%** | **123% of truck** |

The chip reads "20% of truck" rather than "20% fit", because "fit" is the word
that made 100% ambiguous in the first place. Over 100% is red whatever the
other bands say, and an order the truck cannot hold is no longer a candidate
for the violet best-fit mark.

**The bands no longer carry much.** A day is four or five even stops, so the
seeded day now reads **42 amber chips, 2 red, 0 green** — every order is 14–20%
of its truck, because that is what five stops on one truck means. The three
colours were meaningful when the number was about compartments; against the
whole rig the share has no good or bad to it except "more than the truck
holds". Left as asked, flagged for Pavan.

### Cost

73 steps green at 1512×950, archived V1 52, merged bundle 99. The step now
recomputes each share against `sp2RigCap`, fails if two orders on one truck
both read 100%, and fails if the shares on a rig that is not over capacity add
up past 105%.

## Round 45 — the drawing gets a box

The truck floated beside the compartment card, standing on its bottom edge. It
has a card of its own now, built the same way — surface, 1px rim, `--r-md` —
and it takes the band's height, which is whichever of the two is taller. The
truck sits in the middle of it, across and down.

Two things the band taught:

- **A bordered column came out 22px wider than its neighbour.** With
  `flex:1 1 0` the padding and border are taken on top of the share the column
  is given, not out of it, `box-sizing:border-box` notwithstanding. So the
  column stays bare, exactly as the table's does, and the card sits inside it.
- **The 2px under the drawing is room for a scrollbar it does not have here**,
  and it put the truck 2px above the middle of its box. Zeroed inside the box.

### Cost

73 steps green at 1512×950, archived V1 52, merged bundle 99. The step reads
the box's rim and radius, checks its height against the taller of the two, and
measures the truck's centring both ways; the 50/50 check stands, which is what
caught the 22px.

## Round 46 — a rig cannot be planned past its tanks

Adding was free and the planner cleaned up after: take the order, go over
capacity, flag it red. Now the capacity is a ceiling. An order with more
gallons than the room left is **not taken** — it is not assigned, nothing is
loaded, and the line says what the room is:

> D-5157060 is 550 gal and LT-46 has 0 gal of its 10,500 left.
> LT-46 is full — take an order off before adding one.

The one way more goes on is the split, offered at the moment of the drop:

> **Split D-5157085 onto LT-61?**
> D-5157085 is 10,500 gal and LT-61 has 10,000 gal of its 10,500 left.
> Splitting puts 7,000 gal on, which takes LT-61 to 71% of its tanks. The other
> 3,500 gal becomes D-5157085-2, unplanned, for another truck.

Both the drag and the suggestion row's **Add** go through the ceiling.

**Why the split does not always reach 100%.** What fits is compartment work,
not arithmetic: that 10,500 gal order is 7,000 of UNL87 and 3,500 of UNL89, and
with one compartment already holding 500 gal of dyed diesel there is no empty
tank left for the UNL89. 7,000 is genuinely everything that can go on without
mixing two products in one compartment, so the dialog says 71% rather than
promising a full truck.

**The plan is held to the room, not to the free space.** Compartments can have
more space than the rig has unplanned gallons — planned fuel is not loaded fuel
— so `sp2SplitPlan` now takes a limit, and the split stops at the room. Without
it a split could put the rig straight back over.

The red banner stays: a rig can still end up over by having an order's gallons
edited upward on its card, and the day still seeds one so the state is on
screen.

### Cost

74 steps green at 1512×950, archived V1 52, merged bundle 100. The new step
fills a rig one order at a time, fails if anything is ever planned past the
tanks, and then checks the refusal states the capacity and that taking the
split leaves the rig at or under it.

## Round 47 — fit sorting answers "what fills this rig"

The fit was already measured against the rig **as it stands** — the packer's
two passes, so a part-filled compartment is topped up with its own product
first and an empty one is taken second. Both of the cases hold: an order for an
empty compartment, and an order whose product matches what is already in a
half-full one. What was wrong was the ranking and what the card said.

**Ranked by where the rig lands, not by how much of the order went on.** A
part-filled rig wants whatever brings it closest to full, and an order too big
to take whole still gets it there by being split — so it ranks with the orders
that fit, a shade behind the one that needs no splitting. With one compartment
half full of UNL87 and one full of clear diesel:

| rank | order | reads |
|---|---|---|
| 1 | D-5157085 (UNL87 + UNL89) | 64% fits · **rig 100% if split** |
| 2 | D-5157083 | 63% fits · rig 95% if split |
| 3 | D-5157076 (one product) | 61% fits · rig 88% if split |

The top one is the only one that uses the half-full tank: its UNL87 tops that
compartment up and its UNL89 fills an empty one. Everything below leaves 1,250
gal of UNL87 space behind, and stops at 88%.

**The card says the fit, and only when the list is ranked by it.** Two chips:
how much of the order goes on as things stand, and — when part of it fits —
what the truck would reach if it were split. The second says "rig", because two
bare percentages side by side are two different denominators and read as a
contradiction. `sp2FitChip` had been dead code since the V3 card replaced the
old one; it is wired into the live card now, under the window.

### Cost

75 steps green at 1512×950, archived V1 52, merged bundle 101. The step builds
the part-filled rig, checks every card's two readings against the model, that
the list is ordered by the rig's resulting fill, that the top order touches the
part-filled compartment, and that nothing reads out when the list is in time
order.

### Not built

Pairs. "A combination of two" — two orders that together fill the rig — is a
different question from ranking one at a time, and the suggestion row's "Add
all" is the nearest thing to it today.

## Round 48 — the product, and the split as a sentence

**The suggestion row names the product.** "Into C2" said where without saying
what, and what is the thing that decides it: a product goes in beside its own
or into an empty tank, and matches nothing otherwise. It now reads
**"REC90 into C3 and C4"**, one clause per product line, and the hover adds the
compartments spelled out plus, when a line cannot be placed at all, which
product and how many gallons have nowhere to go.

**The fit is one reading in one pill, beside the order number**, after the type
initial: `64% fit`, tinted by band. It was carrying "· fills the truck" and
"· rig 88%" as well, which is two facts in a pill.

**What a split would do is a sentence, not a second pill.** It was a percentage
beside a percentage — two different denominators reading as a contradiction.
Now, in blue, under the window:

> Split it and **6,750 gal** goes in — C1, C3, C4 and C5. 3,750 gal stays for
> another truck.

Gallons and compartments, which is what the question was.

### Cost

75 steps green at 1512×950, archived V1 52, merged bundle 101. The step checks
the pill sits in the card's head, that the split line states both figures in
gallons and carries no percentage at all, and that every product the preview
names is one the order actually carries.

## Round 49 — the pill is the sort

Fit sorting ranked by where the rig would land, which is a good question but
not the one the card answers. The pill says a percentage, so the list runs down
from the highest of them:

> 100% · 10% · 8% · 7% · 3% · 0% · 0% …

Among orders that fit equally — and there are many at 100% — the one that
leaves the rig fullest still comes first, so "which of these fills the truck"
is answered inside each band rather than across the whole list.

Round 47's ranking is the thing this replaces: a visible number that the order
of the list contradicts reads as no order at all.

### Cost

75 steps green at 1512×950, archived V1 52, merged bundle 101. The step now
checks the top card carries the best fit in the list, that no card out-fits the
one above it, and that equal fits are broken by the rig's resulting fill.

## Round 50 — utilization, not fit

"100% fit" was a lie in the case that matters: a 550 gal order onto a truck
with 750 gal of room read 100% because all of it fits, and an order that could
not be loaded at all — every compartment with room holding another product —
read 100% too, since nothing placed means nothing short.

The reading is **what the truck would be utilized at** once the order is on,
against its compartment capacity. On an empty truck a 10,500 gal order on a
10,500 gal rig is 100%; on a part-loaded one the number is what the tanks
actually come to. An order that can place nothing says **No room** rather than
a percentage.

On BT-4, loaded to 2,050 of 2,800:

| order | gallons | was | now |
|---|---|---|---|
| D-5157083 | 10,000 | 8% fit | **100% utilization** (by splitting) |
| D-5157060 | 550 | **100% fit** | 93% utilization |
| D-5157062 | 2,050 | 10% fit | 80% utilization |
| D-5157100 | 5,700 | **100% fit** | **No room** |

The sort runs down from the highest utilization, so the top of the list is the
order that leaves the truck fullest — which is round 47's ranking and round
49's "the pill is the sort", now the same thing because the pill is the number
the sort uses. The menu and the head button say **Utilization**.

One small thing: a flex box drops the whitespace between its children, so the
pill read "100%utilization" until the gap was put back as `gap:3px`.

### Cost

75 steps green at 1512×950, archived V1 52, merged bundle 101. The step checks
the pill against `rigPct`, that an order which can place nothing says No room,
and specifically that an order which fits whole never claims the truck is full.

## Round 51 — read against the free capacity, and say what it is

Round 50 measured what the truck would be utilized at **once the order was
on** — and an order that cannot go on still reached 100%, because the dry run
pours in whatever fits and the rest simply vanishes. On BT-4, D-5157083 is
10,000 gal; 750 fits the two part-filled compartments and 9,250 has nowhere to
go, and the pill said 100%.

**The chain, straightened out.** Free capacity first, then what the packer can
place, then one of three readings:

| state | reading |
|---|---|
| it goes on whole | `73% of free space` — its gallons against what is free |
| part of it places | `Needs a split` — no percentage; the blue sentence says the gallons |
| nothing places | `No room` — every compartment with room holds another product |

A percentage is only ever a percentage of something that can happen. BT-4, 750
gal free:

| order | gallons | round 50 | now |
|---|---|---|---|
| D-5157060 | 550 | 93% utilization | **73% of free space** |
| D-5157083 | 10,000 | **100% utilization** | Needs a split |
| D-5157062 | 2,050 | 80% utilization | Needs a split |
| D-5157100 | 5,700 | No room | No room |

Empty LT-61 reads what it should: `0 gal utilized · 0%` / `10,500 gal
unutilized · 100%`, and the list runs 100%, 100%, 95%, 95%, 86% — on an empty
truck 100% is an order that fills it, which is the case that always made sense.

**The sort** runs matches first by their share of the free space, then what
would need splitting, then what no tank can take.

**Under the truck**, two readings: `2,050 gal utilized · 73%` and
`750 gal unutilized · 27%`. They are what the whole orders column is measured
against, so they are on the screen rather than inferred.

Both cards now take the band's height, since the readings made the drawing's
card the taller of the two; the table keeps its row heights with
`align-content:start`, or the grid would share the spare height across every
row.

### Cost

75 steps green at 1512×950, archived V1 52, merged bundle 101. The step checks
each of the three readings against the model, that neither "No room" nor
"Needs a split" carries a percentage, that the sort runs match → split → none,
and that the two readings under the truck add up to its capacity.

## Round 52 — one definition of free capacity

Pavan tried to pull D-5157060 onto Arpita Shah / BT-4, where the card said
"73% of free space", and the planner refused it. Both were working correctly
from different numbers:

| | how it worked out free | BT-4 |
|---|---|---|
| the card, the sort, the suggestion row | capacity − **loaded** | 2,800 − 2,050 = **750** |
| the drop gate and the split | capacity − **planned** | 2,800 − 4,300 = **−1,500** |

On every rig whose orders all fit, the two are the same number. BT-4 is the one
the day plans past its tanks: 4,300 gal is committed to a truck that holds
2,800, so **2,250 gal of it is in no compartment at all** — and reading the
tanks reported that as space going spare.

**Free now means one thing everywhere: what the rig may still be committed to
carry**, `capacity − planned`, floored at zero. It has to be the commitment
rather than the air in the tanks, because a rig already planned past its
capacity has nothing to give, which is the ceiling of round 46. `sp2FitFor`
holds its dry run to that room, the way the split already did, so a card can
never promise what the gate would refuse.

**Three readings under the truck**, since planned and loaded are the pair that
makes the difference legible:

> ■ 4,300 gal planned · 154%  ■ 2,050 gal loaded · 73%  ■ 1,500 gal over capacity

and on a rig whose day fits:

> ■ 7,750 gal planned · 74%  ■ 7,750 gal loaded · 74%  ■ 2,750 gal free · 26%

**The suggestion row was the third place with its own arithmetic.** It was
still offering an order and an Add button on a truck the gate refuses; it now
reads "1,500 gal more is planned onto BT-4 than it can carry. Nothing more can
go on until an order comes off", and no suggestion may exceed the room however
much space the compartments show.

On BT-4 every order now reads **No room**, which is the truth: the rig is
1,500 gal over-committed.

### Cost

75 steps green at 1512×950, archived V1 52, merged bundle 101. The step now
compares the column's free against the drop gate's own arithmetic and fails if
they differ by a gallon, checks the three readings add up, and fails if the
suggestion row offers more than the room.

## Round 53 — the split line came back by opening somewhere plannable

Round 52's one definition of free is right, and it had a consequence nobody
chose: the planner opened on BT-4, **the only rig in the day planned past its
tanks**. There free is zero, so every order read "No room" and no split line
could appear — splitting an order *onto* a rig that is already 1,500 gal
over-committed is not a thing the planner should offer.

So the opening lane is now a rig that can still be planned: **Ivan Petrov /
LT-31**, 7,750 of 10,500 planned, 2,750 free. Sorted by utilization it reads

> 100% · 47% · 29% · 25% · 20% · 18% of free space, then **Needs a split**
> — "Split it and 2,750 gal goes in — C4 and C5. 6,150 gal stays for another
> truck."

which is the list he was looking for. BT-4 is still in the column with its red
banner and the split icon on the order that broke it, so that path is one click
away rather than in the way.

An order against an over-committed rig also says why in its hover now: "BT-4 is
1,500 gal over capacity, so nothing can be added until an order comes off it."

One slip worth recording: `sp2FitChip` has no `k` in scope — the driver it
reads is `sp2Driver` — and the first version of that hover threw
`ReferenceError: k is not defined` on every card. 24 steps failed at once,
which is what a suite is for.

### Cost

76 steps green at 1512×950, archived V1 52, merged bundle 102. The new step
fails if the planner opens on an over-committed rig or one with no room, checks
the over-committed rig still carries its banner and split, and the ranking step
now fails if a rig with room shows no split line while orders too big for it
exist.

## Round 54 — a compartment says whose gallons it holds

Pavan circled the four chips at the foot of Ivan Petrov's card — "20% of
truck", "17%", "20%", "17%" — and asked what they were and why the compartments
looked empty of them.

Nothing was wrong. The chips are his four stops, 2,150 + 1,750 + 2,050 + 1,800
= **7,750 gal = 74%** of LT-31, which is exactly what C1–C4 are holding. But
all four orders are REC90, and the load recorded only product and gallons, so
the fuel merged: C1's 2,500 gal is D-5157223's 2,150 plus 350 of D-5157224's.
Four chips, four tanks, and no line between them.

**The load now records who put the fuel there.** Every compartment is
`{ p, q, by: [{ id, q }] }`, with `by` always summing to `q`. The table reads:

| Comp | Product | Gallons | TM |
|---|---|---|---|
| C1 | REC90 · *D-5157223 · D-5157224* | 2,500 | 100% |
| C2 | REC90 · *D-5157224 · D-5157225* | 2,500 | 100% |
| C3 | REC90 · *D-5157225 · D-5157226* | 2,000 | 100% |
| C4 | REC90 · *D-5157226* | 750 | 38% |
| C5 | Empty | 0 | 0% |

and the hover gives the gallons per order. Each chip's hover now says where its
fuel is: "loaded in C1 and C2".

Every path that moves fuel keeps the books: the packer attributes what it
places, taking an order off removes **its own** gallons first and only then
anything else of that product, a hand edit trims the owners and hands them to
the fuel waiting to be placed, moving between compartments carries them across,
and unloading clears them. The day builder lays the seeded load order by order
rather than by product total, which is what made the attribution possible at
all.

### Cost

77 steps green at 1512×950, archived V1 52, merged bundle 103. The new step
checks every compartment's owners sum to its gallons, that no order holds more
in the tanks than it ordered, that the table names what each tank holds, and
that taking one order off leaves every other order's gallons where they were.
Rows went 34px to 42px for the second line.

## Round 55 — the truck was drawn empty because the fuel had no colour

LT-31 held 7,750 gal across four compartments and the drawing showed a bare
tanker. The cause is one line:

```js
var col = SP2_PROD_COLORS[l.p] || 'transparent';
```

**REC90 is not in the colour map** — nor are 16 of the other products the
catalogue has carried since round 27. A compartment holding one of them painted
its liquid transparent, which is indistinguishable from an empty tank. The
table's dot had the same gap and fell back to grey, which is why the table read
right and the picture did not.

Every product now has a fill, grouped by family so a tanker reads at a glance:
gasolines gold, clear diesel and its grades blue, dyed and off-road their own
red and orange, heating oils brown, kerosene pale, DEF teal, Avgas blue, Jet A
straw. An unknown product draws in neutral ink (`sp2ProdCol`) — fuel in a tank
is never drawn as nothing again.

**The drawing also names the product now.** Beside the table it had been
reduced to "C1…C5" on the grounds that the table carries the words; a coloured
compartment with no word in it is a colour nobody can read. It still leaves the
gallons and the percentage to the table.

So the picture answers the question it is there for: C1 REC90 full, C2 REC90
full, C3 REC90 full, C4 REC90 part, C5 empty.

### Cost

78 steps green at 1512×950, archived V1 52, merged bundle 104. A new step fails
if any product in the catalogue has no fill or if the fallback is transparent;
the drawing step now requires a product name on every loaded compartment and
still refuses the numbers.

## Round 56 — the rules written down, and the readings stop hiding

Three things, the third being the point of the other two.

**The reading was gated on the sort.** The pill and the split sentence rendered
only while the list was ranked by utilization — so in time order, which is how
the list opens, a rig was selected and the cards said nothing about it. That is
why "how much can I add if I split" had vanished: it was never computed, let
alone drawn. They now render whenever a driver is selected, in any order.

**The truck box carries two readings**, planned and free. Loaded was the third
and said the same thing as planned on every rig whose orders fit; the
compartment table is where the tanks are read.

**`docs/compartment-rules.md`** — the rules, once, in one place: the model, the
atomic rule (empty takes anything, part-filled takes its own grade, nothing
else takes anything), the seven cases of one order against one rig with what
each must read, splitting, blends, what every surface shows and must never
show, and a five-step procedure for checking a screen against the page. Every
case was then read off the live screen and recorded in §8; all seven agree.

The cross-check turned up one more thing: **the horizontal lane was sized by
constants** written before the pill and the sentence existed, so cards hung 30px
out of their lanes. The lane now takes its height from the cards after render
(`sp2FitLanes`), so the next thing added to a card cannot break it.

### Why this round exists

Pavan: "I tell something, something else goes away. One thing is added, another
thing is removed." He is right, and the cause is mine: across rounds 44–52 the
meaning of the reading was redefined three times — share of the order, then
utilization of the truck, then share of the free space — and each redefinition
dropped something already agreed. Settling the rules in a document and checking
the screen against it, rather than re-deciding the metric each round, is the
fix.

### Cost

78 steps green at 1512×950, archived V1 52, merged bundle 104. Two stale
assertions retired: the card no longer hides its reading, and "V2 took the fit
off the card" is settled — it lives in the head.
