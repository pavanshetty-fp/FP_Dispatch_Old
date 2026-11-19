# Planning rules — lines of service, products, validations

> **Status: captured, not built.** Pavan's brief of 2026-11-19, reconciled with what
> already exists. Nothing in the prototypes obeys this yet; this is the sheet we
> build against when we come back to it.
>
> **Sources already in hand:** `FP-DS-2026/docs/context/fuel-supply-and-sourcing.md`
> (products, blends, branded, comparable, **Best Buy and sourcing**),
> `assets-tanks-and-leases.md` (tank monitors), `customers-and-sites.md` (the
> existing LOS words), `DS Claude 2026/docs/plan-load-rules.md` (packing, truck
> ranking, mismatch handling, **R10 Best Buy, R11 supply data model**),
> `truck-types.md` (classes, weight, switch-loading),
> `fuel-supply-sourcing-model.md` (the ERD under it all).

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

### The canonical words — settled 2026-11-19 ✅
**Tank wagon · Transport · Lubes & packaged · Propane.** These four win everywhere.
The two older vocabularies are retired; both lost information the packer needs.

| Old word | Where it was | Becomes |
|---|---|---|
| Transportation | UV Customers | **Transport** |
| Tank Wagon | UV Customers | **Tank wagon** (lower-case w) |
| Propane | UV Customers, 3PL, Portal | **Propane** |
| Fuel | 3PL, Customer Portal | **splits into Tank wagon *or* Transport** |
| Lubricants | 3PL, Customer Portal | **Lubes & packaged** |
| *(absent)* | UV Customers | **Lubes & packaged** — UV never had it |

**The one migration that is not mechanical:** 3PL and the Portal tag records
"Fuel", which is exactly the distinction that decides whether an order may be
split (§2). Every existing Fuel record has to be read as one or the other —
by truck class on the order, where that is known.

An account can still hold several lines of service, as UV already allows.

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

## 4. Best Buy — where the fuel is bought

### What it is
A **daily sourcing directive from pricing**, produced **upstream of dispatch** and
**not automated**. Per product it names a **preferred source** among
**contract · spot · bulk plant**, as up to **three ranked choices**. The dispatcher
consumes it; they do not make the buying call.

### The yardstick is total landed cost, not price
**TLC = base + freight**, and freight (source → route) is **always** included.
Base is the contract price (OPIS index + spread), the spot price, or the bulk
plant's cost basis — so all three compare on one number. The consequence that
catches people: **a far terminal with cheap spot can lose to a nearer source.**

### Preferred is not the same as cheapest ⚠️
**MTQ applies to contracts only.** A contract **behind pace** can be the preferred
source even when it is **not** the cheapest landed cost — and that "why" has to be
explainable on screen. The rule in the live-route data: preferred = the contract
when its MTQ is behind or at risk, otherwise the cheapest landed.

MTQ states: **on pace · behind · at risk (must lift) · ahead.**

### What the dispatcher actually does
The **source arrives pre-decided**. Their act is picking **where** to load — the
terminal or bulk plant — and the loading number. They may pick a terminal with
**no contract at all** when spot there is cheaper net of freight.

### Override, and the reason prompt
The dispatcher may fall back to R2 / R3, or pick an unranked contract, supplier or
spot — **always with a reason**. The reason fires on **deviating from preferred**,
**not** on "not cheapest".

Two override flows, both still to be designed: **buyer approval required**, or
**dispatcher-is-buyer** (overrides directly, no approval).

### Source preference ladder
Split only when availability forces it:

1. One terminal, one supplier fills the **whole load**
2. Different suppliers, **same terminal**
3. Different terminals
4. Per-product split across sources

### Balances, per loading number, per day
| | |
|---|---|
| **Planned** | Load orders created, not yet completed |
| **Lifted** | Load orders completed |
| **Available** | **Allocation − Planned − Lifted** |

- **Allocation is the ceiling, MTQ the floor** (allocation 100k → MTQ ~80–85k).
- Allocation is **company-level and shared** — every dispatcher draws down one pool.
  The dispatcher works to **today's** figure; the buyer watches all horizons.
- **Confirm-to-commit:** selecting a source reserves nothing. Confirming the load
  order moves gallons into Planned; completion moves Planned → Lifted.
- **Over-allocation:** Plan exceeds Allocation → warn → "request more allocation for
  today" → buyer notified. Approve raises it. **Reject disables that loading number
  and the ranks shift up** (R2 → R1).
- The dispatcher sees the **must lift** tag, never the MTQ horizon numbers.

### Loading number vs loading account — two different things ⚠️
Same area, two vocabularies, and they are not interchangeable:

