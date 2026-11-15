import { Tabs } from 'expo-router';

import type { IconName } from '../../lib/icons';
import { Icon } from '../../ui/kit';
import { C, F } from '../../ui/theme';

const TABS: { name: string; title: string; icon: IconName }[] = [
  { name: 'index', title: 'Today', icon: 'home' },
  { name: 'check', title: 'Check', icon: 'check' },
  { name: 'body', title: 'Body', icon: 'body' },
  { name: 'trends', title: 'Trends', icon: 'trends' },
  { name: 'more', title: 'More', icon: 'more' },
];

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: C.bg },
        tabBarActiveTintColor: C.fg,
        tabBarInactiveTintColor: C.faint,
        tabBarStyle: { backgroundColor: '#0a0a0c', borderTopColor: C.line },
        tabBarLabelStyle: { fontFamily: F.medium, fontSize: 11 },
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarIcon: ({ color }) => <Icon name={t.icon} size={22} color={String(color)} />,
          }}
        />
      ))}
    </Tabs>
  );
}
