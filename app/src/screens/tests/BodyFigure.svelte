<script lang="ts">
  import { tick } from 'svelte';

  import { getDay, saveDailyCheck } from '../../lib/api';
  import { errorText, toAppError } from '../../lib/errors';
  import FiredRuleCard from '../../lib/FiredRuleCard.svelte';
  import { missionDayLabel } from '../../lib/format';
  import { INDICATOR_INFO, REGION_LABEL, STATE_LABEL, SYMPTOM_LABEL } from '../../lib/labels';
  import LevelBadge from '../../lib/LevelBadge.svelte';
  import LevelIcon from '../../lib/LevelIcon.svelte';
  import { addDays } from '../../lib/mission';
  import { app, navigate, refresh } from '../../lib/state.svelte';
  import {
    LEVELS,
    SEVERITY_MAX,
    SEVERITY_MIN,
    SYMPTOM_KINDS,
    type AppError,
    type BodyRegion,
    type Level,
    type Symptom,
    type SymptomKind,
  } from '../../lib/types';
  import DotFigure from './DotFigure.svelte';

  const FLAGGED: Level[] = ['self_care', 'tell_cmo', 'flight_surgeon'];
  const HISTORY_DAYS = 14;
  const SEVERITY_LABEL = ['Mild', 'Moderate', 'Severe'];
  const SEVERITIES = Array.from(
    { length: SEVERITY_MAX - SEVERITY_MIN + 1 },
    (_, i) => SEVERITY_MIN + i,
  );

  let kind = $state<SymptomKind>(SYMPTOM_KINDS[0]);
  let severity = $state(SEVERITY_MIN);
  let treated = $state(false);
  let improved = $state<boolean | null>(null);
  let saving = $state(false);
  let error = $state<AppError | null>(null);
  let notice = $state('');
  let hover = $state<BodyRegion | null>(null);
  let history = $state.raw<{ day: number; today: boolean; symptom: Symptom }[] | null>(null);

  const regions = $derived(app.assessment?.regions ?? []);
  const selected = $derived(regions.find((r) => r.region === app.route.region) ?? null);
  const levels = $derived(Object.fromEntries(regions.map((r) => [r.region, r.level])));
  const flagged = $derived(regions.filter((r) => FLAGGED.includes(r.level)).length);
  const regionSymptoms = $derived(
    selected
      ? (history ?? selected.symptoms.map((symptom) => ({ day: app.assessment!.mission_day, today: true, symptom })))
          .filter((h) => h.symptom.region === selected.region)
      : [],
  );

  $effect(() => {
    void app.revision;
    const today = app.day?.mission.today;
    if (!today) return;
    let stale = false;
    const dates = Array.from({ length: HISTORY_DAYS }, (_, k) => addDays(today, -k));
    Promise.all(dates.map((d) => getDay(d).catch(() => null))).then((days) => {
      if (stale) return;
      history = days.flatMap((d) =>
        d
          ? d.check.symptoms.map((symptom) => ({
              day: d.mission_day,
              today: d.date === today,
              symptom,
            }))
          : [],
      );
    });
    return () => (stale = true);
  });

  const severityText = (value: number) => SEVERITY_LABEL[value - SEVERITY_MIN] ?? String(value);

  const number = (value: number | null) =>
    value === null ? 'no data' : String(Math.round(value * 100) / 100);

  function treatmentText(s: Symptom): string {
    if (!s.treated) return 'not treated';
    if (s.improved === null) return 'treated';
    return s.improved ? 'treated and improved' : 'treated and not improved';
  }

  function select(region: BodyRegion | null) {
    error = null;
    notice = '';
    navigate('body', { region });
    if (region) {
      tick().then(() => {
        const head = document.getElementById('b-p');
        const top = head?.getBoundingClientRect().top ?? 0;
        if (head && (top < 0 || top > innerHeight * 0.7)) {
          const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
          head.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
        }
      });
    }
  }

  async function logSymptom(e: SubmitEvent) {
    e.preventDefault();
    if (!selected) return;
    const symptom: Symptom = {
      kind,
      severity,
      region: selected.region,
      treated,
      improved: treated ? improved : null,
    };
    saving = true;
    error = null;
    notice = '';
    try {
      const d = await getDay();
      await saveDailyCheck({ ...d.check, symptoms: [...d.check.symptoms, symptom] });
      await refresh();
      notice = `${SYMPTOM_LABEL[symptom.kind]} is saved for today. The level is evaluated again.`;
    } catch (err) {
      error = toAppError(err);
    } finally {
      saving = false;
    }
  }
