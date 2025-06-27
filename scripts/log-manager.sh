#!/bin/bash

# 日志管理脚本
# 用法: ./scripts/log-manager.sh [clean|rotate|status|setup]

LOGS_DIR="${LOGS_DIR:-./logs}"
MAX_LOG_FILES=10
MAX_LOG_SIZE="50M"
MAX_LOG_AGE=30  # 天

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查并创建日志目录
setup_logs_dir() {
    if [ ! -d "$LOGS_DIR" ]; then
        log_info "创建日志目录: $LOGS_DIR"
        mkdir -p "$LOGS_DIR"
        chmod 755 "$LOGS_DIR"
        log_success "日志目录创建成功"
    else
        log_info "日志目录已存在: $LOGS_DIR"
    fi
    
    # 创建 logrotate 配置
    create_logrotate_config
}

# 创建 logrotate 配置文件
create_logrotate_config() {
    LOGROTATE_CONFIG="$LOGS_DIR/logrotate.conf"
    
    cat > "$LOGROTATE_CONFIG" << EOF
# xHN 日志轮转配置
$LOGS_DIR/*.log {
    daily
    rotate $MAX_LOG_FILES
    size $MAX_LOG_SIZE
    compress
    delaycompress
    missingok
    notifempty
    create 644 $(whoami) $(id -gn)
    copytruncate
}
EOF
    
    log_success "Logrotate 配置文件已创建: $LOGROTATE_CONFIG"
}

# 获取日志状态
log_status() {
    log_info "=== 日志状态报告 ==="
    echo
    
    if [ ! -d "$LOGS_DIR" ]; then
        log_warning "日志目录不存在: $LOGS_DIR"
        return 1
    fi
    
    # 统计日志文件
    local total_files=$(find "$LOGS_DIR" -name "*.log*" -type f | wc -l)
    local total_size=$(du -sh "$LOGS_DIR" 2>/dev/null | cut -f1)
    
    echo "📁 日志目录: $LOGS_DIR"
    echo "📊 总文件数: $total_files"
    echo "💾 总大小: $total_size"
    echo
    
    # 显示各类日志文件状态
    for log_type in "error" "combined" "access" "exceptions" "rejections"; do
        local log_file="$LOGS_DIR/$log_type.log"
        if [ -f "$log_file" ]; then
            local size=$(du -h "$log_file" | cut -f1)
            local lines=$(wc -l < "$log_file")
            local modified=$(stat -c %y "$log_file" 2>/dev/null || stat -f %Sm "$log_file" 2>/dev/null)
            echo "📄 $log_type.log: $size, $lines 行, 修改时间: $modified"
        fi
    done
    
    echo
    
    # 检查最近的错误
    local error_log="$LOGS_DIR/error.log"
    if [ -f "$error_log" ] && [ -s "$error_log" ]; then
        log_warning "最近的错误日志 (最后 5 条):"
        tail -n 5 "$error_log" | while read line; do
            echo "  ❌ $line"
        done
        echo
    fi
    
    # 检查磁盘使用情况
    local disk_usage=$(df -h "$LOGS_DIR" | tail -1 | awk '{print $5}' | sed 's/%//')
    if [ "$disk_usage" -gt 90 ]; then
        log_error "磁盘使用率过高: ${disk_usage}%"
    elif [ "$disk_usage" -gt 80 ]; then
        log_warning "磁盘使用率较高: ${disk_usage}%"
    else
        log_success "磁盘使用率正常: ${disk_usage}%"
    fi
}

# 清理旧日志
clean_logs() {
    log_info "开始清理旧日志文件..."
    
    if [ ! -d "$LOGS_DIR" ]; then
        log_error "日志目录不存在: $LOGS_DIR"
        return 1
    fi
    
    local cleaned_count=0
    local freed_space=0
    
    # 删除超过指定天数的日志文件
    while IFS= read -r -d '' file; do
        local size=$(du -k "$file" | cut -f1)
        rm "$file"
        cleaned_count=$((cleaned_count + 1))
        freed_space=$((freed_space + size))
        log_info "删除旧日志: $(basename "$file")"
    done < <(find "$LOGS_DIR" -name "*.log*" -type f -mtime +$MAX_LOG_AGE -print0)
    
    # 清理压缩的轮转日志，只保留最新的几个
    for log_type in "error" "combined" "access" "exceptions" "rejections"; do
        local count=0
        for file in "$LOGS_DIR/$log_type.log."*.gz; do
            [ -f "$file" ] || continue
            count=$((count + 1))
            if [ $count -gt $MAX_LOG_FILES ]; then
                local size=$(du -k "$file" | cut -f1)
                rm "$file"
                cleaned_count=$((cleaned_count + 1))
                freed_space=$((freed_space + size))
                log_info "删除旧压缩日志: $(basename "$file")"
            fi
        done
    done
    
    if [ $cleaned_count -gt 0 ]; then
        local freed_mb=$((freed_space / 1024))
        log_success "清理完成: 删除 $cleaned_count 个文件，释放 ${freed_mb}MB 空间"
    else
        log_info "没有需要清理的旧日志文件"
    fi
}

# 轮转日志
rotate_logs() {
    log_info "开始轮转日志文件..."
    
    if [ ! -d "$LOGS_DIR" ]; then
        log_error "日志目录不存在: $LOGS_DIR"
        return 1
    fi
    
    local rotated_count=0
    
    for log_type in "error" "combined" "access" "exceptions" "rejections"; do
        local log_file="$LOGS_DIR/$log_type.log"
        
        if [ -f "$log_file" ] && [ -s "$log_file" ]; then
            # 检查文件大小
            local size=$(du -k "$log_file" | cut -f1)
            local max_size_kb=$(echo "$MAX_LOG_SIZE" | sed 's/M//' | awk '{print $1 * 1024}')
            
            if [ $size -gt $max_size_kb ]; then
                local timestamp=$(date +"%Y%m%d_%H%M%S")
                local archived_file="$LOGS_DIR/$log_type.log.$timestamp"
                
                mv "$log_file" "$archived_file"
                touch "$log_file"
                chmod 644 "$log_file"
                
                # 压缩归档文件
                gzip "$archived_file"
                
                rotated_count=$((rotated_count + 1))
                log_success "轮转日志: $log_type.log -> $log_type.log.$timestamp.gz"
            fi
        fi
    done
    
    if [ $rotated_count -gt 0 ]; then
        log_success "日志轮转完成: 轮转了 $rotated_count 个文件"
    else
        log_info "没有需要轮转的日志文件"
    fi
}

# 实时查看日志
tail_logs() {
    local log_type="${1:-combined}"
    local log_file="$LOGS_DIR/$log_type.log"
    
    if [ ! -f "$log_file" ]; then
        log_error "日志文件不存在: $log_file"
        echo "可用的日志类型: error, combined, access, exceptions, rejections"
        return 1
    fi
    
    log_info "实时查看日志: $log_file (Ctrl+C 退出)"
    tail -f "$log_file"
}

# 搜索日志
search_logs() {
    local keyword="$1"
    local log_type="${2:-all}"
    
    if [ -z "$keyword" ]; then
        log_error "请提供搜索关键词"
        echo "用法: $0 search <关键词> [日志类型]"
        return 1
    fi
    
    log_info "搜索关键词: '$keyword'"
    
    if [ "$log_type" = "all" ]; then
        find "$LOGS_DIR" -name "*.log" -type f -exec grep -l "$keyword" {} \; | while read file; do
            echo
            log_info "在文件 $(basename "$file") 中找到:"
            grep --color=always -n "$keyword" "$file" | head -10
        done
    else
        local log_file="$LOGS_DIR/$log_type.log"
        if [ -f "$log_file" ]; then
            grep --color=always -n "$keyword" "$log_file"
        else
            log_error "日志文件不存在: $log_file"
        fi
    fi
}

# 主函数
main() {
    case "${1:-status}" in
        "setup")
            setup_logs_dir
            ;;
        "status")
            log_status
            ;;
        "clean")
            clean_logs
            ;;
        "rotate")
            rotate_logs
            ;;
        "tail")
            tail_logs "$2"
            ;;
        "search")
            search_logs "$2" "$3"
            ;;
        "help"|"-h"|"--help")
            echo "xHN 日志管理工具"
            echo
            echo "用法: $0 [命令] [参数]"
            echo
            echo "命令:"
            echo "  setup    - 设置日志目录和配置"
            echo "  status   - 显示日志状态"
            echo "  clean    - 清理旧日志文件"
            echo "  rotate   - 轮转大日志文件"
            echo "  tail     - 实时查看日志 [日志类型]"
            echo "  search   - 搜索日志内容 <关键词> [日志类型]"
            echo "  help     - 显示此帮助信息"
            echo
            echo "日志类型: error, combined, access, exceptions, rejections"
            echo
            echo "环境变量:"
            echo "  LOGS_DIR         - 日志目录 (默认: ./logs)"
            echo "  MAX_LOG_FILES    - 最大日志文件数 (默认: 10)"
            echo "  MAX_LOG_SIZE     - 最大日志文件大小 (默认: 50M)"
            echo "  MAX_LOG_AGE      - 日志保留天数 (默认: 30)"
            ;;
        *)
            log_error "未知命令: $1"
            echo "运行 '$0 help' 查看可用命令"
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"