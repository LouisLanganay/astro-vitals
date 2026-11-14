import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Icon, T } from './kit';
import { C, F } from './theme';

export function Back({ label = 'Back' }: { label?: string }) {
  return (
    <Pressable
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/more'))}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={12}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingVertical: 4 }}
    >
      <View style={{ transform: [{ rotate: '180deg' }] }}>
        <Icon name="chevron" size={16} color={C.muted} />
      </View>
      <T v="small" color={C.muted} style={{ fontFamily: F.medium }}>
        {label}
      </T>
    </Pressable>
  );
}
