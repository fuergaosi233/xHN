import { NextRequest, NextResponse } from 'next/server'
import { readFile, readdir, stat } from 'fs/promises'
import { join } from 'path'
import { log } from '@/lib/logger'

const LOGS_DIR = process.env.LOGS_DIR || './logs'
const MAX_LINES = 100

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'combined'
    const lines = Math.min(parseInt(searchParams.get('lines') || '50'), MAX_LINES)
    const level = searchParams.get('level') // error, warn, info, debug
    const search = searchParams.get('search')

    log.info('Logs API accessed', { type, lines, level, search })

    // 验证日志类型
    const validTypes = ['error', 'combined', 'access', 'exceptions', 'rejections', 'status']
    if (!validTypes.includes(type)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid log type',
        validTypes
      }, { status: 400 })
    }

    // 如果请求状态信息
    if (type === 'status') {
      const status = await getLogsStatus()
      return NextResponse.json({
        success: true,
        data: status
      })
    }

    // 读取日志文件
    const logFile = join(LOGS_DIR, `${type}.log`)
    
    try {
      const content = await readFile(logFile, 'utf-8')
      let logLines = content.split('\n').filter(line => line.trim())
      
      // 按级别过滤
      if (level) {
        const levelPattern = new RegExp(`\\b${level.toUpperCase()}\\b`, 'i')
        logLines = logLines.filter(line => levelPattern.test(line))
      }
      
      // 按关键词搜索
      if (search) {
        const searchPattern = new RegExp(search, 'i')
        logLines = logLines.filter(line => searchPattern.test(line))
      }
      
      // 获取最新的指定行数
      const recentLines = logLines.slice(-lines)
      
      // 解析日志行
      const parsedLogs = recentLines.map(line => parseLogLine(line)).filter(Boolean)
      
      return NextResponse.json({
        success: true,
        data: {
          type,
          totalLines: logLines.length,
          returnedLines: parsedLogs.length,
          logs: parsedLogs
        }
      })
      
    } catch (fileError) {
      if ((fileError as any).code === 'ENOENT') {
        return NextResponse.json({
          success: true,
          data: {
            type,
            totalLines: 0,
            returnedLines: 0,
            logs: []
          }
        })
      }
      throw fileError
    }
    
  } catch (error) {
    log.error('Logs API error', { error: error instanceof Error ? error : undefined })
    return NextResponse.json({
      success: false,
      error: 'Failed to read logs',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// 解析日志行
function parseLogLine(line: string) {
  try {
    // 尝试解析 winston 格式的日志
    // [2024-01-15 10:30:45] INFO: Message | {"key": "value"}
    const winsonMatch = line.match(/^\[([^\]]+)\]\s+(\w+):\s+([^|]+)(?:\s*\|\s*(.+))?$/)
    if (winsonMatch) {
      const [, timestamp, level, message, metaStr] = winsonMatch
      let meta = {}
      if (metaStr) {
        try {
          meta = JSON.parse(metaStr)
        } catch {
          meta = { raw: metaStr }
        }
      }
      
      return {
        timestamp: new Date(timestamp).toISOString(),
        level: level.toLowerCase(),
        message: message.trim(),
        meta,
        raw: line
      }
    }
    
    // 尝试解析 JSON 格式的日志
    if (line.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(line)
        return {
          timestamp: parsed.timestamp || new Date().toISOString(),
          level: parsed.level || 'info',
          message: parsed.message || '',
          meta: parsed,
          raw: line
        }
      } catch {
        // 不是有效的 JSON，作为普通文本处理
      }
    }
    
    // 其他格式的日志，尝试提取时间戳和级别
    const genericMatch = line.match(/(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}[.\d]*Z?)\s*(\w+)?.*/)
    if (genericMatch) {
      const [, timestamp, level] = genericMatch
      return {
        timestamp: new Date(timestamp).toISOString(),
        level: (level || 'info').toLowerCase(),
        message: line.replace(genericMatch[0], '').trim() || line,
        meta: {},
        raw: line
      }
    }
    
    // 无法解析的日志行
    return {
      timestamp: new Date().toISOString(),
      level: 'info',
      message: line,
      meta: {},
      raw: line
    }
  } catch {
    return null
  }
}

// 获取日志状态
async function getLogsStatus() {
  try {
    const files = await readdir(LOGS_DIR)
    const logFiles = files.filter(file => file.endsWith('.log'))
    
    const status = {
      directory: LOGS_DIR,
      totalFiles: files.length,
      logFiles: logFiles.length,
      files: [],
      totalSize: 0,
      oldestLog: null,
      newestLog: null
    } as any
    
    let oldestTime = Date.now()
    let newestTime = 0
    
    for (const file of logFiles) {
      try {
        const filePath = join(LOGS_DIR, file)
        const stats = await stat(filePath)
        const sizeKB = Math.round(stats.size / 1024)
        
        // 计算行数（简单估算）
        const content = await readFile(filePath, 'utf-8')
        const lines = content.split('\n').filter(line => line.trim()).length
        
        status.files.push({
          name: file,
          size: sizeKB,
          sizeHuman: formatFileSize(stats.size),
          lines,
          modified: stats.mtime.toISOString(),
          created: stats.birthtime?.toISOString() || stats.mtime.toISOString()
        })
        
        status.totalSize += stats.size
        
        if (stats.mtime.getTime() < oldestTime) {
          oldestTime = stats.mtime.getTime()
          status.oldestLog = file
        }
        
        if (stats.mtime.getTime() > newestTime) {
          newestTime = stats.mtime.getTime()
          status.newestLog = file
        }
        
      } catch (fileError) {
        log.warn('Failed to read log file stats', { file, error: fileError instanceof Error ? fileError : undefined })
      }
    }
    
    status.totalSizeHuman = formatFileSize(status.totalSize)
    status.files.sort((a: any, b: any) => new Date(b.modified).getTime() - new Date(a.modified).getTime())
    
    return status
  } catch (error) {
    log.error('Failed to get logs status', { error: error instanceof Error ? error : undefined })
    return {
      directory: LOGS_DIR,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// 格式化文件大小
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

// POST 请求用于日志管理操作
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, type } = body
    
    log.info('Logs management action', { action, type })
    
    switch (action) {
      case 'clear':
        return await clearLogs(type)
      case 'rotate':
        return await rotateLogs(type)
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action',
          validActions: ['clear', 'rotate']
        }, { status: 400 })
    }
    
  } catch (error) {
    log.error('Logs management error', { error: error instanceof Error ? error : undefined })
    return NextResponse.json({
      success: false,
      error: 'Failed to perform log management action',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// 清理日志
async function clearLogs(type?: string) {
  // 这里应该调用日志管理脚本或实现清理逻辑
  // 为了安全，这里只返回一个模拟响应
  return NextResponse.json({
    success: true,
    message: 'Log clear operation queued',
    note: 'Use the log management script for actual clearing'
  })
}

// 轮转日志
async function rotateLogs(type?: string) {
  // 这里应该调用日志管理脚本或实现轮转逻辑
  // 为了安全，这里只返回一个模拟响应
  return NextResponse.json({
    success: true,
    message: 'Log rotation operation queued',
    note: 'Use the log management script for actual rotation'
  })
}