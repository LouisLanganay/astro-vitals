import { useApp } from '../lib/state';
import { Card, Disclaimer, Screen, T } from '../ui/kit';
import { C } from '../ui/theme';

export default function Vision() {
  const app = useApp();
  const due = app.day?.mission.due.some((t) => t.kind === 'vision_test') ?? false;
  return (
    <Screen back title="Vision test" eyebrow="One time each 7 days, each eye.">
      <Card>
        <T v="h2">{due ? 'The vision test is due' : 'The vision test is not due'}</T>
        <T v="small" color={C.muted}>
          The mobile app does not have the vision test yet. The vision rules use the vision results that are stored on this device, for example the results of a demo scenario. Trends and the body figure show them.
        </T>
      </Card>
      <Disclaimer />
    </Screen>
  );
}
