import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SvgXml } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ICON, LEVEL_ICON, type IconName } from '../lib/icons';
import { STATE_LABEL } from '../lib/labels';
import type { IndicatorState } from '../lib/types';
import { alpha, C, F, LEVEL_COLOR, R } from './theme';

type TProps = TextProps & {
  v?: 'body' | 'small' | 'label' | 'h1' | 'h2' | 'h3' | 'big' | 'mono';
  color?: string;
  style?: StyleProp<TextStyle>;
};

export function T({ v = 'body', color, style, ...rest }: TProps) {
  return <Text {...rest} style={[s.t, s[v], color ? { color } : null, style]} />;
}

export function Icon({ name, size = 18, color = C.fg, width = 1.7 }: { name: IconName; size?: number; color?: string; width?: number }) {
  const xml = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round">${ICON[name]}</svg>`;
  return <SvgXml xml={xml} width={size} height={size} />;
}

export function LevelIcon({ state, size = 9 }: { state: IndicatorState; size?: number }) {
  const color = LEVEL_COLOR[state];
  const shape = LEVEL_ICON[state].replace('currentColor', color);
  const xml = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" fill="${color}">${shape}</svg>`;
  return <SvgXml xml={xml} width={size} height={size} />;
}

export function LevelBadge({ state, large = false, text }: { state: IndicatorState; large?: boolean; text?: string }) {
  const color = LEVEL_COLOR[state];
  return (
    <View
      style={[s.chip, large && s.chipLg, { backgroundColor: alpha(color, 0.13), borderColor: alpha(color, 0.18) }]}
      accessibilityLabel={`Level: ${STATE_LABEL[state]}`}
    >
      <LevelIcon state={state} size={large ? 10 : 8} />
      <T v={large ? 'body' : 'small'} color={color} style={s.chipText}>
        {text ? `${text}: ${STATE_LABEL[state]}` : STATE_LABEL[state]}
      </T>
    </View>
  );
}

export function IconBox({ children, color }: { children: ReactNode; color?: string }) {
  return (
    <View style={[s.ic, color ? { backgroundColor: alpha(color, 0.14), borderColor: alpha(color, 0.22) } : null]}>
      {children}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function Well({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.well, style]}>{children}</View>;
}

export function Row({ children, style, gap = 10 }: { children: ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  return <View style={[s.row, { gap }, style]}>{children}</View>;
}

type BtnProps = {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'violet' | 'plain' | 'ghost' | 'danger';
  icon?: IconName;
  disabled?: boolean;
  small?: boolean;
  wide?: boolean;
  a11y?: string;
};

export function Btn({ label, onPress, kind = 'plain', icon, disabled, small, wide, a11y }: BtnProps) {
  const fg = kind === 'primary' ? C.onFg : kind === 'ghost' ? C.muted : kind === 'danger' ? C.red : C.fg;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={a11y ?? label}
      style={({ pressed }) => [
        s.btn,
        small && s.btnSm,
        wide && s.btnWide,
        kind === 'primary' && { backgroundColor: C.fg, borderColor: C.fg },
        kind === 'violet' && { backgroundColor: C.ui, borderColor: C.ui },
        kind === 'ghost' && { backgroundColor: 'transparent', borderColor: 'transparent' },
        kind === 'danger' && { backgroundColor: alpha(C.red, 0.12), borderColor: alpha(C.red, 0.3) },
        disabled && { opacity: 0.4 },
        pressed && { transform: [{ scale: 0.97 }], opacity: 0.85 },
      ]}
    >
      {icon ? <Icon name={icon} size={16} color={fg} /> : null}
      <T v={small ? 'small' : 'body'} color={fg} style={{ fontFamily: F.medium }}>
        {label}
      </T>
    </Pressable>
  );
}

export function Seg<K extends string>({ items, value, onChange }: { items: { key: K; label: string }[]; value: K; onChange: (k: K) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.seg}>
      {items.map((it) => {
        const on = it.key === value;
        return (
          <Pressable
            key={it.key}
            onPress={() => onChange(it.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={[s.segItem, on && s.segOn]}
          >
            <T v="small" color={on ? C.fg : C.muted} style={{ fontFamily: F.medium }}>
              {it.label}
            </T>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function Screen({ children, title, eyebrow }: { children: ReactNode; title?: string; eyebrow?: string }) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={{ paddingTop: insets.top + 14, paddingHorizontal: 16, paddingBottom: 32, gap: 14 }}
      keyboardShouldPersistTaps="handled"
    >
      {title ? (
        <View style={{ gap: 4, marginBottom: 4 }}>
          {eyebrow ? <T v="label">{eyebrow}</T> : null}
          <T v="h1">{title}</T>
        </View>
      ) : null}
      {children}
    </ScrollView>
  );
}

export function Loading() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg, gap: 12 }}>
      <ActivityIndicator color={C.ui} />
      <T v="small" color={C.muted}>
        Loading...
      </T>
    </View>
  );
}

export function Banner({ text, tone = 'info', onClose }: { text: string; tone?: 'info' | 'warn' | 'error'; onClose?: () => void }) {
  const color = tone === 'error' ? C.red : tone === 'warn' ? C.orange : C.ui;
  return (
    <View style={[s.banner, { backgroundColor: alpha(color, 0.1), borderColor: alpha(color, 0.3) }]} accessibilityRole="alert">
      <Icon name="info" size={16} color={color} />
      <T v="small" style={{ flex: 1 }}>
        {text}
      </T>
      {onClose ? (
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Dismiss" hitSlop={10}>
          <Icon name="close" size={16} color={C.muted} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function Disclaimer() {
  return (
    <T v="small" color={C.faint} style={{ textAlign: 'center', marginTop: 8 }}>
      Prototype, not a medical device.
    </T>
  );
}

export const s = StyleSheet.create({
  t: { color: C.fg, fontFamily: F.body, fontSize: 15, lineHeight: 21 },
  body: {},
  small: { fontSize: 13, lineHeight: 18 },
  label: { fontSize: 13, lineHeight: 18, color: C.muted },
  h1: { fontSize: 30, lineHeight: 34, fontFamily: F.medium, letterSpacing: -1 },
  h2: { fontSize: 17, lineHeight: 22, fontFamily: F.medium, letterSpacing: -0.2 },
  h3: { fontSize: 15, lineHeight: 20, fontFamily: F.medium },
  big: { fontSize: 42, lineHeight: 46, fontFamily: F.medium, letterSpacing: -2 },
  mono: { fontFamily: F.mono, fontSize: 13 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 9,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  chipLg: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 12, gap: 8 },
  chipText: { fontFamily: F.medium },
  ic: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.raiseB,
    borderWidth: 1,
    borderColor: C.line2,
  },
  card: {
    backgroundColor: C.card,
    borderRadius: R,
    borderWidth: 1,
    borderColor: C.cardEdge,
    padding: 18,
    gap: 16,
  },
  well: { backgroundColor: C.well, borderRadius: 18, borderWidth: 1, borderColor: C.line, padding: 14, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  btn: {
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.raiseB,
    borderWidth: 1,
    borderColor: C.line2,
  },
  btnSm: { minHeight: 38, paddingHorizontal: 14 },
  btnWide: { alignSelf: 'stretch' },
  seg: { flexDirection: 'row', gap: 2, padding: 3, borderRadius: 14, backgroundColor: C.well, borderWidth: 1, borderColor: C.line },
  segItem: { paddingHorizontal: 14, minHeight: 40, justifyContent: 'center', borderRadius: 11 },
  segOn: { backgroundColor: C.raiseB, borderWidth: 1, borderColor: C.line2 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, borderWidth: 1 },
});
