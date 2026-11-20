# Blends, and splash blending

> **Nothing built.** What splash blending is, what it breaks, and what we would
> have to do. Written 2026-11-20 before any of it is executed.
>
> Companion to [`planning-rules.md`](planning-rules.md) §3, which carries the
> blend definition and the US blend catalogue.

---

## 1. What splash blending is

A blend is two products in a fixed ratio — E20 is 80% petrol, 20% ethanol. How
it gets made is a separate question from what it is, and **all three ways
happen**:

| | Where it is mixed | What the truck carries |
|---|---|---|
| **Pre-mixed** | Supplier / terminal, before loading | One product. The blend is just a product. |
| **Splash blend** | **In the compartment, in transit** | **Both constituents in one compartment**, mixing by the sloshing of the run. |
| **Separate** | At the ship-to | Each constituent in its own compartment, mixed on site. |

**Splash blending is the one that breaks us.** The other two leave our rules
alone: pre-mixed is a single product like any other, and separate-compartment
is two ordinary compartment loads that happen to meet at the tank.

Splash is the exception the whole prototype has been written around —
**one product per compartment, blends excepted**. We have been saying "blends
excepted" since the beginning and never built the exception.

The operational detail that matters: **the loading order is part of the
method.** The smaller component goes in first and the larger one splashes in on
top of it, which is what does the mixing. Load them the wrong way round and the
blend is poor. So a splash-blended compartment is not just "two products in a
box" — it is an ordered instruction.

