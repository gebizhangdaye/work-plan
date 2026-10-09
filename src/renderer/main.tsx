import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AppShell } from './AppShell'
import { MiniRoot } from './MiniRoot'
import './styles/app.css'

/** 主窗与小窗是同一个 bundle 的两种入口，靠 URL query 分流（小窗由主进程带 ?view=mini 打开）。 */
const isMiniView = new URLSearchParams(window.location.search).get('view') === 'mini'

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>{isMiniView ? <MiniRoot /> : <AppShell />}</StrictMode>
)
