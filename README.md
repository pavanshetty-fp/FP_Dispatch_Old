# FP Prototype

Interactive prototypes for FleetPanda flows. Standalone HTML files — open in any browser, no build step.

## Prototypes

| File | Tab | Flow |
|------|-----|------|
| `prototypes/create-order.html` | Create order | Delivery order and load order side by side on one screen |
| `prototypes/load-order-unassigned.html` | Edit order | The same split on an existing order, plus the compartment plan |
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

## The split

Create order and edit order both follow production: the delivery order and the
load order sit side by side on one screen, not one after the other.

- **Left — Bulk Delivery.** What the customer gets. One block per product, each
  with a total planned quantity and an optional *Split by asset* that assigns
  gallons to the customer's own tanks, against their last reading and ullage.
- **Right — Load From.** Where it is picked up, with a tab per product. Source is
  a Terminal or a Bulk Plant; a bulk plant draws against the stock in its tanks,
  so quantity is capped by what is on hand. *Split Load* adds a second pickup.
- The two stay in step: change a quantity on the left and the right says how many
  gallons still have no source.

## Blends

A blend is a product made of constituents in fixed proportions — USA Winter Blend
is DS2 80% / Antifreeze 20%. Two switches decide how one is picked up:

- **Source each constituent separately** — each constituent gets its own source
  row and its own share of the gallons (800 gal → DS2 640, Antifreeze 160).
- **Splash blend** — the constituents are collected together and mixed on the
  truck, so the blend takes a single pickup. Turning it on turns the other off.

That switch reaches the compartment plan in the edit flow, because it changes
what actually rides. Sourced separately, DS2 and Antifreeze are two products and
need a compartment each; splash blended they are one product in one compartment.
On a 3-compartment bobtail that difference frees a whole compartment.

## Open

- Does the edit flow want the same split, applied the same way?
- Scheduled-order flow into a load order
