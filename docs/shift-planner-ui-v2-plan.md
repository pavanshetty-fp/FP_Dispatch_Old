# Shift Planner — UI v2

> **Plan only. Nothing built.** Written 2026-11-20.
> The planner as it stands today is kept untouched and becomes **V1**.
> Everything here goes into a second file and is called **V2**.
>
> **The layout does not change.** Two columns, the splitter, drag and drop,
> pop-out, every piece of data and the whole HOS model stay exactly as they are.
> This is about volume, not about structure.

---

## 1. What is actually causing the load

Measured on the screen, not guessed.

| | Today |
|---|---|
| A resting driver lane | **160px tall, 17 pieces of text** — eight of which are HOS numbers |
| Lanes visible at once | **5½ of 19.** Nineteen drivers is three and a half screens of scrolling |
| An order card | **143px, 8 facts** — time, ID, status, ship-to, address, product chips, quantities, fit verdict |
| Type sizes in the body | **8**, from 9px to 15px. Four of them are below 11px |
| Corner radii | the two tokens, plus **six** hand-written values (2, 3, 4, 5, 6, 9px) |
| Status colour | an amber *Unplanned* pill on **25 of 26 cards** — while the Unplanned filter is on |

One sentence: **nothing on this screen is quiet.** Every lane shows every fact
about every driver at full volume, whether or not you are looking at that
driver, so the eye has nowhere to rest and no way to tell what matters.

The fix is not to remove information. It is to give each fact a **depth** —
resting, open, or in the sheet — and to spend colour only where a decision
changes.

---

## 2. The six moves

### Move 1 — A lane at rest is one line
*The biggest single change, and the only one that changes behaviour rather than
appearance.*

- **Resting lane, ~56px:** avatar, name, a duty dot, the truck ID, one fill bar
  with its percentage, and an exception badge **only when there is one** —
  hours tight, overloaded, off duty.
- **Open lane:** exactly what you see today. The truck drawn, the HOS strip,
  the orders, Change driver.
- Only one lane is open at a time, as now.

**What it buys:** 14 lanes on screen instead of 5½. You see the whole shift
without scrolling, which is the thing the planner is for.

### Move 2 — Hours of service gets three depths
The four clocks are right, but they are on all nineteen lanes at 9.5px, where
nobody reads them and everybody sees them.

- **Resting:** nothing, unless a clock is amber or red — then one chip,
  *"Cycle 3:42"*, the worst clock only.
- **Open:** today's four-clock strip, unchanged.
- **Sheet:** today's dials, cycle bar, ELD graph and duty log, unchanged.

Same data, same Samsara model, same "surface, don't compute" rule. It simply
stops shouting at a driver you are not looking at.

### Move 3 — Colour means exception
- The amber *Unplanned* pill goes when the Unplanned filter is already on —
  the left edge bar on the card already says it. It comes back in All and
  Planned.
- The green *On duty* pill on every lane becomes a dot. The words come back in
  the open lane, where Driving and Off duty actually change what you do.
- Product dots stay — they map to the compartment colours, which is real
  information.

**What it buys:** on a resting screen the only coloured things are the fuel and
the genuine problems. Amber starts meaning something again.

### Move 4 — One number per question
A lane says its capacity three different ways: *"5 compartments · 10,500 gal"*,
*"0% · 0 aboard"*, *"0 orders · 0 gal planned"*. An order card says its fit
twice — a percentage and a sentence.

One read-out each, on both:

- Lane: a fill bar, then **"0 of 10,500 gal · 5 compartments"**.
- Card: one fit line, not a bar plus a sentence.

### Move 5 — Five type sizes and two radii
Eight sizes become **18 / 14 / 13 / 12 / 11**, nothing below 11px. The six
hand-written radii become the two tokens. The spacing follows the same
tightening.

Nothing moves, nothing is removed — and this alone takes most of the "busy"
feeling out, because the eye stops being asked to rank eight different kinds of
text.

### Move 6 — One control per header
Both column headers wrap at normal width. The left carries a filter switch, a
sort switch and two icon buttons; the right carries availability, shift, three
icons and a search box.

Each header keeps **one** switch — left: Unplanned / Planned / All; right:
Available / All. Blend, sort, shift and the column tools move behind a single
filter icon with a dot when anything is off its default. This is your existing
*view tools beside the switch* rule, applied here.

---

## 3. What is deliberately not in this

- No new features, no new data, no copy rewrite.
- The layout, the splitter and its saved width, drag and drop, the pop-out
  windows, the compartment drawing and the packing rules: all untouched.
- Nothing from the backlog — lines of service, weight, switch-loading, reloads,
  sourcing — comes in here.

---

## 4. Order of work

| | Step | Why here |
|---|---|---|
| 1 | Fork the file, label it V2 | V1 stays openable and comparable side by side |
| 2 | Type, radius and spacing scale (Move 5) | Cheapest, felt immediately, everything after sits on it |
| 3 | Colour as exception (Move 3) | Needs the scale under it |
| 4 | One number per question (Move 4) | Clears the lanes before they collapse |
| 5 | Lane rest / open (Move 1) and HOS depths (Move 2) | The real work, done once the content is already lean |
| 6 | Header consolidation (Move 6) | Last, because it is independent |
| 7 | Smoke suite + clip check against V2 | All 54 planner checks must pass on the new file too |

Steps 2–4 are a day's worth of tightening. Step 5 is the one with design risk
in it. Step 6 is self-contained and could be dropped without hurting the rest.

---

## 5. Open

**1. Version naming.** The current file is already called
`shift-planner-v2.html`, which collides with calling this V2. Proposal: the
existing file keeps its name and is labelled **V1** in the header; the new one
is `shift-planner-ui2.html`, labelled **V2**. Say if you want them named
differently.

**2. Move 1 is the only behavioural change.** You asked to keep the layout, and
collapsing a lane from 160px to 56px is the one item that could read as a layout
change rather than a UI one. It is also the single biggest reduction in load. It
can be dropped and the other five still stand on their own.
