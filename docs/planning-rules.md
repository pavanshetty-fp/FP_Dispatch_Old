# Planning rules — lines of service, products, validations

> **Status: captured, not built.** Pavan's brief of 2026-11-19, reconciled with what
> already exists. Nothing in the prototypes obeys this yet; this is the sheet we
> build against when we come back to it.
>
> **Sources already in hand:** `FP-DS-2026/docs/context/fuel-supply-and-sourcing.md`
> (products, blends, branded, comparable), `assets-tanks-and-leases.md` (tank
> monitors), `customers-and-sites.md` (the existing LOS words),
> `DS Claude 2026/docs/plan-load-rules.md` (packing, truck ranking, mismatch
> handling), `truck-types.md` (classes, weight, switch-loading).

---

## 1. The order, and what a truck carries

- **One order** (`Order # …`) = a set of **products and quantities**, delivered to
  **one or more ship-tos**.
- **One truck** can carry **several orders** — that is the point, it is how
  compartments get filled.

So the planner's unit of work is not "an order fills a truck"; it is "fit the
day's orders into the fewest trucks without breaking the rules below".

---

## 2. Lines of service

Four, and they behave differently enough that the packing rules change per line.

| | **Tank wagon** | **Transport** | **Lubes & packaged** | **Propane** |
|---|---|---|---|---|
| Delivers | Many ship-tos per route | Large volume, usually one ship-to | Packaged goods and/or bulk lube | Propane |
| Compartment rule | Part-fills are normal | **Minimum one full compartment = one delivery**; a compartment is delivered whole | Totes for bulk lube, zones for packaged | — |
| Multiple ship-tos | Yes | Only if the truck has several compartments, one full compartment each | Yes | Yes |
| **Split an order?** | **Yes** | **No** | **Yes** | TBD |
| Loads from | Terminal or bulk plant | Terminal or bulk plant | **Warehouse** | TBD |
| Truck | Tank wagon / bobtail | Tractor + tank trailer | **Special truck** (totes + packaged zones) | **Specific trucks only** |

### Tank wagon — splitting
An order of 5 products / 10,000 gal against a 5,000 gal truck can be handled three ways,
and the dispatcher picks:
1. **Split across two trucks**, both keeping the **same delivery number**.
2. **Create two separate orders.**
3. **Tweak the quantities** on the order down to what the truck holds.

### Transport — no splitting
If the quantity exceeds the truck, you **create a second order and assign it to a
different truck**. Never split one order across two transports.

### Lubes & packaged
Usually one or the other. When both ride together, the truck must be one with
**totes** (bulk lube) **and zones** (packaged goods).

### Naming conflict to settle ⚠️
Three different LOS vocabularies are live today:

| Where | Words |
|---|---|
| This brief (the operational truth) | Tank wagon · Transport · Lubes & packaged · Propane |
| UV Customers | Transportation · Tank Wagon · Propane |
| 3PL + Customer Portal switch | All · Fuel · Lubricants · Propane |

UV has no Lubricants; 3PL collapses Tank wagon and Transport into "Fuel". The
four-way split above is the real one — the other two are lossy. **Pick one set of
words before any of this is built.**

---

## 3. Products

### Blend
Two source products in a fixed ratio. Already documented; **three fulfilment modes,
all of which happen**, and we have never chosen which to model:

1. **Pre-mixed** by the supplier — arrives as one product.
2. **Same compartment** — components loaded together.
3. **Separate compartments** — mixed on site.

A later note (R10.10) says **blends are made at the terminal**, so a load-order line
can itself be a blend. A blend can be **branded or unbranded** like any product.

**Still open:** ratio product-defined or customer-custom, and which mode to build
first. This is unresolved in the FP DS docs too — there is nothing to copy.

**What the US market actually blends** (for sample data):

| Blend | Ratio | Notes |
|---|---|---|
| E10 | ≤10% ethanol | The default US petrol; most common blend sold |
| E15 | 10.5–15% ethanol | **Cannot be blended at the terminal** — made on site from E85 + E10 |
| E85 | 51–83% ethanol | Varies by geography and season; flex-fuel vehicles only |
| B5 | 5% biodiesel | Low-level; can move through a terminal unremarked |
| B20 | 20% biodiesel | Not a low-level blend; cold-weather performance is the catch |
| B0–B20 | — | The OPIS product ladder we already list |

Seasonality is real: Minnesota mandates B20 from 15 April to end of September and
drops to B5 October–March for cold-weather performance. Some states bar anything
between E10 and E85 for retail. So **a blend's availability is a function of date
and state**, not just of the terminal.

