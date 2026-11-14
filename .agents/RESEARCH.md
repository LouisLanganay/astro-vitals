# Research: astronaut health problems and indicators

Date: 2026-11-14. Source of the brief: NASA Space Apps 2026, "Create Health Monitoring Software for Astronauts on Space Missions".

Marks: `[R]` = an agent read the source page. `[S]` = the number comes from a search extract only. Verify `[S]` numbers before you publish them.

## Main findings

1. The classic vital signs are not where most problems occur. The frequent in-flight problems are sleep loss, skin rash, congestion, headache, and back pain.
2. The dangerous problems are slow and silent: bone loss, fitness loss, eye changes (SANS), radiation dose, sleep debt, mood decline. The crew sees no trend of these today.
3. Data goes to the ground, not to the crew. The flight surgeon interprets it in a weekly private conference.
4. On a Mars mission, a message takes up to 20 minutes one way. The real-time flight surgeon is not available. NASA states this gap: no computed medical decision support (HRP gap Med10).
5. Astronauts under-report symptoms because they fear loss of flight status. A tool that the crew does not trust gets no honest data.
6. A population threshold is weak for self-report data. About 55% of the variance is stable per person. Compare each person to their own baseline.

## Operations

- ISS: weekly private medical conference with a flight surgeon. The Crew Medical Officer (CMO) is the "eyes and ears" of the surgeon. [R] https://www.asc-csa.gc.ca/eng/astronauts/space-medicine/medical-support.asp
- CMO training: 15 h [S] or less than 60 h [S]. Sources conflict.
- Crew time for medical activities: "a couple hours a week". [S]
- Mars: up to 20 min delay one way, about 3 years, low resupply. [R] https://www.nasa.gov/hrp/hazard-distance-from-earth/
- NASA Integrated Medical Model, 4 crew, ISS kit, no resupply: 426-day Mars mission = 156 medical events, evacuation-level probability 0.0625. 923-day mission = 603 events, 0.294. [R] https://www.nasa.gov/wp-content/uploads/2026/08/medical-risk-assessment-for-an-accelerated-and-standard-mars-mission.pdf
- First ISS medical evacuation: Crew-11, January 2026. [R] https://www.npr.org/2026/01/15/nx-s1-5677647/nasa-spacex-crew-11-splashdown-return
- Existing software: IMM and IMPACT are planning tools, not crew-facing. AMOS guides ultrasound only. CMO-DA (NASA and Google) is a proof of concept on simulated cases. CSA C2M2 is a prototype. [S]
- Stated gaps: Med10 decision support, Med07 medical information processing, ExMC 4.14 inventory tracking. [S] https://humanresearchroadmap.nasa.gov/gaps/gap.aspx?i=642

## Frequency of in-flight problems

- ISS, 46 crew, 20.57 flight-years: 3.40 events per flight-year. Rash 1.12. Upper respiratory 0.97. 46% of crew had a "notable" event (more than 1 week, recurrent, or no response to treatment). 18 of 42 notable events occurred in month 1. [R] https://www.dovepress.com/incidence-of-clinical-symptoms-during-long-duration-orbital-spacefligh-peer-reviewed-article-IJGM
- Space adaptation syndrome 50-70%. Congestion more than 50%. Back pain 52%. Sleep aids about 71% of crew. SANS disc edema 16%. [R] https://www.nasa.gov/wp-content/uploads/2023/07/ochmo-tb-033-spaceflight-experience-medical-care-rev-c.pdf
- Headache: 22 of 24 astronauts. [S]

## Indicators by domain

| Domain | Fact | Crew-measurable indicator | Attention level | Crew action |
|---|---|---|---|---|
| Sleep | Mean 6.09 h against 8.5 h scheduled. 75% use sleep medication. [R] https://www.eurekalert.org/news-releases/595450 | Sleep log, PVT-B reaction test (3 min), 11-point scales for tiredness, stress, workload. Actigraphy. | Sleep below 6 h slows PVT-B. Below 5 h increases exhaustion. [R, abstract] https://doi.org/10.1093/sleep/zsac006 | Light settings, nap, sleep extension, caffeine timing |
| Mood | Morale declines in the third quarter (ISS journals). Mars-500: 2 of 6 crew had no disturbance in 520 days. [R] https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0093298 | Daily visual analog scales. Private journal. | No numeric threshold. Use personal baseline. | Journal, privacy, crew debrief |
| Team | Mars-500: 41 conflicts with mission control against 8 in the crew. Debrief improves performance 20-25%. [R] | Weekly conflict items, crew and ground apart | No threshold | Structured debrief |
| Fitness | Average loss 10-12%. 12-38% of crew lose more than 20%. [R] https://www.nasa.gov/reference/risk-of-reduced-cardiorespiratory-and-musculoskeletal-fitness/ | Exercise dose: ARED load, T2 and CEVIS minutes, heart rate at fixed workload | VO2max and strength at or above 80% of pre-mission. [R] https://www.nasa.gov/ochmo-tb-031-exercise-overview-2/ | Adjust the exercise prescription |
| Bone | 1-1.5% density loss per month. [R] https://www.nasa.gov/reference/risk-of-spaceflight-induced-bone-changes/ | None in flight. Proxy: resistive exercise log. | Hip and spine at or above 95% of pre-mission | Resistive exercise |
| Heart | Orthostatic intolerance 83% after long flights. Jugular thrombus found in flight. [R] | Resting heart rate, blood pressure, edema and headache symptoms. Bio-Monitor shirt. | Presyncope: systolic below 70 mmHg | Fluid loading, compression garment |
| Kidney | Urinary calcium +60-70% in the first days. [R] https://www.nasa.gov/ochmo-mtb-003-urinary-health-2/ | Daily fluid intake | Minimum 2.5 L per day | Hydration |
| Nutrition | Intake about 80% of requirement. Body mass -2.8 to -4.4%. [S] | Food log, body mass | No threshold | Meet the energy target |
| Eyes (SANS) | About 70% of ISS crew show some swelling. [R] https://www.nasa.gov/reference/risk-of-spaceflight-associated-neuro-ocular-syndrome-sans/ | Acuity test, Amsler grid, symptom report | Hyperopic shift above 0.75 D. [R] https://pmc.ncbi.nlm.nih.gov/articles/PMC7005826 | Report. No validated countermeasure. |
| Immune, skin | Herpesvirus shedding in 61% of ISS crew. [S] | Rash and cold-sore log with photo | No threshold | Report if it spreads or recurs |
| Radiation | Career limit 600 mSv. Mars round trip about 660 mSv. [S] Neutrons are about 30% of ISS radiation. [R] https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp | Personal active dosimeter | Cumulative dose against 600 mSv. Shelter on a solar particle event. | Shelter |
| Cabin CO2 | Each +1 mmHg doubles the odds of headache. ISS range 2.3-5.3 mmHg. [S] | Headache log against cabin CO2 | 24 h average above 3.0 mmHg [S] | Move to better airflow |
| Balance | Motion sickness 60-80%, 2-3 days. [S] | Symptom score, tandem-walk test after a gravity change | No threshold | Medication, head movement protocol |

## Candidate problem statements

- A. Daily self-check with personal baseline. A 5-minute routine (sleep log, reaction test, mood scales, symptom checklist). The tool shows drift from the personal baseline.
- B. Offline self-triage. Symptom in, decision out: self-care, tell the CMO, or send a store-and-forward packet to the flight surgeon. This targets gap Med10.
- C. Silent-risk budget. Exercise dose, hydration, radiation dose, vision self-test, each against a NASA limit.
- D. A as the core loop, with the escalation rule of B and a small set of limits from C.
