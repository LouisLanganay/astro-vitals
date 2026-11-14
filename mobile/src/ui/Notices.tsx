import { dismissNotice, useApp } from '../lib/state';
import { Banner } from './kit';

export function Notices() {
  const app = useApp();
  const notices = app.day?.mission.notices ?? [];
  return (
    <>
      {!app.noticeDismissed
        ? notices.map((n) => (
            <Banner
              key={n.backup_path}
              tone="warn"
              text={`The stored data was not readable. The app keeps a copy at ${n.backup_path} and starts with empty data.`}
              onClose={dismissNotice}
            />
          ))
        : null}
      {app.assessment && !app.assessment.drift_enabled ? (
        <Banner
          tone="info"
          text={`Drift rules are off: ${app.assessment.preflight_days} of 7 pre-flight days have a complete check. Absolute rules stay on.`}
        />
      ) : null}
      {app.error ? <Banner tone="error" text={app.error} /> : null}
    </>
  );
}
