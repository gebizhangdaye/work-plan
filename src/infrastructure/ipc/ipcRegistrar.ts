import { BrowserWindow, app, dialog, ipcMain, shell } from 'electron'
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { IpcChannel } from '../../shared/ipcChannels'
import type { ExportFormat, MenuActionId } from '../../shared/workPlanApi'
import { runMenuAction } from '../menu/menuActions'
import { toMarkdown } from '../../domain/export/markdownExporter'
import { toCsv } from '../../domain/export/csvExporter'
import type { Lane, WorkItemDraft } from '../../domain/workItem/WorkItem'
import type { AttachmentFileStore } from '../storage/attachmentFileStore'
import { resolveAttachmentFile, type DataPaths } from '../storage/appDataPaths'
import { collectSettings } from '../storage/storageFootprint'
import { readAutoStart, applyAutoStart } from '../startup/autoStartSetting'
import { ingestClipboardImage } from '../media/clipboardIngest'
import { importDroppedFiles } from '../media/draggedFileImport'
import { addCroppedImage } from '../media/croppedImageIngest'
import type { WorkPlanDatabase } from '../db/DatabaseConnection'
import type { TagSqlRepository } from '../db/tagRepository'
import type { WorkItemSqlRepository } from '../db/workItemSqlRepository'

export interface WorkPlanServices {
  paths: DataPaths
  db: WorkPlanDatabase
  items: WorkItemSqlRepository
  tags: TagSqlRepository
  files: AttachmentFileStore
  hideMainWindow: () => void
  /** 自定义标题栏的窗口按钮要拿到主窗实例。 */
  mainWindow: () => BrowserWindow | null
  quitApp: () => void
  setMini: (enabled: boolean) => void
}

type Handler = (...args: never[]) => unknown

export function registerWorkPlanIpc(services: WorkPlanServices): void {
  const on = (channel: string, handler: Handler) => {
    ipcMain.handle(channel, (_event, ...args) => handler(...(args as never[])))
  }

  on(IpcChannel.Ping, () => `pong ${services.items.listAll().length}`)
  on(IpcChannel.ItemList, () => services.items.listAll())
  on(IpcChannel.ItemCreate, (draft: WorkItemDraft) => services.items.create(draft))
  on(IpcChannel.ItemUpdate, (id: string, draft: WorkItemDraft) => services.items.update(id, draft))
  on(IpcChannel.ItemToggleDone, (id: string) => services.items.toggleDone(id))
  on(IpcChannel.ItemMove, (id: string, lane: Lane, beforeId: string | null) => {
    services.items.moveTo(id, lane, beforeId)
    return services.items.listAll()
  })
  on(IpcChannel.ItemDelete, (id: string) => services.files.releaseFiles(services.items.remove(id)))

  on(IpcChannel.AttachmentPaste, async (itemId: string) => ({
    attachment: await ingestClipboardImage(services.files, itemId)
  }))
  on(IpcChannel.AttachmentImportFiles, (itemId: string, files: string[]) =>
    importDroppedFiles(services.db, services.files, itemId, files)
  )
  on(IpcChannel.AttachmentAddCropped, (itemId: string, dataUrl: string, sourceId: string) =>
    addCroppedImage(services.files, itemId, dataUrl, sourceId)
  )
  on(IpcChannel.AttachmentOpenInFolder, (relPath: string) => {
    const absolute = resolveAttachmentFile(services.paths, relPath)
    if (absolute) shell.showItemInFolder(absolute)
  })

  on(IpcChannel.TagList, () => services.tags.listAll())
  on(IpcChannel.TagEnsure, (name: string) => services.tags.ensureTag(name))
  on(IpcChannel.TagAttach, (itemId: string, tagId: string) => services.tags.attach(itemId, tagId))
  on(IpcChannel.TagDetach, (itemId: string, tagId: string) => {
    services.tags.detach(itemId, tagId)
    services.tags.dropUnusedTag(tagId)
  })

  on(IpcChannel.ExportRun, (format: ExportFormat) => runExport(services, format))
  on(IpcChannel.SettingsGet, () => snapshot(services))
  on(IpcChannel.SettingsSet, (enabled: boolean) => {
    applyAutoStart(enabled)
    return snapshot(services)
  })
  on(IpcChannel.WindowHideToTray, () => services.hideMainWindow())
  on(IpcChannel.WindowMinimize, () => services.mainWindow()?.minimize())
  on(IpcChannel.WindowToggleMaximize, () => toggleMaximize(services.mainWindow()))
  on(IpcChannel.WindowIsMaximized, () => services.mainWindow()?.isMaximized() ?? false)
  on(IpcChannel.WindowSetMini, (enabled: boolean) => services.setMini(enabled))
  on(IpcChannel.AppQuit, () => services.quitApp())

  // 菜单动作要认发起者：主窗和小窗共用一份菜单，谁点的就作用在谁身上
  ipcMain.handle(IpcChannel.MenuAction, (event, id: MenuActionId) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (window) runMenuAction(window, id)
  })
}

function toggleMaximize(window: BrowserWindow | null): void {
  if (!window) return
  if (window.isMaximized()) window.restore()
  else window.maximize()
}

function snapshot(services: WorkPlanServices) {
  return collectSettings(services.paths, services.db, readAutoStart(), app.getVersion())
}

async function runExport(services: WorkPlanServices, format: ExportFormat): Promise<string | null> {
  const today = new Date().toISOString().slice(0, 10)
  const extension = format === 'md' ? 'md' : 'csv'
  const target = path.join(services.paths.root, `工作计划-${today}.${extension}`)

  const { canceled, filePath } = await dialog.showSaveDialog({
    title: '导出工作计划',
    defaultPath: target,
    filters: [{ name: format === 'md' ? 'Markdown 文档' : 'CSV 表格', extensions: [extension] }]
  })
  if (canceled || !filePath) return null

  const items = services.items.listAll()
  writeFileSync(filePath, format === 'md' ? toMarkdown(items, today) : toCsv(items, today), 'utf8')
  return filePath
}

void BrowserWindow
