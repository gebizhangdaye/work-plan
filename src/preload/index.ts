import { contextBridge, ipcRenderer, webUtils } from 'electron'
import { IpcChannel } from '../shared/ipcChannels'
import type { ExportFormat, MenuActionId, WorkPlanApi } from '../shared/workPlanApi'
import type { Lane, WorkItemDraft } from '../domain/workItem/WorkItem'

const api: WorkPlanApi & { getPathForFile(file: File): string } = {
  // 沙箱化 preload 也暴露 process.platform/arch，这里够用，不必绕主进程
  isMac: process.platform === 'darwin',
  ping: () => ipcRenderer.invoke(IpcChannel.Ping),
  listItems: () => ipcRenderer.invoke(IpcChannel.ItemList),
  createItem: (draft: WorkItemDraft) => ipcRenderer.invoke(IpcChannel.ItemCreate, draft),
  updateItem: (id: string, draft: WorkItemDraft) => ipcRenderer.invoke(IpcChannel.ItemUpdate, id, draft),
  toggleDone: (id: string) => ipcRenderer.invoke(IpcChannel.ItemToggleDone, id),
  moveItem: (id: string, lane: Lane, beforeId: string | null) =>
    ipcRenderer.invoke(IpcChannel.ItemMove, id, lane, beforeId),
  deleteItem: (id: string) => ipcRenderer.invoke(IpcChannel.ItemDelete, id),
  pasteAttachment: (itemId: string) => ipcRenderer.invoke(IpcChannel.AttachmentPaste, itemId),
  importFiles: (itemId: string, files: string[]) =>
    ipcRenderer.invoke(IpcChannel.AttachmentImportFiles, itemId, files),
  addCroppedImage: (itemId: string, dataUrl: string, sourceId: string) =>
    ipcRenderer.invoke(IpcChannel.AttachmentAddCropped, itemId, dataUrl, sourceId),
  openAttachmentInFolder: (relPath: string) =>
    ipcRenderer.invoke(IpcChannel.AttachmentOpenInFolder, relPath),
  listTags: () => ipcRenderer.invoke(IpcChannel.TagList),
  ensureTag: (name: string) => ipcRenderer.invoke(IpcChannel.TagEnsure, name),
  attachTag: (itemId: string, tagId: string) => ipcRenderer.invoke(IpcChannel.TagAttach, itemId, tagId),
  detachTag: (itemId: string, tagId: string) =>
    ipcRenderer.invoke(IpcChannel.TagDetach, itemId, tagId),
  exportPlan: (format: ExportFormat) => ipcRenderer.invoke(IpcChannel.ExportRun, format),
  getSettings: () => ipcRenderer.invoke(IpcChannel.SettingsGet),
  setAutoStart: (enabled: boolean) => ipcRenderer.invoke(IpcChannel.SettingsSet, enabled),
  hideToTray: () => ipcRenderer.invoke(IpcChannel.WindowHideToTray),
  minimizeWindow: () => ipcRenderer.invoke(IpcChannel.WindowMinimize),
  toggleMaximize: () => ipcRenderer.invoke(IpcChannel.WindowToggleMaximize),
  isMaximized: () => ipcRenderer.invoke(IpcChannel.WindowIsMaximized),
  onWindowMaximizeChanged: (callback: (maximized: boolean) => void) => {
    ipcRenderer.on(IpcChannel.WindowMaximizeChanged, (_event, maximized: boolean) => callback(maximized))
  },
  runMenuAction: (id: MenuActionId) => ipcRenderer.invoke(IpcChannel.MenuAction, id),
  setMiniWindow: (enabled: boolean) => ipcRenderer.invoke(IpcChannel.WindowSetMini, enabled),
  onWindowRefresh: (callback: () => void) => {
    ipcRenderer.on(IpcChannel.WindowRefresh, () => callback())
  },
  quit: () => ipcRenderer.invoke(IpcChannel.AppQuit),
  // Electron 已移除渲染层的 File.path，只能在这里换回真实磁盘路径
  getPathForFile: (file: File) => webUtils.getPathForFile(file)
}

contextBridge.exposeInMainWorld('workPlan', api)
