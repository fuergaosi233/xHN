// Next.js instrumentation hook：进程启动时执行一次。
// 必须用「运行时判断 + 动态导入独立文件」的形式，
// 否则 Node 专用依赖（pg/jsdom/winston）会被打进 edge bundle 导致构建失败
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./instrumentation-node')
  }
}
