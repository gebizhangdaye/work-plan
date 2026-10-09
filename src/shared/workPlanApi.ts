import type { AttachmentRef, Lane, TagRef, WorkItem, WorkItemDraft } from '../domain/workItem/WorkItem'

export type ExportFormat = 'md' | 'csv'

/** 自定义标题栏菜单里每一项要主进程执行的动作。 */
export type MenuActionId =
  | 'minimize'
  | 'quit'
  | 'undo'
  | 'redo'
  | 'cut'
  | 'copy'
  | 'paste'
  | 'selectAll'
  | 'reload'
  | 'forceReload'
  | 'resetZoom'
  | 'zoomIn'
  | 'zoomOut'
  | 'toggleDevTools'
  | 'toggleFullScreen'

export interface AppSettings {
  openAtLogin: boolean
  dataRoot: string
  dbBytes: number
  attachmentBytes: number
  attachmentCount: number
  itemCount: number
  /** 自定义标题栏之后原生「关于」弹窗没有入口了，版本号由设置弹窗自己显示。 */
  version: string
}

export interface TagOption extends TagRef {
  usage: number
}

export interface PasteOutcome {
  /** 剪贴板里根本没有图片时返回 null，渲染层据此回退成普通文本粘贴。 */
  attachment: AttachmentRef | null
}

/** preload 通过 contextBridge 暴露给渲染层的唯一接口。 */
export interface WorkPlanApi {
  /**
   * 决定快捷键标签是 ⌘ 还是 Ctrl、以及要不要自己画窗口按钮。
   * preload 里算好、同步可读，故意不走 IPC：首屏前多一次往返会让标题栏按错的左内边距闪一下。
   */
  readonly isMac: boolean
  ping(): Promise<string>
  listItems(): Promise<WorkItem[]>
  createItem(draft: WorkItemDraft): Promise<WorkItem>
  updateItem(id: string, draft: WorkItemDraft): Promise<WorkItem>
  toggleDone(id: string): Promise<WorkItem>
  moveItem(id: string, lane: Lane, beforeId: string | null): Promise<WorkItem[]>
  deleteItem(id: string): Promise<void>
  pasteAttachment(itemId: string): Promise<PasteOutcome>
  importFiles(itemId: string, paths: string[]): Promise<AttachmentRef[]>
  addCroppedImage(itemId: string, dataUrl: string, sourceAttachmentId: string): Promise<AttachmentRef | null>
  openAttachmentInFolder(relPath: string): Promise<void>
  listTags(): Promise<TagOption[]>
  ensureTag(name: string): Promise<TagOption>
  attachTag(itemId: string, tagId: string): Promise<void>
  detachTag(itemId: string, tagId: string): Promise<void>
  exportPlan(format: ExportFormat): Promise<string | null>
  getSettings(): Promise<AppSettings>
  setAutoStart(enabled: boolean): Promise<AppSettings>
  hideToTray(): Promise<void>
  /** 自定义标题栏的三个按钮：最小化、最大化/还原、关闭（关闭即收进托盘）。 */
  minimizeWindow(): Promise<void>
  toggleMaximize(): Promise<void>
  isMaximized(): Promise<boolean>
  /** 无边框窗口没有原生标题栏可看状态，最大化按钮的图标要靠主进程推。 */
  onWindowMaximizeChanged(callback: (maximized: boolean) => void): void
  /** 标题栏菜单项：主进程按发起者的那个窗口执行（主窗和小窗共用一份菜单）。 */
  runMenuAction(id: MenuActionId): Promise<void>
  /** 小窗置顶模式：主进程开/关独立的无边框置顶窗口。 */
  setMiniWindow(enabled: boolean): Promise<void>
  /** 主窗从隐藏中恢复时，主进程推一次刷新，渲染层重新拉数据。 */
  onWindowRefresh(callback: () => void): void
  quit(): Promise<void>
  /** Electron 移除了渲染层的 File.path，只有 preload 能拿到真实磁盘路径。 */
  getPathForFile(file: File): string
}
