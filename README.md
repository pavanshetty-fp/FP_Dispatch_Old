# FP Prototype

Interactive prototypes for FleetPanda flows. Standalone HTML files — open in any browser, no build step.

## Prototypes

| File | Tab | Flow |
|------|-----|------|
| `prototypes/create-order.html` | Create order | 4 steps: customer, order details, load planning, best buy |
| `prototypes/load-order-unassigned.html` | Edit order | An existing unassigned delivery order, planned onto a truck |
| `prototypes/shift-planner.html` | Shift planner | Select orders, grouped into one load order per driver |

Open any one of them and a switcher sits at the top to move between all three —
there is no index page to go back to. Press **H** (or the ×) to hide it before
taking screenshots; the sliver at the top edge brings it back.

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
- Ordered gallons and the compartment plan sit next to each other on purpose, so a
  line that won't fit can be adjusted against real capacity rather than guessed at.

## Best buy

The last step picks where each product is loaded. It defaults every product to its
cheapest terminal, but the cheapest price per product can sit at different
terminals — so the step also says when that costs the driver a second stop.
Loading accounts belong to a terminal, so choosing a terminal narrows them.

## Open

- Blend products — how a blend is defined and which components may share a compartment
- Scheduled-order flow into a load order
