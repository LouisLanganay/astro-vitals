import { router, type Href } from 'expo-router';
import { Pressable, View } from 'react-native';

import type { IconName } from '../../lib/icons';
import { Card, Icon, IconBox, Row, Screen, T } from '../../ui/kit';
import { C, F } from '../../ui/theme';

const ITEMS: { href: Href; icon: IconName; title: string; sub: string }[] = [
  { href: '/pvt', icon: 'bolt', title: 'PVT-B', sub: 'Reaction test · 3 min' },
  { href: '/vision', icon: 'eye', title: 'Vision test', sub: 'Each 7 days' },
  { href: '/export', icon: 'export', title: 'Export packet', sub: 'For the flight surgeon' },
  { href: '/settings', icon: 'settings', title: 'Settings', sub: 'Scenarios · rules' },
];

export default function More() {
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
              <T v="small" color={C.muted}>
                {it.sub}
              </T>
            </View>
            <Icon name="chevron" size={16} color={C.muted} />
          </Pressable>
        ))}
      </Card>
      <Row gap={6} style={{ justifyContent: 'center' }}>
        <Icon name="lock" size={13} color={C.muted} />
        <T v="small" color={C.muted}>
          Data stays on this device
        </T>
      </Row>
    </Screen>
  );
}
