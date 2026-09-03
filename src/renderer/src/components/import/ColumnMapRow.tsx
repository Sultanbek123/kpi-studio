import { BASE_METRICS, DIMENSION_FIELDS, DIMENSION_LABELS, type ColumnMapping } from '@shared/types'
import { METRIC_LABELS } from '@shared/metrics'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'
import { Badge } from '@renderer/components/ui/badge'
import { TableCell, TableRow } from '@renderer/components/ui/table'

function confidenceBadge(confidence?: number): React.JSX.Element | null {
  if (confidence === undefined) return null
  const pct = Math.round(confidence * 100)
  const variant = confidence >= 0.8 ? 'success' : confidence >= 0.6 ? 'warning' : 'outline'
  return (
    <Badge variant={variant} className="ml-2">
      {pct}%
    </Badge>
  )
}

export function ColumnMapRow({
  mapping,
  sample,
  onChange
}: {
  mapping: ColumnMapping
  sample: string
  onChange: (next: ColumnMapping) => void
}): React.JSX.Element {
  const roleType = mapping.role.type

  return (
    <TableRow>
      <TableCell className="text-muted-foreground">{mapping.columnIndex + 1}</TableCell>
      <TableCell className="font-medium max-w-[180px] truncate" title={mapping.header}>
        {mapping.header || <span className="text-muted-foreground italic">(пусто)</span>}
      </TableCell>
      <TableCell className="max-w-[140px] truncate text-muted-foreground text-xs" title={sample}>
        {sample || '—'}
      </TableCell>
      <TableCell>
        <Select
          value={roleType}
          onValueChange={(v) => {
            if (v === 'ignore')
              onChange({ ...mapping, role: { type: 'ignore' }, confidence: undefined })
            else if (v === 'dimension')
              onChange({
                ...mapping,
                role: { type: 'dimension', field: 'channel' },
                confidence: undefined
              })
            else
              onChange({
                ...mapping,
                role: { type: 'metric', metric: 'spend', kind: 'fact' },
                confidence: undefined
              })
          }}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="dimension">Измерение</SelectItem>
            <SelectItem value="metric">Метрика</SelectItem>
            <SelectItem value="ignore">Игнорировать</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell colSpan={2}>
        {mapping.role.type === 'dimension' && (
          <Select
            value={mapping.role.field}
            onValueChange={(v) =>
              onChange({
                ...mapping,
                role: { type: 'dimension', field: v as (typeof DIMENSION_FIELDS)[number] }
              })
            }
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DIMENSION_FIELDS.map((f) => (
                <SelectItem key={f} value={f}>
                  {DIMENSION_LABELS[f]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {mapping.role.type === 'metric' && (
          <div className="flex gap-2">
            <Select
              value={mapping.role.metric}
              onValueChange={(v) =>
                onChange({
                  ...mapping,
                  role: {
                    type: 'metric',
                    metric: v as (typeof BASE_METRICS)[number],
                    kind: (mapping.role as { kind: 'plan' | 'fact' }).kind
                  }
                })
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BASE_METRICS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {METRIC_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={mapping.role.kind}
              onValueChange={(v) =>
                onChange({
                  ...mapping,
                  role: {
                    type: 'metric',
                    metric: (mapping.role as { metric: (typeof BASE_METRICS)[number] }).metric,
                    kind: v as 'plan' | 'fact'
                  }
                })
              }
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="plan">план</SelectItem>
                <SelectItem value="fact">факт</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        {mapping.role.type === 'ignore' && <span className="text-xs text-muted-foreground">—</span>}
      </TableCell>
      <TableCell className="text-right">{confidenceBadge(mapping.confidence)}</TableCell>
    </TableRow>
  )
}
