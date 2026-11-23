# FP Prototype

Interactive prototypes for FleetPanda flows. Standalone HTML files — open in any browser, no build step.

## Prototypes

**`prototypes/fleetpanda.html` is the one to open.** All three touch points are
in it, behind a nav bar: Create order · Edit order · Shift planner. Each screen
keeps its own stylesheet and script, scoped so they do not collide — they share
144 class names and 18 globals, which is why the file is built rather than
hand-merged. `#create`, `#edit` and `#plan` open it on a given screen.

It is generated from the three sources, which still open on their own:

| Source | Tab | Flow |
|--------|-----|------|
| `prototypes/create-order.html` | Create order | 3 steps: customer, order planning, best buy |
| `prototypes/load-order-unassigned.html` | Edit order | Delivery order, load order and sourcing on one screen |
| `prototypes/shift-planner-ui2.html` | Shift planner | Orders on a timeline, beside the driver and their truck |

Rebuild the combined file after editing any source:

```bash
python3 .claude/merge.py
```

### Archived

`prototypes/archive/` holds the planners that came before and are no longer
worked on or built into the combined file:

| File | What it was |
|---|---|
| `shift-planner-v1.html` | The first full planner — the design V2 replaced. Archived 2026-11-23. |
| `shift-planner-v0.html` | The earliest one: selecting orders and grouping them into load orders by driver. That flow still has no home in the new design. |

They open and run on their own. The smoke suite still carries their checks —
every branch guarded by `!V2` — so an archived file can be opened and tested
without reviving it.

## The shift planner

Styled on FP DS, light theme — tokens resolved from `FP-DS-2026/src/index.css`,
Geist, the board card's shape, the delivery-timeline's hour scale. It stays a
prototype here; nothing was added to the unified module.

The system has **no timeline unit** — no gantt, no time axis, no vertical
timeline. These three views are a gap in it, not a deviation from it, so they
borrow the nearest sanctioned pieces rather than invent a fourth language.

Things that are easy to get wrong going light, and are not simply the dark
theme inverted:

- the ground is **warm** (`#e8e8e4`) and everything on it is cool — deliberate
- a card sits **lighter** than its lane here; dark inverts that
- brand orange is the product mark and the focus ring, **never the CTA** — the
  CTA is `--primary`, near-black
- three stroke weights do three jobs: card rim, divider, field boundary
- hover is grey (`--fp-emphasis`); selected is the brand tint (`--fp-selected`)


Two columns under a header that carries the date, split 40 / 60.

- **Orders** in one of three views, and the column resizes to suit:
  **horizontal** (40%) places them along a time axis, lane-packed so they never
  overlap; **vertical** (25%) runs time down a rail with the gap between orders
  written on it; **no timeline** (23%) is just the orders in the sequence the day
  runs them. Each card carries the order number, ship-to and address, products
  and quantities, order type and whether it is planned. Quick filter: all ·
  unplanned · planned. Shift range: AM · PM · custom, which is also the window
  the horizontal view draws.
- **Driver and truck** take the other 60%, side by side rather than stacked: the
  driver's card with shift, duty state and when they last synced, and beside it
  the truck mapped to them with every compartment — what is in it, how much of
  its capacity that is, and whether it reads full, partially full or empty.

Clicking an order follows it to the driver it is planned on; an unplanned one
says so instead.

## Checking they still work

Opening the files directly is fine for looking at them, but to actually drive
them, serve the folder and run the smoke test — it walks each screen through its
real flow and reports anything that errored, clipped or overflowed:

```bash
node .claude/static-server.js
```

Then in the browser console on each page:

```js
fetch('/_smoke.js').then(r => r.text()).then(eval)
```

It is the only way to catch what static checks miss. Syntax checks and tag
balance passed happily while the comment icons were rendering 113px square and
product names were cut to "CLR D".

## The load order is optional

Create Order does not assume one. The delivery order holds the width and the
load order column is a strip carrying **Add a load order**, locked until the
delivery order has a product on it. Adding one widens that column and moves
focus to it; after that the two trade places — the unit in focus takes most of
the width, the other dims and offers to take over, and clicking the dimmed
column brings it forward. With no load order there is nothing to source, so the
footer reads **Create order** and best buy drops out of the flow.

## Sourcing sits on its own

On the edit screen, sourcing is its own unit across the bottom, as wide as the
delivery order and load order together, and it is the same unit as create
order's best buy — per product, each terminal with its supplier, loading
account, rack price and what it costs against the cheapest, plus the whole-load
choice across the top.

Like the load order it starts as a CTA, **Create sourcing**, in a strip. Taking
it up moves focus there and the unit takes the room, with the two units above
shrinking to a band. All three then trade focus: whichever is in focus takes the
space, the others dim and offer to take over.

## Sourcing follows the load, everywhere

All three flows source a load the same way, with the same unit — per product,
each terminal with its supplier, loading account, rack price and the gap to the
cheapest, plus the whole-load choice across the top.

| Flow | Where sourcing sits |
|------|---------------------|
| Create order | Best buy, the step after order planning |
| Edit order | Its own unit across the bottom, behind **Create sourcing** |
| Shift planner | A **Sourcing** view beside the load plan, per driver tab |

In the planner each load order sources itself: the driver tabs pick which load,
the switch picks whether you are planning it or sourcing it, and the footer says
how many still need sourcing before they can be created.

## Compartment planning

Both `create-order.html` and `shift-planner-ui2.html` share the same rules:

- A compartment holds **one product**. Products only share a compartment when the
  product is itself a blend (`BLEND_PRODUCTS` — empty until blends are defined).
- Auto-assign is a best guess, not a solve. It runs three packing strategies and
  keeps whichever loads the most gallons, because no single strategy wins: packing
  the biggest product first wastes least space but can strand a small product with
  nowhere to go.
- Every assignment stays editable — product and quantity per compartment, and the
  ordered gallons on the delivery order lines.
- The delivery order sits on the left and the load order on the right, side by
  side, so a line that won't fit can be adjusted against real capacity rather
  than guessed at.

## Best buy

The last step picks where each product is loaded. It defaults every product to its
cheapest terminal, but the cheapest price per product can sit at different
terminals — so the step also says when that costs the driver a second stop.
Loading accounts belong to a terminal, so choosing a terminal narrows them.

## Grounded in the context docs

Aligned against `FP-DS-2026/docs/context/` rather than invented:

- **Driver shifts** — the documented prototype windows (early 05:00–13:00 and
  06:00–14:00, late 07:00–15:00 and 08:00–16:00), 480 min reference, shown
  against the 14 h HOS on-duty window that sits behind them.
- **Truck classes** — the documented bands: Bobtail under 3,500 · Tank wagon
  3,500–7,999 · Transport 8,000–11,500 gal, with a meter gpm per class.
- **Comparable products** — a substitute a line may fall back to. Surfaced on a
  line that cannot be fully loaded. The `≈` already on `123 (≈ UNL87)` is this.
- **Top off** — fills the tank instead of a stated quantity, so the two are
  mutually exclusive: ticking it clears and disables the quantity.
- **Retained fuel** is absorbed, never stacked — a compartment holding 1,600 gal
  against a 1,150 gal order stays at 1,600.

Deliberately not modelled, because the docs say they are not: product-weight
capacity (diesel is heavier, so a 9,000 gal transport may legally carry ~7,500
of it) and compartment-material compatibility.

## Open

- Blend products — how a blend is defined and which components may share a compartment
- Scheduled-order flow into a load order
