# Shift Planner UI v2 — the strawman, and what I need from you

> Written 2026-11-20, after reading FPDS `01-foundations`, `units/board`,
> `units/record-sheet`, `units/summary-rail`, `units/list-split`,
> `03-molecules` (two-line cell, overflow chip, breakdown popover) and
> `07-ux-rules` §12.
>
> Answer the numbered questions and I will build. Where you say nothing, I
> build the default in italics.

---

## A. What the DS already decides, so I am not asking

These are settled by FPDS and I will simply follow them. Flagged here only so
you can object.

| | Rule | What changes in the planner |
|---|---|---|
| Type | 12 / 14 / 16 / 18, plus 10 and 11 for named narrow jobs only | The 9, 9.5 and 15px text goes. The HOS labels at 9.5px are the worst offender |
| Card text levels | L1 `14 semibold` ink · L2 `13 medium` muted · L3 `12` muted | Gives us the primary / secondary split inside one card, already named |
| Card structure | Units grouped by spacing, no rules between, a 10px uppercase heading per unit, **no field labels inside** | The order card and the lane both become units |
| Radius | 6 / 8 / 10 / 14 / full | The hand-written 2, 3, 4, 5, 9px go |
| Status colour | By kind, and **"render the absence"** — a pill every card carries says nothing | The amber *Unplanned* pill on 25 of 26 cards goes while that filter is on |
| Alerts | An alert only on a card with something outstanding — *"an alert on every card is a border"* | The HOS strip on all 19 lanes becomes an exception badge |
| Overflow | First value + a **"+N"** pill that opens the shared BreakdownCard **on click** | The product chips stop growing the card |
| Scrollbars | None visible | The planner currently styles two |
| Sheet | `RecordSheet` — right side, 56px gap, one tinted SummaryCard, plain RailCards, ActivityCard last, no Save/Cancel | Level 3 is this, not a bespoke panel |

The prototype's tokens are already the DS light values, so the token layer is
fine. **The violations are all in usage**, not in the palette.

---

## B. The strawman — three levels

### Column 1 · an order card

| Level | Holds |
|---|---|
| **1 — always on the face** | Ship-to name · total gallons · the fit against the chosen truck |
| **2 — on the face, quieter** | Delivery window · order number · products as *first + "+N"* · a Blend marker when one is on it |
| **3 — side sheet** | Address, contact, every product line with its blend constituents and ratio, PO, delivery instructions, tank levels, the order's history |

### Column 2 · a driver + truck lane

| Level | Holds |
|---|---|
| **1 — the resting lane** | Driver name · truck ID and class · a fill bar with its percentage · an exception badge **only when there is one** (hours tight, overloaded, off duty) |
| **2 — the open lane** | Shift window · the four Samsara clocks · the truck drawn with its compartments · the orders on it · Change driver / Change truck |
| **3 — side sheet** | HOS dials, the weekly cycle, the ELD day graph and the duty log · driver details · truck and trailer spec · the whole day's route |

---

## C. The questions

### Structure

**1. Is level 3 the real FPDS `RecordSheet`** — sliding in from the right, 56px
from the window edge, over the whole planner — or a panel inside the planner
that does not cover the columns?
*Default: the real RecordSheet. It is what every other module uses and it is
already specified down to the widths.*

**2. One sheet or three?** An order, a driver, and a truck/trailer are three
records. Separate sheets, or one driver sheet with the truck as a section
inside it?
*Default: an order sheet and a driver sheet. The truck and trailer are a
section inside the driver sheet, because in the planner they are never chosen
apart from the driver.*

**3. What opens the order sheet?** Today a click on an order card selects it,
and a drag loads it. If a click opens the sheet, the card needs a different
selection gesture — or none.
*Default: click opens the sheet, drag still loads. Selection goes; it is not
doing much.*

**4. What opens the driver sheet,** given the DS rule *"the whole card is the
button; no View details row"*? Today the lane opens on click and a small
"View detail" link opens the HOS sheet.
*Default: click opens the lane (level 2); a single icon button at the lane's
right edge opens the sheet. The "View detail" link goes.*

**5. Do we keep three levels on the driver side, or two?** The open lane
(level 2) and the sheet (level 3) will hold overlapping facts.
*Default: keep all three. The open lane is where you work; the sheet is where
you check.*

### Column 1 — the order card

**6. Is the order number primary or secondary?** The board card puts the number
in the head. In a planner you plan by ship-to and gallons, and the number is how
you talk about it afterwards.
*Default: secondary — ship-to leads, the number sits on the quiet line.*

**7. Is the fit read-out primary?** It is the planner's own value and it changes
with the selected truck, but it is meaningless until a truck is selected.
*Default: primary, and it only appears once a truck is selected. Before that,
the card shows gallons alone.*

**8. Products — all chips, or first + "+N"?** A blended order is three chips
today, which is what makes the card tall.
*Default: first + "+N", opening the BreakdownCard with every line and its blend
ratio.*

**9. Do you want the DS "Card fields" menu** on this column, so a dispatcher
ticks which units a card shows?
*Default: no. It is real work, and it answers a question you have not asked. I
would rather pick the right defaults.*

**10. Does the card keep the address?** It is two lines and it is in the sheet.
*Default: dropped from the card.*

### Column 2 — the lane

**11. Where does the truck drawing live?** Resting (as today), only when the
lane is open, or a thin always-on bar at rest with the full drawing when open?
*Default: a fill bar at rest, the full drawing when open.*

**12. HOS at rest — exception only, or always one figure?** The DS says render
the absence. Safety information argues the other way.
*Default: exception only — a chip appears when a clock is amber or red, and
nothing when every clock is fine.*

**13. Is the shift window primary?** Today it is on every resting lane.
*Default: secondary — it moves to the open lane. Whether a driver can take the
work is what the exception badge answers.*

**14. Does the resting lane show how many orders are on it,** or only the fill
percentage?
*Default: both, as one line — "3 orders · 7,400 of 9,000 gal".*

### The sheet

**15. Is the sheet read-only, or can you act from it?** Reassigning a driver or
unloading an order from the sheet would be a second place to do what the lane
already does.
*Default: read-only, no footer (FPDS rule 28). Acting stays in the lane.*

**16. Does the order sheet get a summary rail?** It is the DS pattern for a
record sheet, and it would hold the gallons, the fit and the blend make-up.
*Default: yes — one tinted SummaryCard, then an ActivityCard.*

### Housekeeping

**17. Version naming.** The current file is already `shift-planner-v2.html`.
*Default: it keeps its name and is labelled **V1**; the new one is
`shift-planner-ui2.html`, labelled **V2**.*

**18. Does V2 get the dark theme?** The prototype is light only. The DS carries
dark values for every token it uses.
*Default: no. It doubles the checking and you have not asked for it.*

**19. Lane collapse** — still open from the last round. Collapsing a resting
lane from 160px to 56px is the single biggest cut in load, and the only item
that reads as a layout change rather than a UI one.
*Default: do it.*
