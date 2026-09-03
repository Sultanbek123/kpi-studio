import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent } from '@renderer/components/ui/card'
import { Badge } from '@renderer/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@renderer/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@renderer/components/ui/tabs'
import { METRIC_LABELS } from '@shared/metrics'
import type { MetricKind, MetricRow } from '@shared/types'
import { formatMetric } from '@renderer/lib/format'

type SortKey = 'date' | 'channel' | 'placementName' | 'metric' | 'value'

export function DataPage(): React.JSX.Element {
  const [rows, setRows] = useState<MetricRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [channel, setChannel] = useState<string>('all')
  const [kind, setKind] = useState<'all' | MetricKind>('all')
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({
    key: 'date',
    dir: 'desc'
  })

  useEffect(() => {
    window.api
      .dataListMetricRows()
      .then(setRows)
      .catch((e) => setError(String(e?.message ?? e)))
  }, [])

  const channels = useMemo(
    () => (rows ? [...new Set(rows.map((r) => r.channel))].sort() : []),
    [rows]
  )

  const filtered = useMemo(() => {
    if (!rows) return []
    let out = rows
    if (channel !== 'all') out = out.filter((r) => r.channel === channel)
    if (kind !== 'all') out = out.filter((r) => r.kind === kind)
    const dir = sort.dir === 'asc' ? 1 : -1
    return [...out].sort((a, b) => {
      const av = a[sort.key]
      const bv = b[sort.key]
      if (av === bv) return 0
      return av > bv ? dir : -dir
    })
  }, [rows, channel, kind, sort])

  function toggleSort(key: SortKey): void {
    setSort((s) =>
      s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }
    )
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Данные</h1>
        {rows && (
          <p className="text-xs text-muted-foreground">
            {filtered.length} строк из {rows.length}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={kind} onValueChange={(v) => setKind(v as 'all' | MetricKind)}>
          <TabsList>
            <TabsTrigger value="all">Все</TabsTrigger>
            <TabsTrigger value="plan">План</TabsTrigger>
            <TabsTrigger value="fact">Факт</TabsTrigger>
          </TabsList>
        </Tabs>

        <Select value={channel} onValueChange={setChannel}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Канал" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все каналы</SelectItem>
            {channels.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        <CardContent className="p-0">
          {!rows ? (
            <p className="p-4 text-sm text-muted-foreground">Загрузка…</p>
          ) : filtered.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              Нет данных — импортируйте медиаплан на странице «Импорт».
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead label="Дата" k="date" sort={sort} onClick={toggleSort} />
                  <SortableHead label="Канал" k="channel" sort={sort} onClick={toggleSort} />
                  <SortableHead
                    label="Размещение"
                    k="placementName"
                    sort={sort}
                    onClick={toggleSort}
                  />
                  <TableHead>Кампания</TableHead>
                  <SortableHead label="Метрика" k="metric" sort={sort} onClick={toggleSort} />
                  <TableHead>Вид</TableHead>
                  <SortableHead
                    label="Значение"
                    k="value"
                    sort={sort}
                    onClick={toggleSort}
                    align="right"
                  />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, 500).map((r, i) => (
                  <TableRow key={i}>
                    <TableCell>{r.date}</TableCell>
                    <TableCell>{r.channel}</TableCell>
                    <TableCell className="max-w-[220px] truncate">{r.placementName}</TableCell>
                    <TableCell className="max-w-[160px] truncate text-muted-foreground">
                      {r.campaignName}
                    </TableCell>
                    <TableCell>{METRIC_LABELS[r.metric] ?? r.metric}</TableCell>
                    <TableCell>
                      <Badge variant={r.kind === 'plan' ? 'outline' : 'secondary'}>
                        {r.kind === 'plan' ? 'план' : 'факт'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatMetric(r.metric, r.value)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {filtered.length > 500 && (
            <p className="p-3 text-xs text-muted-foreground">
              Показаны первые 500 из {filtered.length} строк.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function SortableHead({
  label,
  k,
  sort,
  onClick,
  align
}: {
  label: string
  k: SortKey
  sort: { key: SortKey; dir: 'asc' | 'desc' }
  onClick: (k: SortKey) => void
  align?: 'right'
}): React.JSX.Element {
  const active = sort.key === k
  return (
    <TableHead
      onClick={() => onClick(k)}
      className={`cursor-pointer select-none hover:text-foreground ${align === 'right' ? 'text-right' : ''}`}
    >
      {label}
      {active ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ''}
    </TableHead>
  )
}
