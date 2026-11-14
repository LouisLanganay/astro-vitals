# Sources and limits

This file is for the presentation. It gives the source of each rule in `rules/rules.toml`, the values that are design selections, and the limits of the prototype.

## Not a medical device

Astro Vitals is a student prototype for the NASA Space Apps Challenge 2026. It is not a medical device. It does not make a diagnosis. It tells the astronaut when to use self-care, when to tell the Crew Medical Officer (CMO), and when to send a packet to the flight surgeon. A flight surgeon makes all medical decisions.

## Levels

| Level | Meaning |
|---|---|
| `ok` | No rule fires. |
| `self_care` | The astronaut can act alone: sleep, fluid, exercise, rest. |
| `tell_cmo` | The astronaut tells the Crew Medical Officer. |
| `flight_surgeon` | The astronaut exports a packet for the flight surgeon. |

## Rules and sources

| Area | Rules | What fires the rule | Level | Source |
|---|---|---|---|---|
| Sleep | `sleep_7d_below_6h` | Mean sleep below 6 h for 7 days (5 days with data minimum) | self_care | [Sleep, 2022](https://doi.org/10.1093/sleep/zsac006) |
| Sleep | `sleep_3d_below_5h` | Mean sleep below 5 h for 3 days (2 days with data minimum) | tell_cmo | [Sleep, 2022](https://doi.org/10.1093/sleep/zsac006) |
| Reaction time (PVT-B) | `pvt_mean_rt_drift_*`, `pvt_lapses_drift_*` | Drift from the pre-flight baseline: score 2 or more, then 3 or more | self_care, tell_cmo | [Sleep, 2022](https://doi.org/10.1093/sleep/zsac006) |
| Mood, stress, tiredness | `*_drift_7d` | Drift score 2 or more | self_care | [PLOS ONE, Mars-500](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0093298) |
| Mood, stress, tiredness | `*_drift_14d` | Drift score 2 or more on 8 days in sequence (14 days of data) | tell_cmo | [PLOS ONE, Mars-500](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0093298) |
| Fluid | `fluid_3d_below_2_5l` | Mean fluid below 2.5 L for 3 days (2 days with data minimum) | self_care | [NASA OCHMO MTB-003, urinary health](https://www.nasa.gov/ochmo-mtb-003-urinary-health-2/) |
| Exercise | `exercise_7d_below_prescription` | Mean exercise below the prescription (90 min each day by default) for 7 days | self_care | [NASA HRP, fitness risk](https://www.nasa.gov/reference/risk-of-reduced-cardiorespiratory-and-musculoskeletal-fitness/) |
| Symptoms | `symptom_longer_than_7_days` | One symptom on more than 7 days in sequence | tell_cmo | [Crucian et al., IJGM](https://www.dovepress.com/incidence-of-clinical-symptoms-during-long-duration-orbital-spacefligh-peer-reviewed-article-IJGM) |
| Symptoms | `symptom_recurrent_30_days` | One symptom with 2 or more episodes in 30 days | tell_cmo | [Crucian et al., IJGM](https://www.dovepress.com/incidence-of-clinical-symptoms-during-long-duration-orbital-spacefligh-peer-reviewed-article-IJGM) |
| Symptoms | `symptom_treated_not_improved` | A treated symptom that did not improve | tell_cmo | [Crucian et al., IJGM](https://www.dovepress.com/incidence-of-clinical-symptoms-during-long-duration-orbital-spacefligh-peer-reviewed-article-IJGM) |
| Vision | `amsler_*_distortion` | New Amsler grid distortion in one eye | tell_cmo | [NASA HRP, SANS](https://www.nasa.gov/reference/risk-of-spaceflight-associated-neuro-ocular-syndrome-sans/) |
| Vision | `acuity_*_worse` | Acuity 0.2 logMAR worse than the pre-flight test in one eye | tell_cmo | [PMC7005826](https://pmc.ncbi.nlm.nih.gov/articles/PMC7005826) |
| Vision | `amsler_*_distortion_2_tests`, `acuity_*_worse_2_tests` | The same finding on 2 tests in sequence | flight_surgeon | [NASA HRP, SANS](https://www.nasa.gov/reference/risk-of-spaceflight-associated-neuro-ocular-syndrome-sans/), [PMC7005826](https://pmc.ncbi.nlm.nih.gov/articles/PMC7005826) |
| Red flags | `red_flag_chest_pain`, `red_flag_fainting`, `red_flag_fever` | The astronaut reports the symptom | flight_surgeon | [NASA OCHMO TB-033, medical care](https://www.nasa.gov/wp-content/uploads/2023/07/ochmo-tb-033-spaceflight-experience-medical-care-rev-c.pdf) |
| Red flags | `red_flag_sudden_vision_loss` | The astronaut reports the symptom | flight_surgeon | [NASA HRP, SANS](https://www.nasa.gov/reference/risk-of-spaceflight-associated-neuro-ocular-syndrome-sans/) |
| Red flags | `red_flag_blood_in_urine` | The astronaut reports the symptom | flight_surgeon | [NASA OCHMO MTB-003, urinary health](https://www.nasa.gov/ochmo-mtb-003-urinary-health-2/) |
| Red flags | `red_flag_one_sided_swelling` | The astronaut reports the symptom | flight_surgeon | [NASA OCHMO, venous thromboembolism](https://www.nasa.gov/organizations/ochmo/risk-of-venous-thromboembolism-during-spaceflight/) |

## Design selections

The sources describe the risks. They do not give these values. We selected them for the prototype:

- Drift levels: score 2 gives `self_care`, score 3 gives `tell_cmo`.
- Drift score: (mean of the last 7 days - pre-flight median) / max(1.4826 x MAD, minimum scale). The baseline uses the 14 pre-flight days. The score needs 7 pre-flight days or more.
- Minimum days with data in a window (`min_days`). One missing check does not stop a 3-day rule.
- 2 episodes in 30 days for a recurrent symptom.
- 0.2 logMAR for a change in acuity.

## Limits

- All data is simulated. The team has no wearable or medical hardware.
- The data stays on the device. The packet export is the only output.
- The acuity test uses the tablet screen. The screen cannot show letters below a limit that depends on its size and resolution. If the true acuity is better than that limit, the test does not see a small loss of acuity.
- The PVT-B uses touch input. Touch latency changes with the device. The baseline is personal, so the drift score uses the same device before and during the flight.
- The thresholds are not validated on astronauts. A flight surgeon must review them before real use.
