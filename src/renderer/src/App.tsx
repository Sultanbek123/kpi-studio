import { HashRouter, Routes, Route } from 'react-router-dom'
import { Sidebar } from '@renderer/components/layout/Sidebar'
import { DashboardPage } from '@renderer/pages/DashboardPage'
import { DataPage } from '@renderer/pages/DataPage'
import { ImportPage } from '@renderer/pages/ImportPage'
import { TemplatesPage } from '@renderer/pages/TemplatesPage'

function App(): React.JSX.Element {
  return (
    <HashRouter>
      <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/data" element={<DataPage />} />
            <Route path="/import" element={<ImportPage />} />
            <Route path="/templates" element={<TemplatesPage />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  )
}

export default App
