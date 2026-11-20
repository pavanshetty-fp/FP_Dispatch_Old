# Shift planner — what is still missing

> What the prototype does not yet do, as of 2026-11-19. Ordered by what blocks
> the most. The rules behind most of these are written up in
> [`planning-rules.md`](planning-rules.md); this is the list of what to build.

---

## 1. Blocking the flow

### 1.1 Lines of service are not in the planner at all
Settled vocabulary — **Tank wagon · Transport · Lubes & packaged · Propane** —
but the planner knows nothing about it. Three consequences:

- **No LOS filter on the drop.** Any order drops onto any truck. Propane should
  only go on propane trucks, packaged goods only on the lubes rig.
- **Only two of the four have a drawing.** Lubes needs totes and packaged zones;
  propane needs its own shape. Today a lubes truck would be drawn as a tanker.
- **Transport is drawn and treated as a tank wagon.** The two differ in the one
  way that matters: a tank wagon order can be split, a transport order cannot.

### 1.2 The overflow message names the problem but offers no way out
**Half done, 2026-11-20.** A lane whose planned gallons exceed its rig now says
so and offers two ways out — cut the biggest order back by the overage, or drop
one order and take an unplanned one that fits the space better. What is still
missing is the line-of-service rule: those fixes are offered to every truck,
and a transport is not allowed the first one.

The compartment-level case is still bare — dropping an order whose fuel will
not fit the compartments still just names what was left over.

The three routes, and which are allowed by line:

| | Tank wagon / Lubes | Transport |
|---|---|---|
| Split across two trucks, one delivery number | ✓ | ✗ |
| Tweak the delivery quantity | ✓ | ✗ |
| Second order on a second truck | ✓ | ✓ (the only one) |

### 1.3 Scheduled orders into a load order
Asked for early on, never built. Unassigned orders can be dragged; scheduled
ones have no path in.

### 1.4 No sourcing step
Create order and Edit order both have Best buy. The planner has none, so a load
built here cannot be sourced. Earlier intent was a sourcing step once the loads
are built.

---

## 2. The load is physically wrong in two ways

Both make the packing optimistic — it will accept loads a real truck would not.

### 2.1 Weight caps the load before volume does
Diesel ≈ 7.0 lb/gal, petrol ≈ 6.0–6.2. A 9,000-gal transport can legally carry
about **7,500 gal of diesel**. Capacity is a function of the product, not one
number. We fill to volume.

### 2.2 Switch-loading
A compartment that last held **dyed** product cannot take **clear** without
being managed first — contamination plus the dyed-vs-clear tax. Our packing
reassigns an emptied compartment to anything.

### 2.3 Three trucks are in the wrong class
Against the bands in `truck-types.md`:

| Truck | Now | Should be |
|---|---|---|
| PB-9, 6,000 gal | Tank wagon | Transport — tank wagons top out at 5,000 |
| LT-16, 10,500 gal | Transport | Truck-and-pup or doubles — transports run 7,500–9,000 |
| TR-660, 7,000 gal | Trailer on a bobtail | A pup is 2,000–4,000; this is a full trailer |

---

## 3. From the Route + Truck Optimisation spec

Written down there, absent here.

- **Ranked truck recommendation** (TF-2.5) — product fit → whole batch in one
  load → least leftover fuel → driver's own region and on shift. Would turn the
  **Available** tab from a filter into an ordering.
- **Fulfilment preference** (TF-2.6) — one truck finishing a ship-to in one
  visit beats splitting across trucks, even if it needs a reload. Customers do
  not want two trucks at their tanks.
- **Reloads** — when a compartment runs dry mid-route, add a load order so the
  same truck refills and continues. We have no concept of a route at all.
- **Fleet-day utilisation** — the target is **≥95% across the fleet per day**,
  counting multi-load cycles, on the minimum trucks deployed. We show per-rig
  percentages and no day total.
- **HOS** — 11h driving inside a 14h window, 30-min break after 8h driving. We
  show only the shift window. Field research also says real shifts run 5–6h
  with 3–4 deliveries, against our 8h.

---

## 4. Products

- **Blends** — the one case where two products legitimately share a
  compartment, and the packer forbids it outright. Three fulfilment modes and
  the ratio question are **open in the FP DS docs too**, so this needs a
  decision before it can be built.
- **Comparable products** — the substitution rules during planning are
  **unwritten anywhere**. We draw the notation (`123 (≈ UNL87)`) but the
  planner never offers a substitute.
- **Tank monitors** — a tank wagon delivers into assets that may or may not
  have one. The planner shows nothing about the destination's tanks.

---

## 5. From the Lovable reference, not copied

Deliberate so far; worth revisiting.

- **Availability as a roster field** (Available · Off · On leave). Ours is
  derived — on duty and the rig has room. A dispatcher cannot mark someone off.
- **Off-duty lanes** are dimmed; Lovable collapses them to "Off roster".
- **Planned stops as a sequence.** Ours are chips in time order; the lane's
  right side could carry the day as a strip.

---

## 6. Smaller, but real

- **No undo.** Dragging is destructive and Unload is all-or-nothing — you
  cannot take one order back off a truck.
- **Eight compartments in a narrow column** cannot be drawn at a readable size,
  so the rig scrolls. Acceptable, but it is the one case the drawing does not
  solve.
- **A bobtail and a transport draw identically** — same tank, same kingpin gap.
  A tank wagon is a straight truck and should not have one.
- **Empty, error and offline states** are undrawn across the prototype.
- **The old `shift-planner.html`** — select orders, group them by driver, source
  each — is still on disk and not in the combined file. It covers the grouping
  half that V2 does not. Decide whether it earns a tab or gets dropped.

---

## What is done

For contrast, so the list above is not read as the whole picture: lanes with a
drawn rig that fills the lane, drag-to-load with one-product-per-compartment
packing, trailers that hitch and unhitch, a 30-driver roster with search and
status tabs, an Available filter, two timeline views, filters behind one icon,
a compact density, and 57 automated checks across the three prototypes.
