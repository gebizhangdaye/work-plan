import { Menu } from 'electron'
import { buildDarwinMenuTemplate, type DarwinMenuHosts } from '../../infrastructure/menu/darwinMenuTemplate'
import { IS_MAC } from '../../infrastructure/platform/osPlatform'

/**
 * Windows：无边框窗口本来也不显示菜单栏，菜单只留标题栏那一份，原生那份整个撤掉 ——
 * 留着它就是同一套菜单两份定义（标签和快捷键会各自漂移）。置 null 之后，
 * Ctrl+C/V/X/Z/A 交回 Blink 在输入框里的默认行为，应用级快捷键由标题栏菜单自己监听。
 *
 * macOS：这一份撤不掉。撤了就没有 ⌘Q/⌘H/⌘M、没有窗口菜单，Edit 那几项也不再由系统判定
 * 启用状态，而且窗口一旦收进托盘就只剩设置弹窗里那一个退出入口。
 */
export function setupNativeMenu(hosts: DarwinMenuHosts): void {
  const template = IS_MAC ? Menu.buildFromTemplate(buildDarwinMenuTemplate(hosts)) : null
  Menu.setApplicationMenu(template)
}
