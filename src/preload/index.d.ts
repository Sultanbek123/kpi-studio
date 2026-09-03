import { ElectronAPI } from '@electron-toolkit/preload'
import type { KpiApi } from './index'

declare global {
  interface Window {
    electron: ElectronAPI
    api: KpiApi
  }
}
