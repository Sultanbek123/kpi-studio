import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Upload } from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardValue,
  CardDescription
} from '@renderer/components/ui/card'
import { Button } from '@renderer/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@renderer/components/ui/table'
import { Badge } from '@renderer/components/ui/badge'
import { aggregateBase, computeDerived, pacing, type BaseSums } from '@shared/metrics'
import type { MetricKind, MetricRow } from '@shared/types'
import { formatCurrency, formatInt, formatMetric, formatPercent } from '@renderer/lib/format'

function bagsByKey(
  rows: MetricRow[],
  kind: MetricKind,
  keyFn: (r: MetricRow) => string
): BaseSums[] {
  const map = new Map<string, BaseSums>()
  for (const r of rows) {
    if (r.kind !== kind) continue
    const key = keyFn(r)
    const bag = map.get(key) ?? {}
    bag[r.metric] = (bag[r.metric] ?? 0) + r.value
    map.set(key, bag)
  }
  return [...map.values()]
}

export function DashboardPage(): React.JSX.Element {
  const [rows, setRows] = useState<MetricRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    window.api
      .dataListMetricRows()
      .then(setRows)
      .catch((e) => setError(String(e?.message ?? e)))
  }, [])

  const stats = useMemo(() => {
    if (!rows) return null

    const planBags = bagsByKey(rows, 'plan', (r) => `${r.placementId}|${r.date}`)
    const factBags = bagsByKey(rows, 'fact', (r) => `${r.placementId}|${r.date}`)
    const { sums: planSums } = aggregateBase(planBags)
    const { sums: factSums, reach: factReach } = aggregateBase(factBags)

    const dates = rows.map((r) => r.date).sort()
    const firstDate = dates[0]
    const lastDate = dates[dates.length - 1]
    const totalDays = firstDate && lastDate ? Math.max(1, daysBetween(firstDate, lastDate) + 1) : 0
    const elapsedDays = firstDate ? Math.max(0, daysBetween(firstDate, todayISO())) : 0

    const pacingValue =
      planSums.spend && totalDays > 0
        ? pacing({
            spendPlan: planSums.spend,
            spendFact: factSums.spend ?? 0,
            elapsedDays,
            totalDays
          })
        : null

    const channelKeys = [...new Set(rows.map((r) => r.channel))]
    const channels = channelKeys
      .map((channel) => {
        const chFactBags = bagsByKey(
          rows.filter((r) => r.channel === channel),
          'fact',
          (r) => `${r.placementId}|${r.date}`
        )
        const { sums, reach } = aggregateBase(chFactBags)
        return {
          channel,
          spend: sums.spend ?? 0,
          impressions: sums.impressions ?? 0,
          clicks: sums.clicks ?? 0,
          ctr: computeDerived('ctr', sums),
          cpm: computeDerived('cpm', sums),
          reachReliable: reach.isReliable,
          reachValue: reach.value
        }
      })
      .sort((a, b) => b.spend - a.spend)

    return {
      planSums,
      factSums,
      factReach,
      pacingValue,
      totalDays,
      elapsedDays,
      channels,
      placementCount: new Set(rows.map((r) => r.placementId)).size
    }
  }, [rows])

  if (error) {
    return (
      <PageShell title="Дашборд">
        <p className="text-sm text-destructive">{error}</p>
      </PageShell>
    )
  }

  if (!rows) {
    return (
      <PageShell title="Дашборд">
        <p className="text-sm text-muted-foreground">Загрузка…</p>
      </PageShell>
    )
  }

  if (rows.length === 0 || !stats) {
    return (
      <PageShell title="Дашборд">
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-20 text-center">
          <p className="text-sm text-muted-foreground max-w-sm">
            Данных пока нет. Импортируйте медиаплан из Excel, чтобы увидеть дашборд.
          </p>
          <Button asChild>
            <Link to="/import">
              <Upload /> Импортировать файл
            </Link>
          </Button>
        </div>
      </PageShell>
    )
  }

  const remaining = (stats.planSums.spend ?? 0) - (stats.factSums.spend ?? 0)

  return (
    <PageShell title="Дашборд">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi title="Бюджет план" value={formatCurrency(stats.planSums.spend)} />
        <Kpi title="Бюджет факт" value={formatCurrency(stats.factSums.spend)} />
        <Kpi title="Остаток бюджета" value={formatCurrency(remaining)} />
        <Kpi
          title="Pacing"
          value={stats.pacingValue !== null ? formatPercent(stats.pacingValue) : '—'}
          hint={
            stats.pacingValue !== null
              ? stats.pacingValue > 1.1
                ? 'опережаем план'
                : stats.pacingValue < 0.9
                  ? 'отстаём от плана'
                  : 'по плану'
              : 'нет плановых дат'
          }
        />
        <Kpi title="Показы (факт)" value={formatInt(stats.factSums.impressions)} />
        <Kpi title="Клики (факт)" value={formatInt(stats.factSums.clicks)} />
        <Kpi title="CPM" value={formatMetric('cpm', computeDerived('cpm', stats.factSums))} />
        <Kpi title="CTR" value={formatMetric('ctr', computeDerived('ctr', stats.factSums))} />
      </div>

      {!stats.factReach.isReliable && stats.factReach.rowCount > 1 && (
        <p className="text-xs text-muted-foreground">
          Охват показан только на уровне отдельных размещений — сумма охвата по нескольким каналам
          не считается (аудитории пересекаются).
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>По каналам (факт)</CardTitle>
          <CardDescription>{stats.placementCount} размещений</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Канал</TableHead>
                <TableHead className="text-right">Расход</TableHead>
                <TableHead className="text-right">Показы</TableHead>
                <TableHead className="text-right">Клики</TableHead>
                <TableHead className="text-right">CTR</TableHead>
                <TableHead className="text-right">CPM</TableHead>
                <TableHead className="text-right">Охват</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.channels.map((c) => (
                <TableRow key={c.channel}>
                  <TableCell className="font-medium">{c.channel}</TableCell>
                  <TableCell className="text-right">{formatCurrency(c.spend)}</TableCell>
                  <TableCell className="text-right">{formatInt(c.impressions)}</TableCell>
                  <TableCell className="text-right">{formatInt(c.clicks)}</TableCell>
                  <TableCell className="text-right">{formatMetric('ctr', c.ctr)}</TableCell>
                  <TableCell className="text-right">{formatMetric('cpm', c.cpm)}</TableCell>
                  <TableCell className="text-right">
                    {c.reachReliable ? (
                      formatInt(c.reachValue)
                    ) : (
                      <Badge
                        variant="outline"
                        title="Несколько размещений — сумма охвата ненадёжна"
                      >
                        н/д
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PageShell>
  )
}

function Kpi({
  title,
  value,
  hint
}: {
  title: string
  value: string
  hint?: string
}): React.JSX.Element {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardValue>{value}</CardValue>
        {hint && <CardDescription className="mt-1">{hint}</CardDescription>}
      </CardContent>
    </Card>
  )
}

function PageShell({
  title,
  children
}: {
  title: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="text-lg font-semibold">{title}</h1>
      {children}
    </div>
  )
}

function daysBetween(a: string, b: string): number {
  const ms = new Date(b).getTime() - new Date(a).getTime()
  return Math.round(ms / 86400000)
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}
