# Hours of service in the shift planner

> Built 2026-11-20. Carries over the model from the **Driver HOS Surfacing**
> prototype (Oct 2026, `~/Documents/Fleet Panda/Dispatch App_HOS v1/`), which
> designed this for a Delta × Samsara integration across six dispatch screens.

---

## The one rule

**Surface, don't compute.** FleetPanda does not run the DOT rules. Samsara
computes them against each driver's own ruleset and we read the clocks as they
come. Every number here is shown, coloured and compared — none of it is derived
from our shift data. If Samsara and the shift window disagree, Samsara is right.

## The four clocks

Samsara's own driver-app dials, which come straight from its HOS Clocks API, so
they are pull-friendly. Each is **minutes remaining**:

| Clock | Limit | What it is |
|---|---|---|
| **Break** | 8 h | driving time until the mandatory 30-minute break |
| **Drive** | 11 h | driving time left |
| **Shift** | 14 h | the on-duty window left |
| **Cycle** | 70 h | the rolling 8-day limit left |

Green until a fifth of the limit is left, amber from there, red under 8% —
Samsara's own thresholds.

**The cycle is hours, not days.** A rolling window: each night the oldest day's
hours roll off and come back. Never "day N of 8". The sheet says how much
returns tonight.

## Where it shows

- **Every lane** carries all four clocks in a 2×2 grid, with `Samsara` named on
  the strip so nobody mistakes them for ours. The binding clock is marked **only
  when it is tight** — on a rested driver every clock is green and underlining
  one of them says nothing.
- **View detail** opens a right-hand side sheet: the four dials, the binding
  limit named, the weekly cycle with what returns tonight, the ELD day graph
  (OFF / SB / D / ON) and the hour-by-hour duty log.

## Why it earns the space

Three available drivers are deep into the 8-day window — one with nine minutes
of cycle left — while their day clocks read almost full. A dispatcher going by
the shift board alone would hand them a load they cannot legally finish. That
is the week-level risk a shift-only view misses, and the reason the cycle clock
is on the card rather than only in the sheet.

## What is mocked

All of it, shaped like the pull: `{brk, drv, shf, cyc}` minutes remaining, a
duty status (`ON` / `D` / `OFF` / `SB`), minutes since the last read, and what
rolls off tonight. The duty log is a plausible day clipped to the time now.

In production these come from Samsara's one-way pull — HOS Clocks API, the
duty-status log, and historical logs.

## Not carried over

- **The capacity score** (*+N orders*, `full shift · 12h free`) — the headline
  of the original driver picker. It answers "how much more can this driver
  absorb today", which is the assignment question, not the overview question.
- **Planned-date modes** (today / tomorrow / a week out). The planner is a
  single day, so the clocks are always live.
- **PTO, day-off and no-ELD gates**, which need a real roster source.
