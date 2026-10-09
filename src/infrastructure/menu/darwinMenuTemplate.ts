import type { MenuItemConstructorOptions } from 'electron'
import type { MenuActionId } from '../../shared/workPlanApi'
import { MENU_SHORTCUTS } from '../../shared/menuShortcuts'

/**
 * macOS 才建这一份。标题栏里那条菜单条照旧留着，这条系统菜单栏负责的是 Mac 用户习惯的
 * ⌘Q/⌘H/⌘M、窗口菜单，以及 Edit 那几项的原生校验（没选区时剪切/复制该是灰的）。
 *
 * 每一项都是「叶子 role + 显式中文 label + 显式 accelerator」：
 * - 不用 appMenu / editMenu / viewMenu / windowMenu 这种整块 role —— 它们会连着一批
 *   默认英文项一起进来，而「界面里没有英文项」是 docs/manual-acceptance.md 里验收过的不变量；
 * - 保留叶子 role 是为了拿到原生行为本身（quit 的正常终止语义、剪切复制的启用状态判定、
 *   minimize 进窗口菜单），这些用 click 自己拼是拼不出等价语义的；
 * - accelerator 一律从 MENU_SHORTCUTS 取，跟标题栏里显示的那一列同源，不会两处漂移。
 *
 * 「关于工作计划」暂时不进这份菜单：它是渲染层的设置弹窗分区，要接进来得新开一条
 * 主进程 → 渲染层的推送通道；标题栏 帮助 → 关于工作计划 那条入口还在。
 */
export interface DarwinMenuHosts {
  appName: string
  hideMainWindow: () => void
}

const accelerator = (id: MenuActionId): string => MENU_SHORTCUTS[id].accelerator

export function buildDarwinMenuTemplate(hosts: DarwinMenuHosts): MenuItemConstructorOptions[] {
  return [
    {
      // 第一项就是应用菜单，label 必须是应用名
      label: hosts.appName,
      submenu: [
        { role: 'services', label: '服务' },
        { type: 'separator' },
        { role: 'hide', label: `隐藏 ${hosts.appName}` },
        { role: 'hideOthers', label: '隐藏其他' },
        { role: 'unhide', label: '全部显示' },
        { type: 'separator' },
        { role: 'quit', label: `退出${hosts.appName}`, accelerator: accelerator('quit') }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { role: 'undo', label: '撤销', accelerator: accelerator('undo') },
        { role: 'redo', label: '重做', accelerator: accelerator('redo') },
        { type: 'separator' },
        { role: 'cut', label: '剪切', accelerator: accelerator('cut') },
        { role: 'copy', label: '复制', accelerator: accelerator('copy') },
        { role: 'paste', label: '粘贴', accelerator: accelerator('paste') },
        { role: 'selectAll', label: '全选', accelerator: accelerator('selectAll') }
      ]
    },
    {
      label: '视图',
      submenu: [
        { role: 'reload', label: '重新加载', accelerator: accelerator('reload') },
        { role: 'forceReload', label: '强制重新加载', accelerator: accelerator('forceReload') },
        { type: 'separator' },
        { role: 'resetZoom', label: '实际大小', accelerator: accelerator('resetZoom') },
        { role: 'zoomIn', label: '放大', accelerator: accelerator('zoomIn') },
        { role: 'zoomOut', label: '缩小', accelerator: accelerator('zoomOut') },
        { type: 'separator' },
        { role: 'toggleDevTools', label: '开发者工具', accelerator: accelerator('toggleDevTools') },
        { role: 'togglefullscreen', label: '进入全屏', accelerator: accelerator('toggleFullScreen') }
      ]
    },
    {
      label: '窗口',
      submenu: [
        { role: 'minimize', label: '最小化', accelerator: accelerator('minimize') },
        { label: '收进托盘', accelerator: 'Alt+Cmd+M', click: () => hosts.hideMainWindow() },
        { type: 'separator' },
        { role: 'front', label: '前置全部窗口' }
      ]
    }
  ]
}
