<script lang="ts">
  import FiredRuleCard from '../../lib/FiredRuleCard.svelte';
  import { missionDayLabel } from '../../lib/format';
  import { TASK_LABEL } from '../../lib/labels';
  import LevelBadge from '../../lib/LevelBadge.svelte';
  import { app, navigate, refresh, type Screen } from '../../lib/state.svelte';
  import { LEVELS, type Level, type TaskKind } from '../../lib/types';

  const TASK_SCREEN: Record<TaskKind, Screen> = {
    daily_check: 'daily_check',
    pvt: 'pvt',
    vision_test: 'vision',
  };

  const LEVEL_HELP: Record<Level, string> = {
    ok: 'No action is necessary.',
    self_care: 'Do the actions below. You can do them alone.',
    tell_cmo: 'Tell the Crew Medical Officer today.',
    flight_surgeon: 'Export a summary packet for the flight surgeon on Earth.',
  };

  const fired = $derived(
    [...(app.assessment?.fired ?? [])].sort(
      (a, b) => LEVELS.indexOf(b.level) - LEVELS.indexOf(a.level),
    ),
  );
</script>

<section>
  {#if app.day}
    {@const mission = app.day.mission}
    <header>
      <h1>{missionDayLabel(mission.mission_day)}</h1>
      <p class="muted">Date: {mission.today}</p>
    </header>

    <div class="card level">
      <h2>Level of today</h2>
      {#if app.assessment}
        <div class="row">
          <LevelBadge state={app.assessment.level} />
          <span>{LEVEL_HELP[app.assessment.level]}</span>
        </div>
        {#if app.assessment.level === 'flight_surgeon'}
          <div>
            <button class="btn primary" onclick={() => navigate('export')}>
              Open the packet export
            </button>
          </div>
        {/if}
      {:else if app.loading}
        <p class="muted" role="status">Loading...</p>
      {:else}
        <p class="muted">The assessment is not available.</p>
      {/if}
    </div>

    <div class="card tasks">
      <h2>Tasks that are due</h2>
      {#if mission.due.length === 0}
        <p class="muted">No task is due.</p>
      {:else}
        <ul>
          {#each mission.due as task (task.kind)}
            <li class="row">
              <span>{TASK_LABEL[task.kind]}{task.optional ? ' (optional)' : ''}</span>
              <button class="btn" onclick={() => navigate(TASK_SCREEN[task.kind])}>Start</button>
            </li>
          {/each}
        </ul>
      {/if}
      <p>
        Streak: <strong>{mission.streak}</strong>
        {mission.streak === 1 ? 'day' : 'consecutive days'} with a completed daily check.
      </p>
    </div>

    {#if app.assessment}
      <h2>Rules that fired</h2>
      {#if fired.length === 0}
        <p class="muted">No rule fired.</p>
      {/if}
      {#each fired as rule}
        {@const subject = rule.subject}
        <div class="fired">
          <FiredRuleCard {rule} />
          {#if subject.type === 'indicator'}
            <button
              class="btn"
              onclick={() => navigate('trends', { indicator: subject.value })}
            >
              Show the trend
            </button>
          {/if}
        </div>
      {/each}
    {/if}
  {:else if app.loading}
    <h1>Home</h1>
    <p class="muted" role="status">Loading...</p>
  {:else}
    <h1>Home</h1>
    <p class="muted">The data of today is not available.</p>
    <div>
      <button class="btn" onclick={refresh}>Try again</button>
    </div>
  {/if}
</section>

<style>
  .level,
  .tasks,
  .fired {
    display: grid;
    gap: 0.6rem;
    justify-items: start;
  }
  .fired :global(.rule) {
    width: 100%;
  }
  ul {
    display: grid;
    gap: 0.4rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }
</style>
