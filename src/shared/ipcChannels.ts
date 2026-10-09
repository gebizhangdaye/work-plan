/** 主进程 ↔ 渲染进程唯一的通道名清单；渲染层与 preload 只能从这里取。 */
export const IpcChannel = {
  Ping: 'workplan/ping',
  ItemList: 'workplan/item/list',
  ItemCreate: 'workplan/item/create',
  ItemUpdate: 'workplan/item/update',
  ItemToggleDone: 'workplan/item/toggleDone',
  ItemMove: 'workplan/item/move',
  ItemDelete: 'workplan/item/delete',
  AttachmentPaste: 'workplan/attachment/paste',
  AttachmentImportFiles: 'workplan/attachment/importFiles',
  AttachmentAddCropped: 'workplan/attachment/addCropped',
  AttachmentOpenInFolder: 'workplan/attachment/openInFolder',
  TagList: 'workplan/tag/list',
  TagEnsure: 'workplan/tag/ensure',
  TagAttach: 'workplan/tag/attach',
  TagDetach: 'workplan/tag/detach',
  ExportRun: 'workplan/export/run',
  SettingsGet: 'workplan/settings/get',
  SettingsSet: 'workplan/settings/set',
  WindowHideToTray: 'workplan/window/hideToTray',
  WindowMinimize: 'workplan/window/minimize',
  WindowToggleMaximize: 'workplan/window/toggleMaximize',
  WindowIsMaximized: 'workplan/window/isMaximized',
  WindowMaximizeChanged: 'workplan/window/maximizeChanged',
  MenuAction: 'workplan/menu/action',
  WindowSetMini: 'workplan/window/setMini',
  WindowRefresh: 'workplan/window/refresh',
  AppQuit: 'workplan/app/quit'
} as const

export type IpcChannelName = (typeof IpcChannel)[keyof typeof IpcChannel]
