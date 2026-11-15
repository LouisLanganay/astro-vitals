import { fieldMessage } from '../lib/errors';
import { REGION_LABEL, SYMPTOM_LABEL } from '../lib/labels';
import { BODY_REGIONS, SYMPTOM_KINDS, type AppError, type BodyRegion, type Symptom, type SymptomKind } from '../lib/types';
import { Chips, Field, Toggle } from './form';
import { Btn, Row, T, Well } from './kit';

const DEFAULT_REGION: Partial<Record<SymptomKind, BodyRegion>> = {
  headache: 'head',
  congestion: 'head',
  back_pain: 'back',
  nausea: 'abdomen',
  dizziness: 'head',
  vision_change: 'eyes',
  skin_rash: 'arms',
};

export function SymptomEditor({ symptom, onChange, onRemove, prefix, error }: { symptom: Symptom; onChange: (s: Symptom) => void; onRemove?: () => void; prefix: string; error: AppError | null }) {
  const msg = (f: string) => fieldMessage(error, `${prefix}.${f}`);
  return (
    <Well>
      <Row style={{ justifyContent: 'space-between' }}>
        <T v="h3">{SYMPTOM_LABEL[symptom.kind]}</T>
        {onRemove ? <Btn small kind="ghost" icon="trash" label="Remove" onPress={onRemove} /> : null}
      </Row>
      <Field label="Kind" error={msg('kind')}>
        <Chips
          items={SYMPTOM_KINDS.map((k) => ({ key: k, label: SYMPTOM_LABEL[k] }))}
          value={symptom.kind}
          onChange={(kind) => onChange({ ...symptom, kind, region: DEFAULT_REGION[kind] ?? symptom.region })}
        />
      </Field>
      <Field label="Severity" error={msg('severity')}>
        <Chips
          items={[
            { key: 1, label: '1 = mild' },
            { key: 2, label: '2 = moderate' },
            { key: 3, label: '3 = severe' },
          ]}
          value={symptom.severity}
          onChange={(severity) => onChange({ ...symptom, severity })}
        />
      </Field>
      <Field label="Body region" error={msg('region')}>
        <Chips items={BODY_REGIONS.map((r) => ({ key: r, label: REGION_LABEL[r] }))} value={symptom.region} onChange={(region) => onChange({ ...symptom, region })} />
      </Field>
      <Field
        label="Treated"
        help="You took a medicine or did a treatment."
        error={msg('treated')}
        right={<Toggle label="Treated" value={symptom.treated} onChange={(treated) => onChange({ ...symptom, treated, improved: treated ? symptom.improved : null })} />}
      >
        {null}
      </Field>
      {symptom.treated ? (
        <Field label="Improved after the treatment" error={msg('improved')}>
          <Chips
            items={[
              { key: 'unknown', label: 'Not known' },
              { key: 'yes', label: 'Yes' },
              { key: 'no', label: 'No' },
            ]}
            value={symptom.improved == null ? 'unknown' : symptom.improved ? 'yes' : 'no'}
            onChange={(k) => onChange({ ...symptom, improved: k === 'unknown' ? null : k === 'yes' })}
          />
        </Field>
      ) : null}
    </Well>
  );
}

