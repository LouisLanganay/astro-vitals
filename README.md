# Astro Vitals

A daily health self-check for astronauts on long missions. NASA Space Apps Challenge 2026, Paris, team La Coflop. Challenge: "Create Health Monitoring Software for Astronauts on Space Missions".

**Live demo:** https://louislanganay.github.io/astro-vitals/

> Prototype. Not a medical device. All data is simulated.

## Pitch

On the way to Mars, a crew is alone for months and the delay to Earth can be more than 20 minutes. Astro Vitals gives each astronaut a 2-minute daily check on a tablet: sleep, mood, stress, fluid, exercise, symptoms on a body figure, a reaction-time test and a vision test. A rule engine compares each value with the astronaut's own pre-flight baseline and NASA sources, and tells the astronaut what to do: self-care, tell the Crew Medical Officer, or send a packet to the flight surgeon.

## Try a scenario

The live demo runs the real rule engine in the browser (Rust compiled to WebAssembly). Your data stays in your browser.

1. Open the live demo. The `sleep_debt` scenario loads on the first visit.
2. Open **Home**. Each fired rule shows its action, its explanation and its source.
3. Open **Trends** and select **Sleep** to see the values, the 7-day mean and the pre-flight median.
4. To change the scenario, open **Settings**, select a scenario in **Load a scenario**, then **Replace the data**.

| Scenario | What happens |
|---|---|
| `healthy` | Level `ok` on each day. |
| `sleep_debt` | Sleep decreases from mission day 40. First `self_care` on day 50, first `tell_cmo` on day 57. |
| `vision` | `tell_cmo` from mission day 70, `flight_surgeon` from mission day 77. |

The full manual demo script is in [`.agents/DEMO.md`](.agents/DEMO.md).

## Levels

| Level | Meaning |
|---|---|
| `ok` | No rule fires. |
| `self_care` | The astronaut can act alone. |
| `tell_cmo` | The astronaut tells the Crew Medical Officer. |
| `flight_surgeon` | The astronaut exports a packet for the flight surgeon. |

## Sources

The 31 rules are in [`rules/rules.toml`](rules/rules.toml). Each rule has an action, an explanation and a source URL (NASA OCHMO, NASA Human Research Program, peer-reviewed studies). [`.agents/SOURCES.md`](.agents/SOURCES.md) lists the source of each rule, the values that are design selections, and the limits of the prototype.

## Run the desktop app

Requirements: Rust 1.95 or later, Node 22, pnpm 10, and the [Tauri 2 system dependencies](https://v2.tauri.app/start/prerequisites/).

```sh
pnpm --dir app install --frozen-lockfile
pnpm --dir app tauri dev
```

Run the engine tests:

```sh
cargo test --workspace
```

## Project layout

| Path | Content |
|---|---|
| `crates/core` | Rule engine: baseline, drift score, rules, PVT-B scoring, scenarios, packet. No I/O. |
| `app` | Tauri 2 shell and Svelte 5 interface. |
| `rules/rules.toml` | The rules, with their sources. |
| `.agents/` | Spec, research, sources, demo script. |
