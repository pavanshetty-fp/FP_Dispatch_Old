# Compartments, products and what can go where

The one page to check before changing anything about loading, fit, splitting or
the readings around the truck. Every number on screen comes from the rules
below; if a screen disagrees with this document, the screen is wrong.

Written 2026-11-24, after a run of rounds in which the meaning of the "fit"
reading was redefined three times and each redefinition quietly dropped
something that had already been agreed. The cure is to settle the rules once,
here, and make each surface answer to them.

---

## 1 · The model

A rig is a list of compartments. The truck's come first, a hitched trailer's
follow; nothing else distinguishes them.

```
compartment = { cap, p, q, by:[{ id, q }] }
```

- `cap` — gallons it holds. Fixed by the truck or trailer type.
- `p` — the product in it, or `''` when empty.
- `q` — gallons in it, `0 ≤ q ≤ cap`.
- `by` — which orders those gallons belong to. **Always sums to `q`.**

Two numbers describe the rig as a whole:

| | definition | what it answers |
|---|---|---|
| **planned** | Σ gallons of the orders assigned to the rig | what it is committed to carry |
| **free** | `max(0, capacity − planned)` | what it may still be committed to |

`free` is the only measure of room. It is **not** the air left in the tanks:
an order can be planned and not yet loadable, and a rig planned past its
capacity has no room to give however much tank is empty. Every surface — the
card's reading, the sort, the split offer, the drop gate and the suggestion
row — reads the same `free`.

---

## 2 · The atomic rule

One product per compartment. A compartment takes fuel only when:

| compartment state | takes this product? | why |
|---|---|---|
| **empty** (`p = ''`) | **yes**, up to `cap` | nothing to contaminate |
| **part-filled, same product** (`p = X, q < cap`) | **yes**, up to `cap − q` | topping up its own grade |
| **part-filled, other product** (`p = Y, q < cap`) | **no** | mixing two grades in one tank |
| **full** (`q = cap`) | **no** | no room, whatever it holds |

The packer runs this in two passes over the rig, in compartment order:

1. **top up** — every part-filled compartment already holding this product
2. **then fill** — every empty compartment

Pass 1 before pass 2 on purpose: finishing a tank wastes less than opening a
new one, and it leaves whole compartments free for products that have nowhere
else to go.

Every placement is additionally capped by `free`, so the tanks can never hold
more than the rig is committed to.

---

## 3 · One order against one rig

Let `total` be the order's gallons and `fits` what the two passes would place.

| # | case | `fits` | reading on the card | can it be added? |
|---|---|---|---|---|
| 1 | rig empty, `total ≤ cap` | `total` | `N% of free space` | yes, whole |
| 2 | rig empty, `total > cap` | `cap` | `Needs a split` | only as a split |
| 3 | part-loaded, fits whole | `total` | `N% of free space` | yes, whole |
| 4 | part-loaded, `total ≤ free`, no tank will take the product | `0` | `No room` | no |
| 5 | part-loaded, `total > free`, some of it placeable | `< total` | `Needs a split` | only as a split |
| 6 | rig at capacity (`free = 0`) | `0` | `No room` | no — take an order off |
| 7 | rig over-committed (`planned > cap`) | `0` | `No room` | no — take an order off |

**Case 4 is the one that reads as a bug and is not.** A rig with no empty
compartment can only take more of what it is already carrying. LT-46 holding
E15 in C1–C3 and UNL93 in C4–C5 has 1,500 gal free — 1,000 inside an E15 tank
and 500 inside a UNL93 tank — so every order that is not E15 or UNL93 is
honestly "No room", and the two that are carry a split line.

`N% of free space` is `total ÷ free`: on an empty rig that makes an order
filling the truck 100%, and on a part-loaded one it is the share of what is
left. A percentage is only ever given to an order that can go on **whole** —
a split is not 100% of anything, and an order nothing will take is not a
percentage of anything.

---

## 4 · Splitting

Offered wherever `0 < fits < total`. It puts `fits` gallons on — the same two
passes, capped by `free` — keeps the customer's order number on that part, and
makes the remainder a new order `-2` (then `-3`, …) with the same ship-to and
window, unplanned.

