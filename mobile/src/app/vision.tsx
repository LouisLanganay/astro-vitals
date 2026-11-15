import { useApp } from '../lib/state';
import { Card, Icon, Row, Screen, T } from '../ui/kit';
import { C } from '../ui/theme';

export default function Vision() {
  const app = useApp();
  const due = app.day?.mission.due.some((t) => t.kind === 'vision_test') ?? false;
  return (
    <Screen back title="Vision test" eyebrow="Each 7 days · each eye">
      <Card>
        <Row gap={8}>
          <Icon name="calendar" size={16} color={due ? C.fg : C.muted} />
          <T v="h2">{due ? 'Due' : 'Not due'}</T>
        </Row>
        <T v="small" color={C.muted}>
          Not in the mobile app yet. Trends and Body show the stored results, for example from a demo scenario.
        </T>
      </Card>
    </Screen>
  );
}
