#!/bin/bash

# 数据库管理脚本
# 用法: ./scripts/db-manager.sh [command]

set -e

# 加载环境变量
if [ -f .env.docker ]; then
    export $(cat .env.docker | grep -v '#' | xargs)
else
    echo "警告: .env.docker 文件不存在，使用默认配置"
    export POSTGRES_USER=${POSTGRES_USER:-hacknews_user}
    export POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-hacknews_password}
    export POSTGRES_DATABASE=${POSTGRES_DATABASE:-hacknews_cn}
    export POSTGRES_PORT=${POSTGRES_PORT:-5432}
fi

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查 Docker 是否运行
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker 未运行，请先启动 Docker"
        exit 1
    fi
}

# 启动数据库
start_db() {
    print_info "启动 PostgreSQL 数据库..."
    docker-compose up -d postgres
    
    # 等待数据库启动
    print_info "等待数据库启动完成..."
    for i in {1..30}; do
        if docker-compose exec postgres pg_isready -U "$POSTGRES_USER" > /dev/null 2>&1; then
            print_info "数据库启动完成!"
            return 0
        fi
        sleep 1
    done
    
    print_error "数据库启动超时"
    exit 1
}

# 停止数据库
stop_db() {
    print_info "停止 PostgreSQL 数据库..."
    docker-compose stop postgres
    print_info "数据库已停止"
}

# 重启数据库
restart_db() {
    print_info "重启 PostgreSQL 数据库..."
    docker-compose restart postgres
    print_info "数据库已重启"
}

# 连接到数据库
connect_db() {
    print_info "连接到数据库..."
    docker-compose exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DATABASE"
}

# 查看数据库状态
status_db() {
    print_info "数据库状态:"
    echo "用户名: $POSTGRES_USER"
    echo "数据库: $POSTGRES_DATABASE"
    echo "端口: $POSTGRES_PORT"
    echo ""
    
    if docker-compose ps postgres | grep -q "Up"; then
        print_info "数据库状态: 运行中"
        
        # 检查连接
        if docker-compose exec postgres pg_isready -U "$POSTGRES_USER" > /dev/null 2>&1; then
            print_info "连接状态: 正常"
        else
            print_warning "连接状态: 无法连接"
        fi
    else
        print_warning "数据库状态: 未运行"
    fi
}

# 备份数据库
backup_db() {
    local backup_file="backup_$(date +%Y%m%d_%H%M%S).sql"
    print_info "备份数据库到: $backup_file"
    
    docker-compose exec postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DATABASE" > "$backup_file"
    print_info "备份完成: $backup_file"
}

# 恢复数据库
restore_db() {
    if [ -z "$1" ]; then
        print_error "请指定备份文件: ./scripts/db-manager.sh restore <backup_file>"
        exit 1
    fi
    
    local backup_file="$1"
    if [ ! -f "$backup_file" ]; then
        print_error "备份文件不存在: $backup_file"
        exit 1
    fi
    
    print_warning "这将覆盖当前数据库中的所有数据，是否继续? (y/N)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        print_info "操作已取消"
        exit 0
    fi
    
    print_info "恢复数据库从: $backup_file"
    docker-compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DATABASE" < "$backup_file"
    print_info "恢复完成"
}

# 重置数据库
reset_db() {
    print_warning "这将删除所有数据并重新初始化数据库，是否继续? (y/N)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        print_info "操作已取消"
        exit 0
    fi
    
    print_info "重置数据库..."
    docker-compose exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DATABASE" -c "
        DROP SCHEMA public CASCADE;
        CREATE SCHEMA public;
        GRANT ALL ON SCHEMA public TO $POSTGRES_USER;
        GRANT ALL ON SCHEMA public TO public;
    "
    print_info "数据库已重置，请重新初始化"
}

# 显示帮助
show_help() {
    echo "数据库管理脚本"
    echo ""
    echo "用法: $0 [command]"
    echo ""
    echo "命令:"
    echo "  start      启动数据库"
    echo "  stop       停止数据库"
    echo "  restart    重启数据库"
    echo "  status     显示数据库状态"
    echo "  connect    连接到数据库"
    echo "  backup     备份数据库"
    echo "  restore    恢复数据库 (需要指定备份文件)"
    echo "  reset      重置数据库 (危险操作)"
    echo "  help       显示帮助"
    echo ""
    echo "示例:"
    echo "  $0 start"
    echo "  $0 backup"
    echo "  $0 restore backup_20240101_120000.sql"
}

# 主逻辑
case "${1:-help}" in
    start)
        check_docker
        start_db
        ;;
    stop)
        check_docker
        stop_db
        ;;
    restart)
        check_docker
        restart_db
        ;;
    status)
        check_docker
        status_db
        ;;
    connect)
        check_docker
        connect_db
        ;;
    backup)
        check_docker
        backup_db
        ;;
    restore)
        check_docker
        restore_db "$2"
        ;;
    reset)
        check_docker
        reset_db
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "未知命令: $1"
        echo ""
        show_help
        exit 1
        ;;
esac