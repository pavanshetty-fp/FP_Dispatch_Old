# FP Prototype

Interactive prototypes for FleetPanda flows. Standalone HTML files — open in any browser, no build step.

## Prototypes

| File | Tab | Flow |
|------|-----|------|
| `prototypes/create-order.html` | Create order | 3 steps: customer, order planning, best buy |
| `prototypes/load-order-unassigned.html` | Edit order | An existing unassigned delivery order, planned onto a truck |
| `prototypes/shift-planner.html` | Shift planner | Select orders, grouped into one load order per driver |

Open any one of them and a switcher sits at the top to move between all three —
there is no index page to go back to. Press **H** (or the ×) to hide it before
taking screenshots; the sliver at the top edge brings it back.

They want a window **1280px or wider**. Below that the three columns start
fighting each other.

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

## Compartment planning

Both `create-order.html` and `shift-planner.html` share the same rules:

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

## Open

- Blend products — how a blend is defined and which components may share a compartment
- Scheduled-order flow into a load order
