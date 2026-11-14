# DEMO: manual script

Time: about 8 minutes. The PVT-B takes 3 of them.

## Start

1. Run `pnpm --dir app install --frozen-lockfile`.
2. Run `pnpm --dir app tauri dev`. The window opens on the Home screen.
3. Make sure that the statement "prototype, not a medical device" shows.

## Load the scenario

1. Open "Settings".
2. In "Load a scenario", select `sleep_debt`. Select "Replace the data".
3. Expected: mission day 120. First `self_care` day: 50. First `tell_cmo` day: 57.

## Home screen

1. Open "Home".
2. Expected: mission day 120, level "Tell the CMO" with color, icon and text.
3. Expected: "Tasks that are due" lists the daily check, the vision test and the PVT-B (optional).
4. Expected: each fired rule shows its action, its explanation and its source URL.

## Body figure

1. Open "Body figure".
2. Select the head. Expected: the headache symptom, the indicators of the head and the fired rules.
3. Log one symptom from a region. Expected: the symptom shows in the region after the save.

## Trends

1. Open "Trends". Select "Sleep".
2. Expected: the daily values, the 7-day mean and the baseline median. The sleep decreases from mission day 40.

## Daily check

1. Open "Daily check". Fill each field. Select "Save".
2. Expected: the Home screen shows no daily check in the due tasks. The streak is 1.
3. Enter a fluid value of -1. Expected: the error shows at the fluid field.

## PVT-B

1. Open "PVT-B". Start the test. Press Space at each stimulus for 3 minutes.
2. Expected: mean reaction time, lapses and false starts.
3. Start again and click a different window. Expected: the test stops and saves nothing.

## Packet export

1. Open "Packet export". Expected: the packet content and its size (16 KB or less) show before the export.
2. Select the export button and a path. Expected: one JSON file at that path.
3. Select the export button and cancel the dialog. Expected: no file.

## Restart

1. Close the window. Run `pnpm --dir app tauri dev` again.
2. Expected: the daily check, the symptom and the PVT-B result of today are present.

## Other scenarios

- `healthy`: level `ok` on each day.
- `vision`: `tell_cmo` from mission day 70, `flight_surgeon` from mission day 77.
- Vision test: it refuses to start with no calibration. Do the calibration with a bank card first.
