# DEMO: manual script

Time: about 8 minutes. The PVT-B takes 3 of them.

## Start

1. Run `pnpm --dir app install --frozen-lockfile`.
2. Run `pnpm --dir app tauri dev`. The window opens on the Today screen.
3. Make sure that the statement "prototype, not a medical device" shows.

## Load the scenario

1. Open "Settings" (in "More" on a phone).
2. In "Load a scenario", select `sleep_debt`. Select "Replace the data".
3. Expected: mission day 120. First `self_care` day: 50. First `tell_cmo` day: 57 (a headache on more than 7 days in sequence).

## Today screen

1. Open "Today".
2. Expected: mission day 120, level "Tell the CMO" with color, icon and text.
3. Expected: "Due today" lists the daily check, the vision test and the PVT-B (optional).
4. Expected: each fired rule shows its action, its explanation and its source URL.

## Body

1. Open "Body".
2. Select the head. Expected: the headache symptom, the indicators of the head and the fired rules.
3. Log one symptom from a region. Expected: the symptom shows in the region after the save.
4. Select "Female" in the figure card. Expected: the figure changes. The Today screen shows the same figure, and the choice stays after a restart.

## Trends

1. Open "Trends". Select "Sleep duration".
2. Expected: the daily values, the 7-day mean and the baseline median. The sleep decreases from mission day 40.

## Daily check

1. Open "Daily check". Move each slider. Expected: the face in "How you feel" changes with each slider. Enter fluid and exercise. Select "Save".
2. Expected: the Today screen shows the daily check as done in "Due today". The streak increases by 1.
3. Enter a fluid value of 16 (the limit is 15 L). Expected: the error shows at the fluid field.

## PVT-B

1. Open "PVT-B" (in "More" on a phone). Select "Start". Press Space (or tap the box) at each signal for 3 minutes.
2. Expected: mean reaction time, lapses and false starts.
3. Select "Start again" and click a different window. Expected: the test stops and saves nothing.

## Export

1. Open "Export". Expected: the packet content and its size (16 KB or less) show before the export.
2. Select the export button and a path. Expected: one JSON file at that path.
3. Select the export button and cancel the dialog. Expected: no file.

## Restart

1. Close the window. Run `pnpm --dir app tauri dev` again.
2. Expected: the daily check, the symptom and the PVT-B result of today are present.

## Other scenarios

- `healthy`: level `ok` on each day.
- `vision`: `tell_cmo` from mission day 70, `flight_surgeon` from mission day 77.
- Vision test: it refuses to start with no calibration. Do the calibration with a bank card first.

## Web demo

1. Open https://louislanganay.github.io/astro-vitals/. Move the pointer on the ship (or tap a part on a phone). Expected: a panel shows for each part. Select "Enter the ship", or the airlock. The `sleep_debt` scenario loads on the first visit. Add `#app` to the URL to skip the intro.
2. Do the steps above from "Today screen". The data stays in the browser storage.
3. In "Export", the export button downloads the JSON file. There is no path dialog.
4. On a phone or a tablet, the browser shows the interface 15% larger. The vision test asks for a new calibration one time after this change.
5. A scenario starts from the day of its load. On a different day, the demo loads the scenario again if you did not change the data. If you changed the data, load the scenario again in "Settings".
