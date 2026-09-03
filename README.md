# KPI Studio

Локальное десктопное приложение для работы с KPI-таблицами диджитал-маркетинга: импорт медиапланов из Excel через визард с маппингом колонок, дашборд план/факт, витрина данных — без ручной работы в Excel.

Полностью офлайн: SQLite-файл на диске, ноль сетевых запросов.

## Стек

Electron + Vite + React + TypeScript, Tailwind CSS v4, SQLite (`better-sqlite3`), SheetJS (`xlsx`) для чтения, ExcelJS для будущего экспорта, Zod на границах IPC.

## Разработка

```bash
npm install
npm run dev
```

## Тесты

```bash
npm run test        # vitest: numberParser + metrics engine (доменная логика)
npm run test:e2e     # собирает прод-билд и прогоняет импорт синтетической
                      # фикстуры через реальный Electron-рантайм (Playwright)
```

Синтетическая «грязная» фикстура медиаплана Samsung KZ (`fixtures/samsung_kz_media_plan_sample.xlsx`) генерируется командой:

```bash
npm run fixture:generate
```

## Сборка

```bash
npm run build:mac    # или build:win / build:linux
```

## Структура

```
src/shared/    — домен: типы, движок метрик (CPM/CTR/CPA/ROAS…), парсер чисел,
                 авто-подбор маппинга колонок, Zod-схемы IPC. Без зависимостей
                 от Node/Electron — юнит-тестируется в изоляции.
src/main/      — Electron main-процесс: SQLite (миграции, репозиторий),
                 чтение/нормализация Excel, IPC-хендлеры.
src/preload/   — типизированный мост renderer ↔ main.
src/renderer/  — React UI: дашборд, витрина данных, визард импорта, шаблоны.
scripts/       — генератор фикстуры, e2e-смоук.
```

Подробный манифест для агентов, запускающих/проверяющих приложение — [.claude/skills/run-desktop/SKILL.md](.claude/skills/run-desktop/SKILL.md).
