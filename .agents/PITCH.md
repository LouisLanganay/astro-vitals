# Pitch: slide text

Language: English. 8 slides. Each slide has the text to show and the notes for the speaker.

Format: 6 minutes for the pitch, then 4 minutes of questions. The jury grid is close to the Space Apps criteria: Impact, Creativity, Validity, Relevance, Presentation.

| Slide | Time | Criterion |
|---|---|---|
| 1. The problem | 0:40 | Impact |
| 2. Who uses it | 0:30 | Impact, Relevance |
| 3. The daily check | 0:35 | Relevance |
| 4. How it decides | 0:45 | Creativity, Validity |
| 5. Rules with sources | 0:30 | Validity |
| 6. Demo | 2:00 | Presentation |
| 7. Limits | 0:30 | Validity |
| 8. Team | 0:15 | Presentation |

Total: 5:45. Do not use the script of `DEMO.md` for the pitch: it takes 8 minutes.

## 1. The problem (0:40)

**On screen**
- Mars transit: months away from Earth, more than 20 minutes for one message.
- No doctor on board. One crew member is the Crew Medical Officer (CMO).
- Small changes in sleep, mood, reaction time or vision come slowly. Nobody sees them in time.

**Speaker notes**
On the ISS, the ground team sees the crew every day. On the way to Mars, this is not possible. The crew must find a problem early, alone.

## 2. Who uses it (0:30)

**On screen**
- The astronaut: one short check each day on a tablet.
- The CMO: knows when a crew member needs attention.
- The flight surgeon on Earth: receives a small packet, not a data stream.

**Speaker notes**
We designed for 3 people. The astronaut enters the data. The tool tells the astronaut when to tell the CMO. The flight surgeon receives a packet of 16 KB or less, because the link to Earth is slow. The same need exists for isolated crews on Earth: polar stations, submarines.

## 3. The daily check (0:35)

**On screen**
- Sleep, mood, stress, tiredness, workload, fluid, exercise.
- Symptoms on a body figure, 10 regions.
- PVT-B: a 3-minute reaction-time test. A lapse is 355 ms or more.
- Weekly vision test: acuity and Amsler grid, calibrated with a bank card.

**Speaker notes**
Each input is something an astronaut can do alone, with no medical device.

## 4. How it decides (0:45)

**On screen**
- Personal baseline: 14 days before the flight.
- Drift score: the 7-day mean compared with the baseline, in robust units (median and MAD).
- 4 levels: OK, self-care, tell the CMO, flight surgeon.

**Speaker notes**
The tool does not compare an astronaut with a population. It compares the astronaut with themselves before the flight. A drift score of 2 gives self-care. For the PVT-B, a score of 3 gives "tell the CMO". For mood, stress and tiredness, a score of 2 or more on each of 8 days in a row gives "tell the CMO". Red flags go directly to the flight surgeon. This is what makes the tool different: the astronaut is the reference, and each decision is a rule that a person can read.

## 5. Rules with sources (0:30)

**On screen**
- 31 rules in one file: `rules/rules.toml`.
- Each rule shows its action, its explanation and its source.
- Sources: NASA OCHMO technical briefs, NASA Human Research Program, peer-reviewed studies.

**Speaker notes**
Example: a mean fluid intake below 2.5 L for 3 days fires a self-care rule. The source is the NASA OCHMO brief on urinary health: in microgravity, the risk of kidney stones increases. The values that are our design selections are marked as such in `.agents/SOURCES.md`.

## 6. Demo (2:00)

**On screen**
- https://louislanganay.github.io/astro-vitals/
- Scenario "Sleep debt": 120 mission days.

**Speaker notes**
Before the pitch: open the demo on the demo device. If it shows a day different from 120, open "Settings", select "Sleep debt", then "Replace the data".
0. Intro, 0:10: open the link and select "Enter the ship". To save time, open the link with `#app`: it skips the intro.
1. Today, 0:35: mission day 120, level "Tell the CMO". Show one fired rule with its action, its explanation and its source.
2. Trends, Sleep duration, 0:25: the sleep decreases from day 40. Show the 7-day mean and the baseline. Say: first self-care on day 50, first "tell the CMO" on day 57.
3. Body, 0:20: select the head. The headache and the fired rules show. Show the "Male / Female" choice if the time permits.
4. Export, 0:20: show the size of the packet before the export.
5. Last 0:10: the web demo runs the same Rust engine as the desktop app, compiled to WebAssembly. The data stays in the browser.
Do not run the PVT-B: it takes 3 minutes. Open the screen and say it.

## 7. Limits (0:30)

**On screen**
- Prototype. Not a medical device.
- Simulated data. No wearable.
- The screen limits the acuity test. Touch latency changes the PVT-B.
- Thresholds not validated on astronauts.

**Speaker notes**
We want to be clear about what the tool does not do. A flight surgeon must review the rules before real use. The rules are in one file, so a medical team can change them without code.

## 8. Team (0:15)

**On screen**
- La Coflop, NASA Space Apps Challenge 2026, Paris.
- Elwann, Louis, Ravenne, Seb, Tug: developers.
- Built with Rust, Tauri 2 and Svelte 5. The Android app uses Expo and the same Rust engine.

**Speaker notes**
Thank the jury. Give the link again.
