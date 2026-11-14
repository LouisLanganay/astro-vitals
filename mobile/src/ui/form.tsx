import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import type { IconName } from '../lib/icons';
import { Icon, IconBox, Row, T } from './kit';
import { alpha, C, F } from './theme';

export function Field({ label, help, error, icon, children, right }: { label: string; help?: string; error?: string | null; icon?: IconName; children: ReactNode; right?: ReactNode }) {
  return (
    <View style={{ gap: 10 }}>
      <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
        <Row gap={10} style={{ flex: 1, flexWrap: 'nowrap' }}>
          {icon ? (
            <IconBox>
              <Icon name={icon} size={16} />
            </IconBox>
          ) : null}
          <View style={{ flex: 1 }}>
            <T style={{ fontFamily: F.medium }}>{label}</T>
            {help ? (
              <T v="small" color={C.muted}>
                {help}
              </T>
            ) : null}
          </View>
        </Row>
        {right}
      </Row>
      {children}
      {error ? (
        <T v="small" color={C.red} accessibilityRole="alert">
          {error}
        </T>
      ) : null}
    </View>
  );
}

export function Scale({ value, onChange, label, max = 10 }: { value: number; onChange: (v: number) => void; label: string; max?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 4 }} accessibilityRole="adjustable" accessibilityLabel={`${label}: ${value} of ${max}`}>
      {Array.from({ length: max + 1 }, (_, k) => {
        const on = k === value;
        const below = k < value;
        return (
          <Pressable
            key={k}
            onPress={() => onChange(k)}
            accessibilityRole="button"
            accessibilityLabel={`${label} ${k}`}
            accessibilityState={{ selected: on }}
            hitSlop={{ top: 8, bottom: 8 }}
            style={{
              flex: 1,
              height: 40,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: on ? C.ui : below ? alpha(C.ui, 0.22) : C.well2,
              borderWidth: 1,
              borderColor: on ? C.ui : C.line,
            }}
          >
            <T v="small" color={on ? '#fff' : below ? C.fg : C.muted} style={{ fontFamily: F.mono, fontSize: 12 }}>
              {k}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

function RoundBtn({ label, onPress, a11y }: { label: string; onPress: () => void; a11y: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      style={({ pressed }) => ({
        minWidth: 48,
        height: 44,
        paddingHorizontal: 10,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? C.raiseA : C.raiseB,
        borderWidth: 1,
        borderColor: C.line2,
      })}
    >
      <T style={{ fontFamily: F.monoMedium }}>{label}</T>
    </Pressable>
  );
}

export function Stepper({ value, text, steps, onChange, label }: { value: number; text: string; steps: number[]; onChange: (v: number) => void; label: string }) {
  const down = [...steps].reverse();
  return (
    <Row gap={6} style={{ flexWrap: 'nowrap' }}>
      {down.map((s) => (
        <RoundBtn key={`d${s}`} label={`-${s}`} a11y={`${label}: minus ${s}`} onPress={() => onChange(value - s)} />
      ))}
      <View style={{ flex: 1, alignItems: 'center' }}>
        <T numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: F.monoMedium, fontSize: 20, lineHeight: 26 }} accessibilityLabel={`${label}: ${text}`}>
          {text}
        </T>
      </View>
      {steps.map((s) => (
        <RoundBtn key={`u${s}`} label={`+${s}`} a11y={`${label}: plus ${s}`} onPress={() => onChange(value + s)} />
      ))}
    </Row>
  );
}

export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      hitSlop={8}
      style={{
        width: 52,
        height: 30,
        borderRadius: 15,
        padding: 3,
        backgroundColor: value ? C.ui : C.well2,
        borderWidth: 1,
        borderColor: value ? C.ui : C.line2,
        alignItems: value ? 'flex-end' : 'flex-start',
      }}
    >
      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' }} />
    </Pressable>
  );
}

export function Chips<K extends string | number>({ items, value, onChange, tone = C.ui }: { items: { key: K; label: string }[]; value: K | null; onChange: (k: K) => void; tone?: string }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {items.map((it) => {
        const on = it.key === value;
        return (
          <Pressable
            key={String(it.key)}
            onPress={() => onChange(it.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={{
              paddingHorizontal: 12,
              minHeight: 38,
              justifyContent: 'center',
              borderRadius: 12,
              backgroundColor: on ? alpha(tone, 0.2) : C.well2,
              borderWidth: 1,
              borderColor: on ? tone : C.line,
            }}
          >
            <T v="small" color={on ? C.fg : C.muted} style={{ fontFamily: F.medium }}>
              {it.label}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}