*(I am confident about the principle and that sequence is specified per blend;
I am not confident about the exact sequence and tolerance for each product —
those should come from you or from the terminal's own procedure, not from me.)*

---

## 2. What exists today

Almost nothing, and one piece of it is wrong.

- `BLEND_PRODUCTS` is a **flat list of product names** in Create order (empty)
  and Edit order (`['CLR DSL']`). It drives a "Blend" badge and the word
  "(blend)" next to a compartment. There are no constituents and no ratio.
- **CLR DSL is not a blend.** Clear diesel is a straight product; that sample
  data is a placeholder someone needed for the badge.
- The shift planner has no blend concept at all. Its packer enforces one
  product per compartment with no exception.
- Constituents are not in our product list. There is no **Ethanol**, no
  **biodiesel/FAME**. Some constituents are never delivered neat, so they are
  products for loading and sourcing but not for ordering.

---

## 3. What would have to change

### 3.1 The product model
A blend needs constituents and ratios, not a name on a list:

```
'E20': { parts: [ {p:'UNL87', pct:80}, {p:'Ethanol', pct:20} ],
         method: 'splash', sequence: ['Ethanol','UNL87'] }
```

- Constituent products have to exist, including ones we never deliver neat.
- **Open (O16, unresolved in the FP DS docs too): is the ratio fixed by the
  product, or can a customer order a custom one?** This changes whether a blend
  is a catalogue entry or an order line attribute.

### 3.2 The compartment can hold more than one thing
Today a compartment is `{p, q}`. A splash-blended one is a blend plus its
parts, and the parts have to stay in ratio:

```
{ blend:'E20', parts:[{p:'UNL87', q:1600}, {p:'Ethanol', q:400}] }
```

Everything that reads a compartment — the drawing, the fit calculation, the
totals, the bars, the labels — currently assumes one product and would need to
handle both shapes.

### 3.3 The packer
- Constituents must be placed **together, in ratio**, never as two independent
  products that happen to land in the same place.
- An order line for a blend has to be **exploded into constituents** before
  packing, because the truck carries the parts, not the blend.
- A compartment part-filled with a blend can only take more of **that same
  blend**, in ratio.

### 3.4 Ratio validation, and the tools that can break it
This is the part that will bite. We built two things that happily destroy a
blend:

- **Moving fuel between compartments** — taking 100 gal of UNL87 out of an E20
  compartment leaves 1,500/400, which is not E20 any more.
- **Cutting an order back** (the overload fix) — trimming gallons off a blend
  line has to trim both constituents in ratio.

So: a tolerance, a check against it, and a refusal or warning when a move would
put a compartment off-spec. **The tolerance is a number we do not have.**

### 3.5 Sourcing — one order line, two buys
A splash blend is **not bought as one thing**. You buy the constituents, often
from different suppliers, sometimes from different terminals.

- One blended product on an order becomes **two or more load-order lines**.
- Best buy prices the blend as the ratio-weighted sum of its parts' landed
  costs — and each part draws down its own contract's allocation and MTQ.
- Which means the Option 2 per-product table grows a case it does not have: a
  product whose row is really two rows.

### 3.6 What the customer ordered is not what the truck carries
The order says "E20, 2,000 gal". The truck carries "UNL87 1,600 + Ethanol 400".
The meter measures the blend going out. So the order product, the load product
and the delivered product are three views of one thing, and the screens have to
agree about which they are showing.

### 3.7 Comparable products
If UNL87 is short, a comparable may normally stand in. **Inside a blend it
changes the spec.** Needs a rule: probably not without approval. Related to the
existing open question about when the planner may substitute at all.

### 3.8 Availability is not constant
From the industry sources in `planning-rules.md`:

- **E15 cannot be terminal-blended** — it is made on site from E85 and E10, so
  it is a splash-type product by necessity.
- **Seasonal mandates move the ratio**: Minnesota runs B20 from 15 April to end
  of September and B5 October–March, for cold-weather performance.
- Some states bar intermediate ethanol blends for retail.

So a blend's availability is a function of **date and state**, not just of the
terminal. Modelling this properly needs per-state data; a first pass could warn
on the date alone.

### 3.9 How it draws
A splash-blended compartment has two products in it. Our drawing gives a
compartment one fill colour. Options, none obviously right:

- two colour bands stacked in ratio inside the one compartment
- the blend's own colour, with the parts named in the label
- one colour plus a blend marker

This is a real design question, not a detail — the whole point of the drawing
is that you can read the load at a glance.

### 3.10 Every order carrying a blend says so
Any order with a blend on it shows a **Blend** label. Cheap once the product
model exists, but it has to appear in every place an order's products are
listed, or it will be the one screen that does not say it:

| Where | Today |
|---|---|
| Shift planner — order cards in column 1 | No badge of any kind |
| Shift planner — order chips in a driver's lane | No badge |
| Create order — the lines table | `badge-blend` exists, fed by an empty list |
| Edit order — the lines table and compartment labels | `badge-blend` and the "(blend)" suffix exist, fed by `['CLR DSL']`, which is wrong |

So two of the three prototypes already draw the badge and neither has real data
behind it. The work is the product model, not the label.

Worth deciding at the same time: the order says **E20** and the truck carries
**UNL87 + Ethanol**. The label belongs to the order's product. A compartment
mid-run is not "a blend order" — it is a compartment holding two constituents
that make one — so the compartment's own marker is a different thing from this
label, and should not be the same component reused.

---

## 4. Decisions

### Settled
**1. Splash only** (2026-11-20). Pre-mixed and separate-compartment are out of
scope. That is the right call for a first build — splash is the only one that
needs new rules, so the other two add screens without teaching us anything.

Worth knowing what it leaves out: a pre-mixed blend is how most retail fuel
actually moves, and separate-compartment is the mode a customer uses when they
want the mixing done at their own tank. Neither is modelled, so the prototype
will show splash as if it were the only way.

### Proposed, unless you say otherwise
These are defaults I would build to. None is a guess I am hiding — each is the
conservative reading, and each is one line to change.

| | Default | Why |
|---|---|---|
| **2. Ratio** | Fixed by the product (E20 is always 80/20) | The industry norm and the simpler half of O16. Customer-custom ratios can come later as an order-line override. |
| **3. Tolerance** | **Block**, not warn, outside ±1% of the ratio | Off-spec fuel is a compliance problem, not a preference. A warning you can click past is the wrong shape for it. The ±1% is mine and should be checked. |
| **4. Comparable inside a blend** | Not allowed | Substituting a constituent changes the product. It needs an approval flow we have not designed. |
| **5. Blends we carry** | E10, E15, E85, B5, B20 — plus **Ethanol** and **Biodiesel** as constituent products | Straight from the US catalogue already in `planning-rules.md`. E15 is worth having because it cannot be terminal-blended, so it is splash by necessity. |

### Still yours to call
**6. How a blended compartment reads.** Our drawing gives a compartment one
fill colour and this one holds two products. The options:

- **two bands stacked in ratio** inside the compartment — shows the make-up at
  a glance, but a 95/5 blend is a hairline and may read as a drawing artefact
- **the blend's own colour** with the parts named below — clean, but the
  compartment stops telling you what is physically in it
- **one colour plus a blend marker** — least change, least information

I would build the first. It is the only one that keeps the drawing's promise
that you can read the load by looking at it.

---

## 5. If we build it, the order to do it in

1. Product model with constituents and ratio, plus the constituent products.
   Fix the `CLR DSL` sample data at the same time, and wire the **Blend** label
   (§3.10) to it everywhere an order's products are listed — including the two
   places in the planner that have no badge at all.
2. Compartment shape that can hold a blend, and everything that reads it.
3. Packer: explode an order line into constituents, place in ratio.
4. Ratio guards on the two tools that can break a blend — the fuel move and the
   order trim.
5. The drawing.
6. Sourcing: one line becomes two buys, in Best buy.
7. Availability by date, and later by state.

Steps 1–4 are the real work. 5 is a design question. 6 is a second piece of
work in another screen. 7 needs data we do not have.
