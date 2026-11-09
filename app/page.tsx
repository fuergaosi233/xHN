import HomeFeed, { InitialFeed } from '@/components/HomeFeed'
import { snapshotStore, sliceSnapshot } from '@/lib/snapshot'

// 每次请求都读内存里的榜单快照（几毫秒），首屏 HTML 直接带内容
export const dynamic = 'force-dynamic'

async function loadInitial(): Promise<InitialFeed | null> {
  try {
    // 冷启动且库里也没有持久化快照时最多等 4 秒，超时就交给前端加载
    const snap = await Promise.race([
      snapshotStore.get('top'),
      new Promise<null>(resolve => setTimeout(() => resolve(null), 4000)),
    ])
    if (!snap) return null
    const { data, hasMore } = sliceSnapshot(snap, 0, 20)
    return { type: 'top', data, hasMore, processing: snap.queue.pending + snap.queue.processing }
  } catch {
    return null
  }
}

export default async function Page() {
  return <HomeFeed initial={await loadInitial()} />
}