</script>

{#if !app.assessment}
  <p class="muted" role="status">
    {app.loading ? 'Loading...' : 'The assessment of today is not available.'}
  </p>
{:else}
  <div class="grid g-7-5">
    <section class="card figcard" aria-labelledby="b-f">
      <header>
        <h2 id="b-f">Front and back</h2>
        <span class="eyebrow">Only a flagged region takes a colour</span>
      </header>
      <DotFigure
        {levels}
        selected={selected?.region ?? null}
        highlight={hover}
        onpick={(z) => select(z)}
      />
      <div class="foot">
        <p class="small muted">
          Data of {missionDayLabel(app.assessment.mission_day).toLowerCase()}. The Tab key moves
          between regions.
        </p>
        <ul class="legend" aria-label="Levels">
          {#each LEVELS as level (level)}
            <li data-lv={level}><LevelIcon state={level} size={8} />{STATE_LABEL[level]}</li>
          {/each}
        </ul>
      </div>
    </section>

    <section class="card" aria-labelledby="b-p">
      {#if selected}
        {#key selected.region}
          <div class="panel">
            <header class="ch">
              <h2 id="b-p">{REGION_LABEL[selected.region]}</h2>
              <button class="btn ghost sm" onclick={() => select(null)}>All regions</button>
            </header>
            <div class="row">
              <LevelBadge state={selected.level} size="lg" />
              <span class="muted small">
                {selected.fired.length
                  ? `${selected.fired.length} ${selected.fired.length > 1 ? 'rules' : 'rule'} fired here today.`
                  : 'No rule fired here today.'}
              </span>
            </div>

            <div class="sect">
              <h3 class="lbl">Rules fired in this region</h3>
              {#each selected.fired as rule, i (i)}
                <FiredRuleCard {rule} index={i} />
              {:else}
                <p class="muted">None today.</p>
              {/each}
            </div>

            <div class="sect">
              <h3 class="lbl">Indicators</h3>
              {#each selected.indicators as s, i (s.indicator)}
                {@const info = INDICATOR_INFO[s.indicator]}
                <div class="kv rise" style:--i={i}>
                  <span class="k">
                    <strong>{info.label}</strong>
                    <span class="small muted">{info.unit}</span>
                  </span>
                  <LevelBadge state={s.state} />
                  <span class="small muted num stats">
                    Today {number(s.value)} · 7-day mean {number(s.mean_7d)} · baseline
                    {number(s.baseline?.median ?? null)}
                  </span>
                  <button
                    class="btn ghost sm"
                    onclick={() => navigate('trends', { indicator: s.indicator })}
                  >
                    Show the trend
                  </button>
                </div>
              {:else}
                <p class="muted">
                  No numeric indicator is tied to this region. Symptoms and red flags still count.
                </p>
              {/each}
            </div>

            <div class="sect">
              <h3 class="lbl">Symptoms, last {HISTORY_DAYS} days</h3>
              {#each regionSymptoms as h, i (i)}
                <div class="kv sym rise" style:--i={i}>
                  <span class="k">
                    <strong>{SYMPTOM_LABEL[h.symptom.kind]}</strong>
                    <span class="small muted">
                      {severityText(h.symptom.severity)}, {treatmentText(h.symptom)}
                    </span>
                  </span>
                  <span class="small muted num">{h.today ? 'today' : `day ${h.day}`}</span>
                </div>
              {:else}
                <p class="muted">No symptom logged in this region.</p>
              {/each}
            </div>

            <form class="well form" onsubmit={logSymptom}>
              <h3>Log a symptom in this region, today</h3>
              <div class="two">
                <label class="field">
                  <span>Symptom</span>
                  <select bind:value={kind}>
                    {#each SYMPTOM_KINDS as k (k)}
                      <option value={k}>{SYMPTOM_LABEL[k]}</option>
                    {/each}
                  </select>
                </label>
                <label class="field">
                  <span>Severity</span>
                  <select bind:value={severity}>
                    {#each SEVERITIES as n (n)}
                      <option value={n}>{n}: {severityText(n)}</option>
                    {/each}
                  </select>
                </label>
              </div>
              <label class="check">
                <input type="checkbox" bind:checked={treated} />
                <span>You treated the symptom</span>
              </label>
              {#if treated}
                <label class="field rise">
                  <span>Result of the treatment</span>
                  <select bind:value={improved}>
                    <option value={null}>Not known</option>
                    <option value={true}>The symptom improved</option>
                    <option value={false}>The symptom did not improve</option>
                  </select>
                </label>
              {/if}
              {#if error}
                <p class="banner error" role="alert">
                  The symptom was not saved. {errorText(error)}
                </p>
              {/if}
              {#if notice}
                <p class="banner info rise" role="status">{notice}</p>
              {/if}
              <div class="btns">
                <button class="btn primary" type="submit" disabled={saving}>
                  {saving ? 'Saving...' : 'Save the symptom'}
                </button>
              </div>
            </form>
          </div>
        {/key}
      {:else}
        <header class="ch">
          <h2 id="b-p">All regions</h2>
          <span class="eyebrow">{flagged ? `${flagged} flagged` : 'No flag'}</span>
        </header>
        <p class="muted">
          Select a region on the figure or in this list. Each region shows its level, its symptoms
          and its indicators, and you can log a symptom there.
        </p>
        <div class="rlist">
          {#each regions as r, i (r.region)}
            <button
              type="button"
              class="rbtn rise"
              style:--i={i}
              data-lv={r.level}
              onclick={() => select(r.region)}
              onmouseenter={() => (hover = r.region)}
              onmouseleave={() => (hover = null)}
              onfocus={() => (hover = r.region)}
              onblur={() => (hover = null)}
            >
              <span>{REGION_LABEL[r.region]}</span>
              {#if FLAGGED.includes(r.level)}
                <LevelBadge state={r.level} />
              {:else}
                <span class="okd">{STATE_LABEL[r.level]}</span>
              {/if}
            </button>
          {/each}
        </div>
      {/if}
    </section>
  </div>
{/if}

<style>
  .foot {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    gap: 10px 16px;
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 14px;
    font-size: 12.5px;
    color: var(--muted);
  }
  .legend li {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .legend li :global(.lvicon) {
    color: var(--lc);
  }

  .panel {
    display: flex;
    flex-direction: column;
    gap: 20px;
    min-width: 0;
    animation: panel-in var(--t-slow) var(--ease-out) backwards;
  }
  .sect {
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 0;
  }
  .sect .lbl {
    margin: 0;
    font-weight: 400;
  }
  .kv {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 6px 12px;
    align-items: center;
    padding: 12px 0 0;
    border-top: 1px solid var(--line);
  }
  .kv:first-of-type {
    border-top: 0;
    padding-top: 0;
  }
  .kv .k {
    display: flex;
    align-items: baseline;
    gap: 8px;
    flex-wrap: wrap;
    min-width: 0;
  }
  .kv strong {
    font-weight: 500;
  }
  .kv .stats {
    font-size: 12px;
  }
  .kv .btn,
  .kv > :global(.chip) {
    justify-self: end;
  }
  @media (min-width: 900px) {
    .figcard {
      position: sticky;
      top: 16px;
    }
  }
  .form {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 18px 18px 20px;
  }
  .two {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }
  .check {
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
  }

  .rlist {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }
  .rbtn {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    min-height: 48px;
    padding: 10px 12px 10px 14px;
    border: 0;
    border-radius: 16px;
    background: var(--well);
    box-shadow: inset 0 0 0 1px var(--line);
    color: var(--fg);
    cursor: pointer;
    text-align: left;
    font-weight: 500;
    transition:
      background-color var(--t-fast) var(--ease-out),
      transform var(--t-fast) var(--ease-out);
  }
  .rbtn:hover {
    background: var(--well-2);
  }
  .rbtn:active {
    transform: scale(0.97);
  }
  .okd {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12.5px;
    font-weight: 400;
    color: var(--lc);
  }
  .okd::before {
    content: '';
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--lc);
  }
  @media (max-width: 420px) {
    .rlist,
    .two {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  @keyframes panel-in {
    from {
      opacity: 0;
      transform: translateX(10px);
    }
  }
</style>
