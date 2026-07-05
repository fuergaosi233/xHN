// 仅在 Node.js 运行时加载：启动常驻队列 worker 与定期清理任务，
// 替代旧的"请求内 fire-and-forget 处理器"模式（适用于 Railway / Docker / k8s 长驻部署）
import { queueManager } from './lib/queue'
import { cleanupExpiredCache } from './lib/db'
import { log } from './lib/logger'

if (process.env.DISABLE_QUEUE_WORKER !== 'true') {
  // 常驻 worker：轮询领取任务（原子领取，多副本安全）
  queueManager.startWorker().catch(error => {
    log.error('Queue worker crashed', { error: error instanceof Error ? error : new Error(String(error)) })
  })

  // 每小时清理过期缓存，每天清理 7 天前的旧队列任务
  setInterval(() => {
    cleanupExpiredCache().catch(() => {})
  }, 60 * 60 * 1000)

  setInterval(() => {
    queueManager.cleanupOldTasks(7).catch(() => {})
  }, 24 * 60 * 60 * 1000)

  log.info('Instrumentation registered: queue worker and cleanup timers started')
}

export {}
