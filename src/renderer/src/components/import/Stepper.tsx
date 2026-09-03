import { Check } from 'lucide-react'
import { cn } from '@renderer/lib/utils'

const STEPS = ['Файл', 'Лист и шапка', 'Маппинг колонок', 'Проверка', 'Импорт'] as const

export function Stepper({ step }: { step: number }): React.JSX.Element {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((label, i) => {
        const n = i + 1
        const done = n < step
        const active = n === step
        return (
          <div key={label} className="flex items-center gap-2">
            <div
              className={cn(
                'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium',
                done && 'bg-primary text-primary-foreground',
                active && !done && 'border-2 border-primary text-primary',
                !active && !done && 'border border-border text-muted-foreground'
              )}
            >
              {done ? <Check className="size-3.5" /> : n}
            </div>
            <span
              className={cn(
                'text-sm',
                active ? 'font-medium text-foreground' : 'text-muted-foreground'
              )}
            >
              {label}
            </span>
            {n < STEPS.length && <div className="mx-1 h-px w-8 bg-border" />}
          </div>
        )
      })}
    </div>
  )
}
