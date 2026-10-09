/**
 * 主进程侧唯一的平台判定点。渲染层不看这个文件，它读 preload 暴露的 isMac
 * （见 src/shared/workPlanApi.ts）。
 *
 * 放在 infrastructure 而不是 shared：src/shared 归 tsconfig.web，那边 lib 只有 DOM、
 * 没有 types:["node"]，`process` 不是声明过的全局，写进 shared 会让 npm run typecheck 挂。
 */
export const IS_MAC = process.platform === 'darwin'
