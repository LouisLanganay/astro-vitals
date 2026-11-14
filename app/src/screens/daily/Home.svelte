<script lang="ts">
  import { series } from '../../lib/api';
  import FiredRuleCard from '../../lib/FiredRuleCard.svelte';
  import Gauge from '../../lib/Gauge.svelte';
  import Icon from '../../lib/Icon.svelte';
  import type { IconName } from '../../lib/icons';
  import { INDICATOR_INFO, REGION_LABEL } from '../../lib/labels';
  import LevelBadge from '../../lib/LevelBadge.svelte';
  import LevelIcon from '../../lib/LevelIcon.svelte';
  import MiniBars from '../../lib/MiniBars.svelte';
  import { addDays, MISSION_DAYS, missionLevels } from '../../lib/mission';
  import { ruleFact, ruleTitle } from '../../lib/rules';
  import { app, navigate, refresh } from '../../lib/state.svelte';
  import Ticker from '../../lib/Ticker.svelte';
  import BodyMini from '../tests/BodyMini.svelte';
  import type { Indicator, IndicatorState, Level, Series } from '../../lib/types';

  const FLAGGED: IndicatorState[] = ['self_care', 'tell_cmo', 'flight_surgeon'];
  const VITALS: { id: Indicator; name: string; decimals: number; unit: string }[] = [
    { id: 'sleep_hours', name: 'Sleep', decimals: 1, unit: 'h' },
    { id: 'pvt_mean_rt_ms', name: 'Reaction time', decimals: 0, unit: 'ms' },
    { id: 'mood', name: 'Mood', decimals: 0, unit: '/ 10' },
    { id: 'fluid_l', name: 'Fluid intake', decimals: 1, unit: 'L' },
  ];
  const BAR_DAYS = 10;

  let showAll = $state(false);
  let seriesMap = $state.raw<Partial<Record<Indicator, Series>>>({});
  let strip = $state.raw<(Level | null)[]>([]);

  // Load the series and the day level of each mission day again after each refresh.
  $effect(() => {
    void app.revision;
    const day = app.day;
    if (!day) return;
    let stale = false;
    const ids: Indicator[] = [...VITALS.map((v) => v.id), 'acuity_right'];
    Promise.all(ids.map((id) => series(id).catch(() => null))).then((all) => {
      if (stale) return;
      const next: Partial<Record<Indicator, Series>> = {};
      all.forEach((s, k) => s && (next[ids[k]] = s));
      seriesMap = next;
    });
    missionLevels(day.mission.today, day.mission.mission_day).then((levels) => {
      if (!stale) strip = levels;
    });
    return () => (stale = true);
  });

  const assessment = $derived(app.assessment);
  const fired = $derived(assessment?.fired ?? []);
  const top = $derived(fired[0] ?? null);
  const noData = $derived(
    assessment != null && assessment.indicators.every((i) => i.state === 'not_enough_data'),
  );
  const gaugeState = $derived<IndicatorState>(
    noData ? 'not_enough_data' : (assessment?.level ?? 'not_enough_data'),
  );
  const say = $derived(
    noData
      ? 'No data yet. Do the daily check to start.'
      : top
        ? top.action
        : 'No rule fired today. No action needed.',
  );
  const why = $derived.by(() => {
    if (top) {
      const fact = ruleFact(top);
      return fact ? `${ruleTitle(top)}: ${fact}.` : `${ruleTitle(top)}.`;
    }
    return noData ? '' : 'Each rule is under its limit and you are close to your pre-flight baseline.';
  });
  const missing = $derived(
    noData
      ? []
      : (assessment?.indicators ?? [])
          .filter((i) => i.state === 'not_enough_data')
          .map((i) => INDICATOR_INFO[i.indicator].label.toLowerCase()),
  );
  const shown = $derived(showAll ? fired : fired.slice(0, 3));
  const flaggedRegions = $derived(
    (assessment?.regions ?? []).filter((r) => FLAGGED.includes(r.level)),
  );

  // Tasks of today.
  interface Task {
    key: string;
    icon: IconName;
    status: 'done' | 'due' | 'optional';
    title: string;
    sub: string;
    label: string;
    go: () => void;
  }
  const lastVision = $derived.by(() => {
    const pts = seriesMap.acuity_right?.points ?? [];
    for (let k = pts.length - 1; k >= 0; k--) if (pts[k].value != null) return pts[k];
    return null;
  });
  const tasks = $derived.by<Task[]>(() => {
    const day = app.day;
    if (!day) return [];
    const due = (kind: string) => day.mission.due.some((t) => t.kind === kind);
    const checkDone = day.check.answers != null;
    const visionDue = due('vision_test');
    const pvt = day.pvt;
    return [
      {
        key: 'check',
        icon: 'check',
        status: checkDone ? 'done' : 'due',
        title: 'Daily check',
        sub: checkDone ? 'Done for today. A new save replaces it.' : 'Due. About 2 minutes.',
        label: checkDone ? 'Edit' : 'Start',
        go: () => navigate('daily_check'),
      },
      {
        key: 'pvt',
        icon: 'bolt',
        status: pvt ? 'done' : 'optional',
        title: 'PVT-B reaction test',
        sub: pvt
          ? `Done: mean ${pvt.mean_rt_ms ?? 'no'} ms, ${pvt.lapses} ${pvt.lapses === 1 ? 'lapse' : 'lapses'}.`
          : 'Optional, 3 minutes.',
        label: pvt ? 'Repeat' : 'Start',
        go: () => navigate('pvt'),
      },
      {
        key: 'vision',
        icon: 'eye',
        status: visionDue ? 'due' : 'done',
        title: 'Vision test',
        sub: visionDue
          ? lastVision
            ? `Due: the last test was on day ${lastVision.mission_day}.`
            : 'No test yet. Due now.'
          : lastVision
            ? `Last test on day ${lastVision.mission_day}. Next on day ${lastVision.mission_day + 7}.`
            : 'Not due today.',
        label: visionDue ? 'Start' : 'Open',
        go: () => navigate('vision'),
      },
    ];
  });
  const left = $derived(tasks.filter((t) => t.status === 'due').length);

  function lastValue(id: Indicator) {
    const pts = seriesMap[id]?.points ?? [];
    for (let k = pts.length - 1; k >= 0; k--) if (pts[k].value != null) return pts[k];
    return null;
  }
  function lastDays(id: Indicator): (number | null)[] {
    const s = seriesMap[id];
    const today = app.day?.mission.today;
    if (!s || !today) return [];
    const byDate = new Map(s.points.map((p) => [p.date, p.value]));
    return Array.from({ length: BAR_DAYS }, (_, k) => byDate.get(addDays(today, k - BAR_DAYS + 1)) ?? null);
  }
  const stateOf = (id: Indicator): IndicatorState =>
    assessment?.indicators.find((i) => i.indicator === id)?.state ?? 'not_enough_data';
  const fmt = (v: number, d: number) =>
    v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

  // Mission strip geometry.
  const STRIP_W = 600;
  const CELL = STRIP_W / (MISSION_DAYS + 1);