| | **Loading number** | **Loading account** |
|---|---|---|
| Where | Planning prototype | 3PL + Master Data |
| What | Dispatcher-assigned key for driver ↔ supplier validation | Alphanumeric account tying a terminal, a supplier and the products loadable on it |
| Scope | **One supplier**, never shared across suppliers; contract-only (spot has none) | Belongs to a terminal **and** a supplier |
| Ranked? | Yes — buyer ranks R1 / R2 / R3 ("Exxon 1234") | No |
| Rule | Covers one or many of that supplier's contracts | **One account serves the whole order**, so it must carry every product on it |

In 3PL, Terminal and Supplier are **not free lists** — they are the distinct values
of the loading-account table, narrowed by what is already chosen. If no account
covers the product set, all three lists come back empty: *cannot be loaded from one
place.* Account names are numbers (terminal code + digits), never a name.

### The sourcing unit on screen
Two designs were drawn; **only one ships**. Option 2 became the default.

- **Option 1** — terminal-first source cards.
- **Option 2** — **one table per product**. Rows are the ranked **R1 / R2 / R3**
  followed by the unranked. Columns: **Supplier / Terminal · Type · Allocation ·
  Planned · Available · Lifted · TLC**.
  Tabs below the ranked rows: **Contracts · Spots · Bulk plants** — spots show TLC
  only; bulk plants show available, lifted and TLC but no allocation or planned.
- **Show every contract**, not just the top three.

Known trade-offs carried forward: the tables get long for a multi-product load;
"one terminal fills the whole load" is harder to see in a per-product layout; and
**terminal off-route freight is not shown beside TLC** even though TLC depends on it.

### Bulk plant is a first-class source
Tenant-owned storage, fuel bought at a good rack moment. Its **cost basis** makes it
compare fairly against contract and spot. Often co-located with a hub; replenished
by transports, drawn by tank wagons. A load order — or **one product within it** —
can load at the bulk plant.

### What our prototype has, and what it is missing
Create order step 3 has three terminals, one supplier each, rack price per product,
and two modes: *Cheapest per product* and *All at one terminal*.

| Spec'd | In our prototype |
|---|---|
| TLC = base + **freight** | ✅ **Done 2026-11-19** — freight at $0.0018/gal/mile; the cheapest rack now loses on four of seven products |
| Contract · spot · bulk plant | Terminal rack only |
| Allocation / Planned / Available / Lifted | None |
| MTQ, pace, must-lift | Pace per contract per product (on pace · behind · must lift · ahead), shown as a pill and driving the preference. No horizon numbers |
| Loading numbers ranked R1/R2/R3 by the buyer | None |
| Reason on deviating from **preferred** | ✅ **Done 2026-11-19** — a recorded reason is required, and it blocks the create |
| A terminal holds several contracts from several suppliers | One supplier per terminal |
| Four-step preference ladder | Only steps 1 and 4 |

---

## 5. Validations

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

## 6. What this changes in the shift-planner prototype

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

## 7. Open questions

1. ~~Which LOS vocabulary wins~~ — **settled 2026-11-19**, see §2. Still to do:
   carry the four words into `FP-DS-2026`'s context layer and prototypes, and
   decide each existing 3PL "Fuel" record's real line.
2. **Blend:** ratio source, and which of the three fulfilment modes first.
3. **When may the planner substitute a comparable product** — nobody has written it.
4. **Propane:** splitting rules and load source not yet given.
5. **Lubes:** how a tote and a packaged zone are represented on a rig drawing.
6. Does the same-delivery-number split (§2) create one order or two in the data?
7. **Best Buy:** which override flow — buyer-approval-required, or dispatcher-is-buyer?
   Both were to be designed and shown to the customer.
8. **Loading number vs loading account** (§4) — do the planning and 3PL models
   converge, or stay two things?
9. Is `Available = Allocation − Planned − Lifted`, or `Allocation − Planned`? The
   second holds only if Planned already includes Lifted. Still unconfirmed.
10. How the pricing directive is authored or ingested — nobody has specified it.

## Sources

- [Alternative Fuels Data Center — fuel blends](https://afdc.energy.gov/fuels/blends.html)
- [Alternative Fuels Data Center — ethanol codes](https://afdc.energy.gov/fuels/ethanol-codes)
- [Targray — terminology of biofuel blends](https://www.targray.com/biofuels/blends)
- [Targray — what is E15 ethanol](https://www.targray.com/biofuels/blends/e15-ethanol)
- [Minnesota House Research — biofuel mandates](https://www.house.mn.gov/hrd/pubs/ss/ssbiofuel.pdf)
- [Washington State Dept. of Agriculture — biofuel quality and labeling](https://cms.agr.wa.gov/WSDAKentico/Imported/332-BiofuelQualityAndLabelingBrochure.pdf)