### Branded / unbranded
Every product can be listed **either way**, blends included. Branded = the refiner
name on the OPIS rack price (Valero, Shell, Phillips 66, Chevron); unbranded is the
same product without it. It is a **listing attribute of the product**, not a separate
product.

### Comparable products
A **substitute**: if product A is unavailable, a comparable B may be used in its
place; a non-comparable C may not. Comparability defines **what can be swapped in for
what** — so it is a relation between products, not a flag on one.

Already drawn in the prototypes as `123 (≈ UNL87)`.

**Open:** the comparable-product and blend **selection rules during planning** are
listed as a gap in `dispatcher-entities.md` — i.e. nobody has written down when the
planner is allowed to substitute.

### Tank monitors
Relevant because tank wagon delivers into assets that may or may not have one.

- An asset is in one of three states: **no monitor · monitor not linked · linked**.
- A linked monitor reports **gallons in the tank** and a **last ping** time; level =
  gallons at last ping ÷ capacity, shown as a whole %.
- Monitor IDs look like `MON-…`, model e.g. "FP Sense 2".
- In 3PL delivery orders the asset picker's Fuel tab narrows to
  **All · Tank Monitors · No Tank Monitors**, and sample ship-tos carry both.
- **Standing rule:** do not propose level-triggered rules or orders ("order when below
  X%") until Pavan raises it. Monitor fields stay as they are.

---

## 4. Validations

### V1 — Line-of-service compatibility
An order may only be load-planned onto a truck whose **LOS matches the products
requested**. Propane goes on propane trucks; packaged goods go on the lubes truck;
a transport does not run a tank-wagon multi-drop.

### V2 — Quantity against capacity, with the way out
When the order exceeds what the truck holds, say so **and name the three options**.

> **Order XYZ** — 5 products, 10,000 gal.
> **Truck** — 5 compartments × 1,000 gal (5,000 gal capacity).
>
> *Warning: the order request exceeds truck capacity. Split the order, tweak the
> delivery quantity, or create a second order and assign it to a different truck.*

The third option is the **only** one available on a Transport (§2).

### V3 — Rules already specified elsewhere, to fold in
- **One product per compartment**, blend excepted — built.
- **Misfill = hard block** at the compartment, not a warning.
- **Retained fuel is absorbed, never stacked** — built in create-order.
- **Switch-loading:** a compartment that last held dyed product cannot take clear
  product without being managed first (contamination + the dyed-vs-clear tax).
  **Not modelled anywhere yet** — our packing reassigns an emptied compartment freely.
- **Weight caps the load before volume does.** Diesel ≈ 7.0 lb/gal, petrol ≈ 6.0–6.2.
  A 9,000-gal transport may only legally carry ~7,500 gal of diesel, so "capacity" is
  **product-dependent**. Not modelled anywhere yet.

---

## 5. What this changes in the shift-planner prototype

| Today | Should be |
|---|---|
| Every truck can take any order | Truck filtered by LOS first |
| Overflow is reported as "would not fit" | Offer split / tweak / second order, by LOS |
| Capacity is one number | Product-dependent (weight) |
| An emptied compartment takes any product | Switch-loading guard |
| `PB-9` 6,000 gal is a "tank wagon" | Over the 5,000 ceiling — it is a transport |
| `LT` 10,500 gal is a "transport" | Over the 9,000 ceiling — truck-and-pup or doubles |
| No lubes or propane rigs exist | Four lines of service need four rig types |

---

## 6. Open questions

1. **Which LOS vocabulary wins** (§2) — blocks everything else.
2. **Blend:** ratio source, and which of the three fulfilment modes first.
3. **When may the planner substitute a comparable product** — nobody has written it.
4. **Propane:** splitting rules and load source not yet given.
5. **Lubes:** how a tote and a packaged zone are represented on a rig drawing.
6. Does the same-delivery-number split (§2) create one order or two in the data?

## Sources

- [Alternative Fuels Data Center — fuel blends](https://afdc.energy.gov/fuels/blends.html)
- [Alternative Fuels Data Center — ethanol codes](https://afdc.energy.gov/fuels/ethanol-codes)
- [Targray — terminology of biofuel blends](https://www.targray.com/biofuels/blends)
- [Targray — what is E15 ethanol](https://www.targray.com/biofuels/blends/e15-ethanol)
- [Minnesota House Research — biofuel mandates](https://www.house.mn.gov/hrd/pubs/ss/ssbiofuel.pdf)
- [Washington State Dept. of Agriculture — biofuel quality and labeling](https://cms.agr.wa.gov/WSDAKentico/Imported/332-BiofuelQualityAndLabelingBrochure.pdf)
