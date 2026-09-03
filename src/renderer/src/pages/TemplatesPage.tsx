import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileStack } from 'lucide-react'
import { Card, CardContent } from '@renderer/components/ui/card'
import { Button } from '@renderer/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@renderer/components/ui/table'
import type { MappingTemplate } from '@shared/types'

export function TemplatesPage(): React.JSX.Element {
  const [templates, setTemplates] = useState<MappingTemplate[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    window.api
      .templatesList()
      .then(setTemplates)
      .catch((e) => setError(String(e?.message ?? e)))
  }, [])

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Шаблоны маппинга</h1>
        <Button asChild variant="outline" size="sm">
          <Link to="/import">Новый импорт</Link>
        </Button>
      </div>
      <p className="text-sm text-muted-foreground max-w-xl">
        Шаблон запоминает, как колонки конкретного файла (обычно — от одного агентства)
        сопоставляются с полями KPI Studio. В следующий раз файл с такой же структурой заедет в один
        клик.
      </p>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        <CardContent className="p-0">
          {!templates ? (
            <p className="p-4 text-sm text-muted-foreground">Загрузка…</p>
          ) : templates.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <FileStack className="size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Пока нет сохранённых шаблонов.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead>Агентство</TableHead>
                  <TableHead>Строка заголовка</TableHead>
                  <TableHead>Колонок размечено</TableHead>
                  <TableHead>Обновлён</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell className="text-muted-foreground">{t.agency ?? '—'}</TableCell>
                    <TableCell>{t.headerRow + 1}</TableCell>
                    <TableCell>
                      {t.columnMap.filter((c) => c.role.type !== 'ignore').length}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(t.updatedAt).toLocaleString('ru-RU')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