The split cannot reach 100% of the truck when the products in the way forbid
it: an order of 7,000 UNL87 + 3,500 UNL89 onto a rig with one compartment of
dyed diesel places the UNL87 and leaves the UNL89 behind, because no empty
tank remains for it. The dialog states the gallons and where the truck lands,
never a promise of full.

---

## 5 · Multi-product and blended orders

- Each product line is placed on its own, in order. One line can fit while
  another has nowhere to go; the order then needs a split.
- A blend (E10, B20 …) occupies a compartment **as the blend**: it is racked as
  one product, and its constituents are a breakdown for the order card, not a
  way to spread it across tanks.
- Splitting a blended line keeps its ratio — a blend trimmed on one side is
  off-spec fuel, not a smaller order.

---

## 6 · What each surface must read

| surface | shows | must never |
|---|---|---|
| compartment table | compartment, product, **the orders whose gallons are in it**, gallons, fill % | invent a product the order does not carry |
| the drawing | the fill at its level, in the product's own colour, product named per compartment | repeat the gallons or the percentage |
| truck box | `planned · N%`, `free · N%`, or `N gal over capacity` | offer free space a rig planned past its tanks does not have |
| order card | one pill — `N% of free space`, `Needs a split` or `No room` — and, when splittable, a sentence in gallons and compartments | show a percentage for a split or for no room |
| suggestion row | orders that go on **whole**, the product and compartments each would land in, where the rig ends up | offer more than `free`, or anything to an over-committed rig |
| red banner | the stop where the running total crosses capacity, with remove and split | list every order behind the breach |
| drop | loads what fits; refuses an order bigger than `free` and offers the split instead | plan a rig past its tanks |

Every product in the catalogue has a fill colour. A compartment whose product
has none was drawn transparent, which is indistinguishable from empty — an
unknown product draws in neutral ink instead.

---

## 7 · Checking the screen against this page

When something looks wrong, read it in this order:

1. What are `planned` and `free` for this rig? (truck box)
2. Does the rig have an **empty** compartment, or room beside this product?
   (compartment table)
3. Which case in §3 is this order in?
4. Does the card's pill match that case? Does the split line match `fits`?
5. Do the drop gate, the suggestion row and the split offer agree with the
   same `free`?

A disagreement between any two of those is the bug — not the number that looks
surprising.

---

## 8 · Cross-check, 2026-11-24

Every case in §3 read off the live screen, against the rules above.

| case | rig | order | screen says | agrees |
|---|---|---|---|---|
| 1 · empty, fits | LT-46 empty, 10,500 | D-5157060, 550 gal | `5% of free space` | ✔ |
| 2 · empty, bigger than the rig | BT-4 empty, 2,800 | D-5157063, 3,450 gal | `Needs a split` · "2,800 gal goes in — C1, C2 and C3. 650 gal stays" | ✔ |
| 3 · part-loaded, fits whole | LT-61, 8,450 free | D-5157063, 3,450 gal | `41% of free space`, no split line | ✔ |
| 4 · free, but no tank for the product | BT-4, 500 free in two part-filled tanks | any other product | `No room`; row says "at most 200 gal can go on in one order here" | ✔ |
| 5 · part-loaded, bigger than the room | LT-61, 8,450 free | D-5157068, 8,950 gal | `Needs a split` · "8,000 gal goes in — C2, C3, C4 and C5" | ✔ |
| 6 · at capacity | — | — | same as 4 with `free = 0`: `No room` | ✔ |
| 7 · over-committed | BT-4, 4,300 planned on 2,800 | any | `No room`; box reads "4,300 gal planned · 154%" and "1,500 gal over capacity"; row says nothing can go on until an order comes off; banner still offers the split on the order that broke it | ✔ |

Two things the cross-check turned up and fixed:

- **The reading was gated on the sort.** The pill and the split sentence only
  rendered while the list was ranked by utilization, so in time order — which
  is how the list opens — a rig was selected and the cards said nothing about
  it. They now render whenever a driver is selected, in any order. This is the
  "I tell you one thing and another goes away" that prompted this document.
- **The horizontal lane was sized by constants** written before the pill and
  the split sentence existed, so cards hung 30px out of their lanes. The lane
  takes its height from the cards themselves after render (`sp2FitLanes`), so
  the next thing added to a card cannot break it.

The truck box now carries two readings, planned and free. Loaded was the third
and said the same thing as planned on every rig whose orders fit; the
compartment table is where the tanks are read.
