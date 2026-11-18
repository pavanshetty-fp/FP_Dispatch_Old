# FP Prototype

Interactive prototypes for FleetPanda flows. Standalone HTML files — open in any browser, no build step.

## Prototypes

| File | Flow | Status |
|------|------|--------|
| `prototypes/load-order-unassigned.html` | Load Order — unassigned delivery order | In progress |
| `prototypes/create-order.html` | Create Order — 3-step wizard ending in a load order | In progress |
| `prototypes/shift-planner.html` | Shift Planner — select orders, group into load orders by driver | In progress |

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

## Open

- Blend products — how a blend is defined and which components may share a compartment
- Scheduled-order flow into a load order
