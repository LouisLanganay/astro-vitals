import { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';

import { isUrl, ruleFact, ruleTitle, sourceLabel } from '../lib/rules';
import type { FiredRule } from '../lib/types';
import { Icon, IconBox, LevelBadge, LevelIcon, Row, T, Well } from './kit';
import { C, F, LEVEL_COLOR } from './theme';

export function FiredRuleCard({ rule }: { rule: FiredRule }) {
  const [open, setOpen] = useState(false);
  const fact = ruleFact(rule);
  return (
    <Well style={{ gap: 8 }}>
      <Row>
        <IconBox color={LEVEL_COLOR[rule.level]}>
          <LevelIcon state={rule.level} size={11} />
        </IconBox>
        <LevelBadge state={rule.level} />
      </Row>
      <T v="h3">{ruleTitle(rule)}</T>
      <T style={{ fontFamily: F.medium }}>{rule.action}</T>
      {fact ? (
        <T v="small" color={C.muted}>
          {fact}
        </T>
      ) : null}
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        hitSlop={8}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 }}
      >
        <View style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }}>
          <Icon name="chevron" size={14} color={C.ui} />
        </View>
        <T v="small" color={C.ui} style={{ fontFamily: F.medium }}>
          {open ? 'Hide the explanation' : 'Why?'}
        </T>
      </Pressable>
      {open ? (
        <View style={{ gap: 8 }}>
          <T v="small" color={C.muted}>
            {rule.explanation}
          </T>
          {isUrl(rule.source) ? (
            <Pressable
              onPress={() => Linking.openURL(rule.source)}
              accessibilityRole="link"
              accessibilityLabel={`Source: ${sourceLabel(rule.source)}`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
              <Icon name="link" size={13} color={C.muted} />
              <T v="small" style={{ textDecorationLine: 'underline' }}>
                {sourceLabel(rule.source)}
              </T>
            </Pressable>
          ) : (
            <T v="small" color={C.muted}>
              Source: {rule.source}
            </T>
          )}
        </View>
      ) : null}
    </Well>
  );
}
