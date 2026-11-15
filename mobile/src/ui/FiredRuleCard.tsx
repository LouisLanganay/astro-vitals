import { Linking, Pressable, View } from 'react-native';

import { isUrl, ruleFact, ruleTitle, sourceLabel } from '../lib/rules';
import type { FiredRule } from '../lib/types';
import { Icon, LevelBadge, Row, T, Well } from './kit';
import { C, F } from './theme';

export function FiredRuleCard({ rule }: { rule: FiredRule }) {
  const fact = ruleFact(rule);
  return (
    <Well style={{ gap: 8 }}>
      <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
        <T v="h3" style={{ flex: 1 }}>
          {ruleTitle(rule)}
        </T>
        <LevelBadge state={rule.level} />
      </Row>
      <T style={{ fontFamily: F.medium }}>{rule.action}</T>
      {fact ? (
        <T v="small" color={C.muted}>
          {fact}
        </T>
      ) : null}
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
          <Row gap={6}>
            <Icon name="link" size={13} color={C.muted} />
            <T v="small" color={C.muted} style={{ flex: 1 }}>
              {rule.source}
            </T>
          </Row>
        )}
      </View>
    </Well>
  );
}
