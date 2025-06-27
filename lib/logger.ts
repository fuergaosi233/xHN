import winston from 'winston'
import path from 'path'

// 日志级别定义
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn', 
  INFO = 'info',
  DEBUG = 'debug'
}

// 日志上下文接口
export interface LogContext {
  storyId?: number
  userId?: string
  operation?: string
  model?: string
  duration?: number
  url?: string
  error?: Error
  [key: string]: any
}

// 自定义日志格式
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length > 0 ? ` | ${JSON.stringify(meta)}` : ''
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`
  })
)

// 开发环境格式（彩色输出）
const devFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta, null, 2)}` : ''
    return `[${timestamp}] ${level}: ${message}${metaStr}`
  })
)

// 日志传输配置
const transports: winston.transport[] = []

// 控制台传输（开发环境）
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      format: devFormat,
      level: process.env.LOG_LEVEL || 'debug'
    })
  )
} else {
  // 生产环境控制台输出（简化格式）
  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      level: process.env.LOG_LEVEL || 'info'
    })
  )
}

// 文件传输（生产环境）
if (process.env.NODE_ENV === 'production') {
  const logsDir = process.env.LOGS_DIR || './logs'
  
  // 错误日志
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: customFormat,
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 5
    })
  )
  
  // 综合日志
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format: customFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10
    })
  )
  
  // API 访问日志
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'access.log'),
      level: 'info',
      format: customFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5
    })
  )
}

// 创建 winston logger 实例
const winstonLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  transports,
  // 异常处理
  exceptionHandlers: [
    new winston.transports.File({ 
      filename: process.env.NODE_ENV === 'production' 
        ? path.join(process.env.LOGS_DIR || './logs', 'exceptions.log')
        : './exceptions.log'
    })
  ],
  // 拒绝处理的 Promise
  rejectionHandlers: [
    new winston.transports.File({ 
      filename: process.env.NODE_ENV === 'production'
        ? path.join(process.env.LOGS_DIR || './logs', 'rejections.log') 
        : './rejections.log'
    })
  ]
})

// 统一日志接口类
class Logger {
  private static instance: Logger
  private logger: winston.Logger

  private constructor() {
    this.logger = winstonLogger
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger()
    }
    return Logger.instance
  }

  // 错误日志
  error(message: string, context?: LogContext): void {
    this.logger.error(message, context)
  }

  // 警告日志
  warn(message: string, context?: LogContext): void {
    this.logger.warn(message, context)
  }

  // 信息日志
  info(message: string, context?: LogContext): void {
    this.logger.info(message, context)
  }

  // 调试日志
  debug(message: string, context?: LogContext): void {
    this.logger.debug(message, context)
  }

  // API 请求日志
  apiRequest(method: string, url: string, context?: LogContext): void {
    this.info(`API ${method} ${url}`, {
      type: 'api_request',
      method,
      url,
      ...context
    })
  }

  // API 响应日志
  apiResponse(method: string, url: string, statusCode: number, duration: number, context?: LogContext): void {
    const level = statusCode >= 400 ? 'warn' : 'info'
    this.logger.log(level, `API ${method} ${url} ${statusCode} ${duration}ms`, {
      type: 'api_response',
      method,
      url,
      statusCode,
      duration,
      ...context
    })
  }

  // 数据库操作日志
  database(operation: string, table: string, context?: LogContext): void {
    this.debug(`DB ${operation} ${table}`, {
      type: 'database',
      operation,
      table,
      ...context
    })
  }

  // AI 处理日志
  aiProcess(model: string, operation: string, context?: LogContext): void {
    this.info(`AI ${model} ${operation}`, {
      type: 'ai_process',
      model,
      operation,
      ...context
    })
  }

  // 队列操作日志
  queue(action: string, context?: LogContext): void {
    this.info(`Queue ${action}`, {
      type: 'queue',
      action,
      ...context
    })
  }

  // WebSocket 连接日志
  websocket(event: string, context?: LogContext): void {
    this.info(`WebSocket ${event}`, {
      type: 'websocket',
      event,
      ...context
    })
  }

  // 缓存操作日志
  cache(operation: string, key: string, context?: LogContext): void {
    this.debug(`Cache ${operation} ${key}`, {
      type: 'cache',
      operation,
      key,
      ...context
    })
  }

  // 性能监控日志
  performance(operation: string, duration: number, context?: LogContext): void {
    const level = duration > 5000 ? 'warn' : duration > 2000 ? 'info' : 'debug'
    this.logger.log(level, `Performance ${operation} ${duration}ms`, {
      type: 'performance',
      operation,
      duration,
      ...context
    })
  }

  // 安全相关日志
  security(event: string, context?: LogContext): void {
    this.warn(`Security ${event}`, {
      type: 'security',
      event,
      ...context
    })
  }
}

// 导出单例实例
export const logger = Logger.getInstance()

// 导出便捷方法（兼容原有 console.log 使用习惯）
export const log = {
  error: (message: string, context?: LogContext) => logger.error(message, context),
  warn: (message: string, context?: LogContext) => logger.warn(message, context), 
  info: (message: string, context?: LogContext) => logger.info(message, context),
  debug: (message: string, context?: LogContext) => logger.debug(message, context),
  
  // 专用方法
  api: {
    request: (method: string, url: string, context?: LogContext) => logger.apiRequest(method, url, context),
    response: (method: string, url: string, statusCode: number, duration: number, context?: LogContext) => 
      logger.apiResponse(method, url, statusCode, duration, context)
  },
  
  db: (operation: string, table: string, context?: LogContext) => logger.database(operation, table, context),
  ai: (model: string, operation: string, context?: LogContext) => logger.aiProcess(model, operation, context),
  queue: (action: string, context?: LogContext) => logger.queue(action, context),
  ws: (event: string, context?: LogContext) => logger.websocket(event, context),
  cache: (operation: string, key: string, context?: LogContext) => logger.cache(operation, key, context),
  perf: (operation: string, duration: number, context?: LogContext) => logger.performance(operation, duration, context),
  security: (event: string, context?: LogContext) => logger.security(event, context)
}

// 中间件：API 请求日志
export function apiLogMiddleware(req: any, res: any, next: any) {
  const start = Date.now()
  const { method, url } = req
  
  logger.apiRequest(method, url, {
    userAgent: req.headers?.['user-agent'],
    ip: req.ip || req.connection?.remoteAddress
  })
  
  res.on('finish', () => {
    const duration = Date.now() - start
    logger.apiResponse(method, url, res.statusCode, duration)
  })
  
  if (next) next()
}

// 性能计时装饰器
export function performanceLog(operation: string) {
  return function(target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value
    
    descriptor.value = async function(...args: any[]) {
      const start = Date.now()
      try {
        const result = await method.apply(this, args)
        const duration = Date.now() - start
        logger.performance(`${operation}:${propertyName}`, duration)
        return result
      } catch (error) {
        const duration = Date.now() - start
        logger.performance(`${operation}:${propertyName}:ERROR`, duration, { error })
        throw error
      }
    }
  }
}

// 错误捕获装饰器
export function errorLog(context?: string) {
  return function(target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value
    
    descriptor.value = async function(...args: any[]) {
      try {
        return await method.apply(this, args)
      } catch (error) {
        logger.error(`${context || 'Error'} in ${propertyName}`, { 
          error,
          args: args.length > 0 ? args : undefined
        })
        throw error
      }
    }
  }
}

export default logger