</script>

{#if app.day}
  {@const mission = app.day.mission}
  <div class="stack">
    <div class="grid g-7-5 g-stretch">
      <section class="card" data-lv={gaugeState} aria-labelledby="h-lv">
        <header>
          <div class="ttl">
            <span class="ic lvic"><LevelIcon state={gaugeState} size={11} /></span>
            <h2 id="h-lv">Today's level</h2>
          </div>
          <span class="eyebrow">
            {fired.length ? `${fired.length} ${fired.length > 1 ? 'rules' : 'rule'} fired` : 'No rule fired'}
          </span>
        </header>
        {#if assessment}
          <div class="lvcard">
            <div>
              {#key say}
                <p class="say rise">{say}</p>
              {/key}
              {#if why}<p class="why">{why}</p>{/if}
              {#if assessment.level === 'flight_surgeon'}
                <div class="btns">
                  <button class="btn primary" onclick={() => navigate('export')}>
                    Export the packet
                  </button>
                </div>
              {/if}
            </div>
            <Gauge state={gaugeState} />
          </div>
          {#if missing.length}
            <p class="small muted">
              Not enough data yet for: {missing.join(', ')}. A rule fires only when its window
              has enough days with data.
            </p>
          {/if}
        {:else if app.loading}
          <p class="muted" role="status">Loading...</p>
        {:else}
          <p class="muted">The assessment is not available.</p>
        {/if}
        <div class="strip-wrap">
          <div class="ch">
            <span class="eyebrow">Mission so far, one cell for each day</span>
            <span class="eyebrow num">day {mission.mission_day}/{MISSION_DAYS}</span>
          </div>
          <svg
            class="strip"
            viewBox="0 0 {STRIP_W} 36"
            role="img"
            aria-label="Day level for each mission day up to today"
          >
            {#each Array.from({ length: MISSION_DAYS + 1 }, (_, d) => d) as d (d)}
              {@const lv = strip[d] ?? null}
              <rect
                x={d * CELL}
                y="0"
                width={Math.max(1, CELL - 1)}
                height="16"
                rx={Math.min(2, CELL / 3)}
                data-lv={lv ?? undefined}
                class:on={lv != null}
                fill={lv ? 'var(--lc)' : 'var(--well-2)'}
                opacity={lv === 'ok' ? 0.42 : 1}
                style:--i={d}
              />
            {/each}
            {#each [0, 30, 60, 90, 120] as t (t)}
              <text
                x={t === MISSION_DAYS ? STRIP_W : t * CELL}
                y="32"
                text-anchor={t === 0 ? 'start' : t === MISSION_DAYS ? 'end' : 'middle'}>{t}</text
              >
            {/each}
          </svg>
        </div>
      </section>

      <section class="card" aria-labelledby="h-tk">
        <header>
          <h2 id="h-tk">Due today</h2>
          <span class="eyebrow">{left ? `${left} to do` : 'All done'}</span>
        </header>
        <ul class="tasks">
          {#each tasks as t, k (t.key)}
            <li class="task rise" style:--i={k}>
              <span
                class="ic"
                class:st-done={t.status === 'done'}
                class:st-due={t.status === 'due'}
                class:st-opt={t.status === 'optional'}
              >
                <Icon name={t.icon} size={17} />
              </span>
              <span><b>{t.title}</b><span class="sub">{t.sub}</span></span>
              <button class="btn sm" class:primary={t.status === 'due'} onclick={t.go}>
                {t.label}
              </button>
            </li>
          {/each}
        </ul>
        <div class="streak">
          <span class="big"><Ticker value={mission.streak} /></span>
          <span class="small muted">
            {mission.streak === 1 ? 'day' : 'days'} in a row with a completed daily check
          </span>
        </div>
      </section>
    </div>

    <div class="vitals">
      {#each VITALS as v, k (v.id)}
        {@const st = stateOf(v.id)}
        {@const lv = lastValue(v.id)}
        {@const base = seriesMap[v.id]?.baseline ?? null}
        <button
          class="card vt lift rise"
          data-lv={st}
          style:--i={k}
          onclick={() => navigate('trends', { indicator: v.id })}
          aria-label="{v.name}: open the trend"
        >
          <span class="vh">
            <span>{v.name}</span>
            {#if FLAGGED.includes(st)}
              <LevelBadge state={st} />
            {:else}
              <span class="scale">Last {BAR_DAYS} days</span>
            {/if}
          </span>
          <span class="vb">
            <span>
              <span class="big">
                {#if lv?.value != null}
                  <Ticker value={lv.value} decimals={v.decimals} /><small>{v.unit}</small>
                {:else}
                  <small class="nodata">no data</small>
                {/if}
              </span>
              <span class="vs">
                {lv ? `Day ${lv.mission_day}` : 'No value yet'}{base
                  ? `, baseline ${fmt(base.median, v.decimals)} ${v.unit}`
                  : ''}
              </span>
            </span>
            {#if seriesMap[v.id]}
              <MiniBars
                values={lastDays(v.id)}
                baseline={base?.median ?? null}
                state={st}
                label="{v.name}, last {BAR_DAYS} days"
              />
            {/if}
          </span>
        </button>
      {/each}
    </div>

    <div class="grid g-7-5">
      <section class="card" aria-labelledby="h-fr">
        <header>
          <h2 id="h-fr">What fired today</h2>
          <span class="eyebrow">{fired.length} {fired.length === 1 ? 'rule' : 'rules'}</span>
        </header>
        {#if fired.length}
          <div class="inslist">
            {#each shown as rule, k (rule.rule_id + JSON.stringify(rule.subject))}
              {@const subject = rule.subject}
              <FiredRuleCard {rule} index={k % 3}>
                {#if subject.type === 'indicator'}
                  <button
                    class="btn sm"
                    onclick={() => navigate('trends', { indicator: subject.value })}
                  >
                    Show the trend
                  </button>
                {/if}
              </FiredRuleCard>
            {/each}
          </div>
          {#if fired.length > 3}
            <div class="btns">
              <button class="btn sm" onclick={() => (showAll = !showAll)}>
                {showAll ? 'Show fewer' : `Show the other ${fired.length - 3}`}
              </button>
            </div>
          {/if}
        {:else}
          <p class="muted">
            No rule fired. Each rule compares your last days with a limit or with your own
            pre-flight baseline.
          </p>
        {/if}
      </section>

      <section class="card" aria-labelledby="h-bd">
        <header>
          <h2 id="h-bd">Body</h2>
          <button class="btn sm" onclick={() => navigate('body')}>Open</button>
        </header>
        <BodyMini
          levels={Object.fromEntries((assessment?.regions ?? []).map((r) => [r.region, r.level]))}
        >
          <div class="bm-list">
            {#each flaggedRegions as r, k (r.region)}
              <button
                class="bm-row rise"
                style:--i={k}
                onclick={() => navigate('body', { region: r.region })}
              >
                <span>{REGION_LABEL[r.region]}</span>
                <LevelBadge state={r.level} />
              </button>
            {/each}
            {#if assessment}
              <div class="bm-count">
                <div class="big">
                  <Ticker value={assessment.regions.length - flaggedRegions.length} /><small
                    >of {assessment.regions.length}</small
                  >
                </div>
                <div class="small muted">regions with no flag</div>
              </div>
            {/if}
          </div>
        </BodyMini>
      </section>
    </div>
  </div>
{:else if app.loading}
  <p class="muted" role="status">Loading...</p>
{:else}
  <div class="card">
    <p class="muted">The data of today is not available.</p>
    <div class="btns"><button class="btn" onclick={refresh}>Try again</button></div>
  </div>
{/if}

<style>
  .lvcard {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 20px 28px;
    align-items: center;
  }
  .say {
    font-size: clamp(23px, 2.2vw, 30px);
    font-weight: 500;
    letter-spacing: -0.032em;
    line-height: 1.18;
    text-wrap: balance;
    max-width: 24ch;
  }
  .why {
    color: var(--muted);
    font-size: 14px;
    margin-top: 12px;
    max-width: 56ch;
  }
  .lvcard .btns {
    margin-top: 16px;
  }
  @media (max-width: 560px) {
    .lvcard {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  .strip-wrap {
    margin-top: auto;
  }
  .strip-wrap .ch {
    margin-bottom: 10px;
  }
  .strip {
    display: block;
    width: 100%;
    height: auto;
  }
  .strip text {
    font-family: var(--font-body);
    font-size: 10.5px;
    fill: var(--faint);
  }
  .strip rect.on {
    animation: fade-in 260ms var(--ease-out) both;
    animation-delay: calc(var(--i) * 5ms);
  }

  .tasks {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .task {
    display: grid;
    grid-template-columns: 34px minmax(0, 1fr) auto;
    align-items: center;
    gap: 2px 14px;
    padding: 12px 12px 12px 14px;
    border-radius: 18px;
    background: var(--well);
    box-shadow: inset 0 0 0 1px var(--line);
  }
  .task b {
    display: block;
    font-weight: 500;
  }
  .task .sub {
    display: block;
    font-size: 12.5px;
    color: var(--muted);
  }
  .streak {
    display: flex;
    align-items: baseline;
    gap: 12px;
    margin-top: auto;
  }
  .streak .big {
    font-size: 40px;
  }

  .vitals {
    display: grid;
    gap: 16px;
    grid-template-columns: minmax(0, 1fr);
  }
  @media (min-width: 640px) {
    .vitals {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  .vt {
    border: 0;
    text-align: left;
    color: inherit;
    font: inherit;
    cursor: pointer;
    gap: 22px;
    padding: 20px 22px 22px;
  }
  .vt:active {
    transform: scale(0.99);
  }
  .vh {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    min-height: 28px;
  }
  .vh > span:first-child {
    font-size: 15px;
  }
  .scale {
    font-size: 13px;
    color: var(--muted);
  }
  .vb {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr);
    align-items: end;
    gap: 14px;
  }
  .vb .big {
    display: block;
  }
  .nodata {
    margin: 0 !important;
  }
  .vs {
    display: block;
    font-size: 12.5px;
    color: var(--muted);
    margin-top: 8px;
  }

  .inslist {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .bm-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .bm-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    padding: 10px 12px;
    border: 0;
    border-radius: 14px;
    background: var(--well);
    box-shadow: inset 0 0 0 1px var(--line);
    color: var(--fg);
    font-weight: 500;
    text-align: left;
    cursor: pointer;
    transition:
      background-color var(--t-fast),
      transform var(--t-fast) var(--ease-out);
  }
  .bm-row:hover {
    background: var(--well-2);
  }
  .bm-row:active {
    transform: scale(0.97);
  }
  .bm-count {
    padding: 6px 2px 0;
  }
  .bm-count .big {
    font-size: 36px;
  }
  .bm-count .small {
    margin-top: 6px;
  }
</style>
