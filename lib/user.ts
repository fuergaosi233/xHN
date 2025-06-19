// 用户状态管理 - 为 SSO 集成做准备

export interface User {
  id: string
  email: string
  name: string
  avatar?: string
}

export interface UserPreferences {
  likedStories: Set<number>
  bookmarkedStories: Set<number>
  // 可以添加更多偏好设置，如主题、语言等
}

class UserManager {
  private user: User | null = null
  private preferences: UserPreferences = {
    likedStories: new Set(),
    bookmarkedStories: new Set(),
  }

  // 从 localStorage 恢复状态
  constructor() {
    if (typeof window !== 'undefined') {
      this.loadPreferences()
    }
  }

  private loadPreferences() {
    try {
      const saved = localStorage.getItem('userPreferences')
      if (saved) {
        const data = JSON.parse(saved)
        this.preferences = {
          likedStories: new Set(data.likedStories || []),
          bookmarkedStories: new Set(data.bookmarkedStories || []),
        }
      }
    } catch (error) {
      console.error('Failed to load user preferences:', error)
    }
  }

  private savePreferences() {
    try {
      const data = {
        likedStories: Array.from(this.preferences.likedStories),
        bookmarkedStories: Array.from(this.preferences.bookmarkedStories),
      }
      localStorage.setItem('userPreferences', JSON.stringify(data))
    } catch (error) {
      console.error('Failed to save user preferences:', error)
    }
  }

  // 点赞相关方法
  isLiked(storyId: number): boolean {
    return this.preferences.likedStories.has(storyId)
  }

  toggleLike(storyId: number): boolean {
    const isCurrentlyLiked = this.preferences.likedStories.has(storyId)
    
    if (isCurrentlyLiked) {
      this.preferences.likedStories.delete(storyId)
    } else {
      this.preferences.likedStories.add(storyId)
    }
    
    this.savePreferences()
    return !isCurrentlyLiked
  }

  // 收藏相关方法
  isBookmarked(storyId: number): boolean {
    return this.preferences.bookmarkedStories.has(storyId)
  }

  toggleBookmark(storyId: number): boolean {
    const isCurrentlyBookmarked = this.preferences.bookmarkedStories.has(storyId)
    
    if (isCurrentlyBookmarked) {
      this.preferences.bookmarkedStories.delete(storyId)
    } else {
      this.preferences.bookmarkedStories.add(storyId)
    }
    
    this.savePreferences()
    return !isCurrentlyBookmarked
  }

  // 获取用户数据
  getUser(): User | null {
    return this.user
  }

  setUser(user: User | null) {
    this.user = user
    // TODO: 在集成 SSO 后，这里可以同步服务器端的用户偏好
  }

  // 获取收藏的文章列表
  getBookmarkedStories(): number[] {
    return Array.from(this.preferences.bookmarkedStories)
  }

  // 获取点赞的文章列表
  getLikedStories(): number[] {
    return Array.from(this.preferences.likedStories)
  }

  // 清除所有本地数据（登出时使用）
  clearLocalData() {
    this.user = null
    this.preferences = {
      likedStories: new Set(),
      bookmarkedStories: new Set(),
    }
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('userPreferences')
    }
  }

  // 获取统计信息
  getStats() {
    return {
      totalLiked: this.preferences.likedStories.size,
      totalBookmarked: this.preferences.bookmarkedStories.size,
    }
  }
}

// 单例实例
export const userManager = new UserManager()

// React Hook 形式的接口（为未来的状态管理做准备）
export function useUser() {
  return {
    user: userManager.getUser(),
    isAuthenticated: !!userManager.getUser(),
    stats: userManager.getStats(),
  }
}

export function useStoryActions() {
  return {
    isLiked: (storyId: number) => userManager.isLiked(storyId),
    isBookmarked: (storyId: number) => userManager.isBookmarked(storyId),
    toggleLike: (storyId: number) => userManager.toggleLike(storyId),
    toggleBookmark: (storyId: number) => userManager.toggleBookmark(storyId),
  }
}

// TODO: SSO 集成点
// 1. 添加登录/登出方法
// 2. 与服务器同步用户偏好
// 3. 支持多设备同步
// 4. 添加用户认证中间件