import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Table2, Upload, FileStack } from 'lucide-react'
import { cn } from '@renderer/lib/utils'

const NAV_ITEMS = [
  { to: '/', label: 'Дашборд', icon: LayoutDashboard, end: true },
  { to: '/data', label: 'Данные', icon: Table2, end: false },
  { to: '/import', label: 'Импорт', icon: Upload, end: false },
  { to: '/templates', label: 'Шаблоны', icon: FileStack, end: false }
] as const

export function Sidebar(): React.JSX.Element {
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-card">
      <div className="flex items-center gap-2 px-4 py-4">
        <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-semibold">
          K
        </div>
        <div>
          <div className="text-sm font-semibold leading-tight">KPI Studio</div>
          <div className="text-[11px] text-muted-foreground leading-tight">Digital media KPI</div>
        </div>
      </div>

      <nav className="flex flex-col gap-0.5 px-2">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
              )
            }
          >
            <Icon className="size-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto px-4 py-3 text-[11px] text-muted-foreground">
        Все данные хранятся локально. Ничего не отправляется в сеть.
      </div>
    </aside>
  )
}
