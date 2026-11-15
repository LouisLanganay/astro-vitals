import { router, type Href } from 'expo-router';
import { Pressable, View } from 'react-native';

import type { IconName } from '../../lib/icons';
import { useApp } from '../../lib/state';
import { Card, Disclaimer, Icon, IconBox, Screen, T } from '../../ui/kit';
import { C, F } from '../../ui/theme';

const ITEMS: { href: Href; icon: IconName; title: string }[] = [
  { href: '/pvt', icon: 'bolt', title: 'PVT-B reaction test' },
  { href: '/vision', icon: 'eye', title: 'Vision test' },
  { href: '/export', icon: 'export', title: 'Export packet' },
  { href: '/settings', icon: 'settings', title: 'Settings' },
];

export default function More() {
  const app = useApp();
  return (
    <Screen title="More">
      <Card style={{ gap: 4, paddingVertical: 8 }}>
        {ITEMS.map((it, k) => (
          <Pressable
            key={it.title}
            onPress={() => router.push(it.href)}
            accessibilityRole="button"
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
              paddingVertical: 14,
              borderTopWidth: k ? 1 : 0,
              borderTopColor: C.line,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <IconBox>
              <Icon name={it.icon} size={17} />
            </IconBox>
            <View style={{ flex: 1 }}>
              <T style={{ fontFamily: F.medium }}>{it.title}</T>
            </View>
            <Icon name="chevron" size={16} color={C.muted} />
          </Pressable>
        ))}
      </Card>
      <T v="small" color={C.muted} style={{ textAlign: 'center' }}>
        All data stays on this device. {app.day ? `Today: ${app.day.mission.today}.` : ''}
      </T>
      <Disclaimer />
    </Screen>
  );
}
