-- 管理端数据库表 - 完整版
-- 包含原始表结构和补充内容

-- 管理员认证相关表
CREATE TABLE admins (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    phone VARCHAR(20),
    status VARCHAR(20) DEFAULT 'active',
    last_login_at TIMESTAMP,
    login_count INTEGER DEFAULT 0,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE admin_tokens (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER REFERENCES admins(id),
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    device_name VARCHAR(100),
    device_type VARCHAR(20), -- 'mobile', 'desktop', 'tablet'
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 角色管理相关表
CREATE TABLE admin_roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT false,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE admin_permissions (
    id SERIAL PRIMARY KEY,
    code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    module VARCHAR(50) NOT NULL,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE admin_role_permissions (
    id SERIAL PRIMARY KEY,
    role_id INTEGER REFERENCES admin_roles(id),
    permission_id INTEGER REFERENCES admin_permissions(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role_id, permission_id)
);

CREATE TABLE admin_user_roles (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER REFERENCES admins(id),
    role_id INTEGER REFERENCES admin_roles(id),
    assigned_by INTEGER REFERENCES admins(id),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(admin_id, role_id)
);

-- 用户管理扩展表（补充前端用户表）
CREATE TABLE user_status_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    old_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    reason TEXT,
    changed_by INTEGER REFERENCES admins(id),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_roles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    role_name VARCHAR(50) NOT NULL,
    assigned_by INTEGER REFERENCES admins(id),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    version INTEGER DEFAULT 1
);

-- 账单管理扩展表
CREATE TABLE bill_admin_logs (
    id SERIAL PRIMARY KEY,
    bill_id INTEGER REFERENCES bills(id),
    admin_id INTEGER REFERENCES admins(id),
    action VARCHAR(100) NOT NULL,
    old_data JSONB,
    new_data JSONB,
    details JSONB,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 费用审核相关表
CREATE TABLE expense_reviews (
    id SERIAL PRIMARY KEY,
    expense_id INTEGER REFERENCES expenses(id),
    reviewer_id INTEGER REFERENCES admins(id),
    admin_id INTEGER REFERENCES admins(id),
    status VARCHAR(20) NOT NULL,
    review_notes TEXT,
    review_details JSONB,
    reviewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1
);

CREATE TABLE abnormal_expenses (
    id SERIAL PRIMARY KEY,
    expense_id INTEGER REFERENCES expenses(id),
    reason TEXT NOT NULL,
    severity VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(20) DEFAULT 'pending',
    detected_by INTEGER REFERENCES admins(id),
    resolved_by INTEGER REFERENCES admins(id),
    admin_id INTEGER REFERENCES admins(id),
    handling_details JSONB,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1
);

CREATE TABLE abnormal_expense_stats (
    id SERIAL PRIMARY KEY,
    stat_date DATE NOT NULL,
    total_count INTEGER DEFAULT 0,
    pending_count INTEGER DEFAULT 0,
    resolved_count INTEGER DEFAULT 0,
    high_severity_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(stat_date)
);

-- 系统设置相关表
CREATE TABLE system_configs (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    config_type VARCHAR(50) DEFAULT 'string',
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE feature_flags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_enabled BOOLEAN DEFAULT false,
    target_scope VARCHAR(20) DEFAULT 'global',
    target_value JSONB,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE maintenance_windows (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    affected_services JSONB,
    status VARCHAR(20) DEFAULT 'scheduled',
    created_by INTEGER REFERENCES admins(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE announcements (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    announcement_type VARCHAR(50) DEFAULT 'info',
    priority VARCHAR(20) DEFAULT 'normal',
    start_at TIMESTAMP,
    end_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES admins(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 操作日志相关表
CREATE TABLE admin_operation_logs (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER REFERENCES admins(id),
    operation_type VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id INTEGER,
    request_method VARCHAR(10),
    request_path VARCHAR(500),
    request_params JSONB,
    ip_address INET,
    user_agent TEXT,
    status_code INTEGER,
    response_time INTEGER,
    operation_result VARCHAR(20), -- 'success', 'failure', 'partial'
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE data_change_audits (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    record_id INTEGER NOT NULL,
    operation_type VARCHAR(20) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    changed_by INTEGER REFERENCES admins(id),
    ip_address INET,
    user_agent TEXT,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 批量任务与报表相关表
CREATE TABLE batch_jobs (
    id SERIAL PRIMARY KEY,
    job_type VARCHAR(100) NOT NULL,
    job_name VARCHAR(255) NOT NULL,
    description TEXT,
    parameters JSONB,
    status VARCHAR(20) DEFAULT 'pending',
    progress INTEGER DEFAULT 0,
    total_items INTEGER,
    processed_items INTEGER DEFAULT 0,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT,
    admin_id INTEGER REFERENCES admins(id),
    execution_details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1
);

CREATE TABLE report_definitions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    report_type VARCHAR(100) NOT NULL,
    query_sql TEXT,
    parameters_schema JSONB,
    schedule_cron VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES admins(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1
);

CREATE TABLE report_snapshots (
    id SERIAL PRIMARY KEY,
    report_definition_id INTEGER REFERENCES report_definitions(id),
    snapshot_data JSONB NOT NULL,
    parameters_used JSONB,
    admin_id INTEGER REFERENCES admins(id),
    generation_details JSONB,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE export_tasks (
    id SERIAL PRIMARY KEY,
    task_type VARCHAR(100) NOT NULL,
    file_name VARCHAR(255),
    file_format VARCHAR(20) NOT NULL,
    filters JSONB,
    status VARCHAR(20) DEFAULT 'pending',
    file_url VARCHAR(500),
    file_size INTEGER,
    admin_id INTEGER REFERENCES admins(id),
    export_details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    version INTEGER DEFAULT 1
);

-- 内容审核与工单相关表
CREATE TABLE moderation_queue (
    id SERIAL PRIMARY KEY,
    content_type VARCHAR(50) NOT NULL,
    content_id INTEGER NOT NULL,
    content_preview TEXT,
    reason TEXT,
    reported_by INTEGER REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'pending',
    assigned_to INTEGER REFERENCES admins(id),
    admin_id INTEGER REFERENCES admins(id),
    decision VARCHAR(20),
    decision_notes TEXT,
    review_details JSONB,
    decided_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1
);

CREATE TABLE support_tickets (
    id SERIAL PRIMARY KEY,
    ticket_number VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    ticket_type VARCHAR(50) NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(20) DEFAULT 'open',
    created_by INTEGER REFERENCES users(id),
    assigned_to INTEGER REFERENCES admins(id),
    admin_id INTEGER REFERENCES admins(id),
    handling_details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    version INTEGER DEFAULT 1
);

CREATE TABLE ticket_comments (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER REFERENCES support_tickets(id),
    author_id INTEGER, -- 可以是用户或管理员
    author_type VARCHAR(20) NOT NULL, -- 'user' 或 'admin'
    admin_id INTEGER REFERENCES admins(id),
    content TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT false,
    comment_details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1
);

-- 集成与回调相关表
CREATE TABLE webhooks (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    target_url VARCHAR(500) NOT NULL,
    secret_token VARCHAR(100),
    events JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES admins(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1
);

CREATE TABLE webhook_events (
    id SERIAL PRIMARY KEY,
    webhook_id INTEGER REFERENCES webhooks(id),
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    response_status INTEGER,
    response_body TEXT,
    attempts INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMP,
    processing_details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1
);

-- 争议管理扩展表
CREATE TABLE dispute_assignments (
    id SERIAL PRIMARY KEY,
    dispute_id INTEGER REFERENCES disputes(id),
    assigned_to INTEGER REFERENCES admins(id),
    assigned_by INTEGER REFERENCES admins(id),
    admin_id INTEGER REFERENCES admins(id),
    handling_details JSONB,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    version INTEGER DEFAULT 1
);

CREATE TABLE dispute_handling_logs (
    id SERIAL PRIMARY KEY,
    dispute_id INTEGER REFERENCES disputes(id),
    handled_by INTEGER REFERENCES admins(id),
    admin_id INTEGER REFERENCES admins(id),
    action VARCHAR(100) NOT NULL,
    notes TEXT,
    log_details JSONB,
    handled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 寝室管理扩展表（补充前端房间表）
CREATE TABLE dorm_admin_logs (
    id SERIAL PRIMARY KEY,
    room_id INTEGER REFERENCES rooms(id),
    admin_id INTEGER REFERENCES admins(id),
    action VARCHAR(100) NOT NULL,
    old_data JSONB,
    new_data JSONB,
    log_details JSONB,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE room_leaders (
    id SERIAL PRIMARY KEY,
    room_id INTEGER REFERENCES rooms(id),
    user_id INTEGER REFERENCES users(id),
    assigned_by INTEGER REFERENCES admins(id),
    admin_id INTEGER REFERENCES admins(id),
    appointment_date DATE,
    end_date DATE,
    appointment_reason TEXT,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1,
    UNIQUE(room_id)
);

-- 文档管理相关表
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    slug VARCHAR(100) UNIQUE,
    status VARCHAR(20) DEFAULT 'draft',
    version INTEGER DEFAULT 1,
    download_count INTEGER DEFAULT 0,
    last_downloaded_at TIMESTAMP,
    admin_id INTEGER REFERENCES admins(id),
    created_by INTEGER REFERENCES admins(id),
    updated_by INTEGER REFERENCES admins(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE document_histories (
    id SERIAL PRIMARY KEY,
    document_id INTEGER REFERENCES documents(id),
    version INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    admin_id INTEGER REFERENCES admins(id),
    history_details JSONB,
    changed_by INTEGER REFERENCES admins(id),
    change_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(document_id, version)
);

CREATE TABLE document_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE document_statistics (
    id SERIAL PRIMARY KEY,
    document_id INTEGER REFERENCES documents(id),
    view_count INTEGER DEFAULT 0,
    download_count INTEGER DEFAULT 0,
    last_viewed_at TIMESTAMP,
    last_downloaded_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE document_access_logs (
    id SERIAL PRIMARY KEY,
    document_id INTEGER REFERENCES documents(id),
    user_id INTEGER REFERENCES users(id),
    access_type VARCHAR(20) NOT NULL, -- 'view', 'download', etc.
    accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 补充表 - 管理员会话表
CREATE TABLE admin_sessions (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER REFERENCES admins(id),
    session_token VARCHAR(255) UNIQUE NOT NULL,
    device_name VARCHAR(100),
    device_type VARCHAR(20), -- 'mobile', 'desktop', 'tablet'
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL
);

-- 补充表 - 管理员权限变更历史表
CREATE TABLE admin_permission_history (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER REFERENCES admins(id),
    role_id INTEGER REFERENCES admin_roles(id),
    permission_id INTEGER REFERENCES admin_permissions(id),
    action VARCHAR(20) NOT NULL, -- 'grant', 'revoke'
    granted_by INTEGER REFERENCES admins(id),
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reason TEXT
);

-- 补充表 - 管理员操作限制表
CREATE TABLE admin_operation_restrictions (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER REFERENCES admins(id),
    operation_type VARCHAR(50) NOT NULL,
    restriction_type VARCHAR(20) NOT NULL, -- 'time_based', 'count_based', 'ip_based'
    restriction_config JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES admins(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 补充表 - 管理员操作统计表
CREATE TABLE admin_operation_statistics (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER REFERENCES admins(id),
    operation_date DATE NOT NULL,
    operation_type VARCHAR(50),
    operation_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(admin_id, operation_date, operation_type)
);

-- 补充表 - 系统性能监控表
CREATE TABLE system_performance_metrics (
    id SERIAL PRIMARY KEY,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,2) NOT NULL,
    metric_unit VARCHAR(20),
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    additional_data JSONB
);

-- 补充表 - 系统资源使用表
CREATE TABLE system_resource_usage (
    id SERIAL PRIMARY KEY,
    cpu_usage DECIMAL(5,2),
    memory_usage DECIMAL(5,2),
    disk_usage DECIMAL(5,2),
    network_in DECIMAL(15,2),
    network_out DECIMAL(15,2),
    active_connections INTEGER,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 补充表 - 系统错误日志表
CREATE TABLE system_error_logs (
    id SERIAL PRIMARY KEY,
    error_level VARCHAR(20) NOT NULL, -- 'debug', 'info', 'warning', 'error', 'critical'
    error_code VARCHAR(50),
    error_message TEXT NOT NULL,
    error_details JSONB,
    stack_trace TEXT,
    module VARCHAR(100),
    function_name VARCHAR(100),
    line_number INTEGER,
    admin_id INTEGER REFERENCES admins(id),
    user_id INTEGER,
    ip_address INET,
    user_agent TEXT,
    occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 补充表 - 系统审计日志表
CREATE TABLE system_audit_logs (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    event_category VARCHAR(50),
    event_description TEXT,
    event_data JSONB,
    admin_id INTEGER REFERENCES admins(id),
    user_id INTEGER,
    ip_address INET,
    user_agent TEXT,
    occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 补充表 - 数据备份记录表
CREATE TABLE data_backup_records (
    id SERIAL PRIMARY KEY,
    backup_name VARCHAR(255) NOT NULL,
    backup_type VARCHAR(20) NOT NULL, -- 'full', 'incremental', 'differential'
    backup_size BIGINT,
    backup_path VARCHAR(500),
    backup_status VARCHAR(20) NOT NULL, -- 'started', 'running', 'completed', 'failed'
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    backup_details JSONB,
    created_by INTEGER REFERENCES admins(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 补充表 - 数据恢复记录表
CREATE TABLE data_restore_records (
    id SERIAL PRIMARY KEY,
    restore_name VARCHAR(255) NOT NULL,
    backup_id INTEGER REFERENCES data_backup_records(id),
    restore_type VARCHAR(20) NOT NULL, -- 'full', 'partial', 'table'
    restore_status VARCHAR(20) NOT NULL, -- 'started', 'running', 'completed', 'failed'
    restore_tables JSONB,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    restore_details JSONB,
    created_by INTEGER REFERENCES admins(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 补充表 - 系统维护计划表
CREATE TABLE system_maintenance_plans (
    id SERIAL PRIMARY KEY,
    plan_name VARCHAR(255) NOT NULL,
    plan_type VARCHAR(20) NOT NULL, -- 'scheduled', 'emergency', 'routine'
    plan_description TEXT,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    affected_modules JSONB,
    maintenance_tasks JSONB,
    status VARCHAR(20) DEFAULT 'planned', -- 'planned', 'in_progress', 'completed', 'cancelled'
    notification_sent BOOLEAN DEFAULT false,
    created_by INTEGER REFERENCES admins(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 补充表 - 系统维护执行记录表
CREATE TABLE system_maintenance_executions (
    id SERIAL PRIMARY KEY,
    plan_id INTEGER REFERENCES system_maintenance_plans(id),
    task_name VARCHAR(255) NOT NULL,
    task_status VARCHAR(20) NOT NULL, -- 'pending', 'running', 'completed', 'failed'
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    execution_details JSONB,
    executed_by INTEGER REFERENCES admins(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 补充表 - 系统通知表
CREATE TABLE system_notifications (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(50) NOT NULL, -- 'info', 'warning', 'error', 'success'
    target_type VARCHAR(20) NOT NULL, -- 'all', 'admin', 'user', 'role'
    target_ids JSONB, -- 目标ID数组
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    created_by INTEGER REFERENCES admins(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

-- 补充表 - 系统通知阅读记录表
CREATE TABLE system_notification_reads (
    id SERIAL PRIMARY KEY,
    notification_id INTEGER REFERENCES system_notifications(id),
    admin_id INTEGER REFERENCES admins(id),
    user_id INTEGER,
    read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(notification_id, admin_id),
    UNIQUE(notification_id, user_id)
);

-- 补充表 - 系统配置变更历史表
CREATE TABLE system_config_history (
    id SERIAL PRIMARY KEY,
    config_id INTEGER REFERENCES system_configs(id),
    config_key VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_by INTEGER REFERENCES admins(id),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reason TEXT
);

-- 补充表 - 功能开关变更历史表
CREATE TABLE feature_flag_history (
    id SERIAL PRIMARY KEY,
    flag_id INTEGER REFERENCES feature_flags(id),
    flag_key VARCHAR(100) NOT NULL,
    old_enabled BOOLEAN,
    new_enabled BOOLEAN,
    old_config JSONB,
    new_config JSONB,
    changed_by INTEGER REFERENCES admins(id),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reason TEXT
);

-- 补充表 - 管理员登录历史表
CREATE TABLE admin_login_history (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER REFERENCES admins(id),
    login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT,
    login_type VARCHAR(20) DEFAULT 'password', -- 'password', 'oauth', 'sso'
    login_result VARCHAR(20) NOT NULL, -- 'success', 'failure'
    failure_reason VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 补充表 - 管理员设备表
CREATE TABLE admin_devices (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER REFERENCES admins(id),
    device_id VARCHAR(100) NOT NULL,
    device_name VARCHAR(100),
    device_type VARCHAR(20), -- 'mobile', 'desktop', 'tablet'
    platform VARCHAR(20), -- 'ios', 'android', 'windows', 'macos'
    is_trusted BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(admin_id, device_id)
);

-- 补充表 - 管理员安全设置表
CREATE TABLE admin_security_settings (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER REFERENCES admins(id),
    two_factor_enabled BOOLEAN DEFAULT false,
    two_factor_secret VARCHAR(255),
    backup_codes JSONB,
    password_change_required BOOLEAN DEFAULT false,
    password_last_changed_at TIMESTAMP,
    session_timeout_minutes INTEGER DEFAULT 60,
    ip_whitelist JSONB, -- 允许的IP地址数组
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(admin_id)
);

-- 补充表 - 管理员安全日志表
CREATE TABLE admin_security_logs (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER REFERENCES admins(id),
    event_type VARCHAR(50) NOT NULL, -- 'login', 'logout', 'password_change', '2fa_enabled', '2fa_disabled'
    event_details JSONB,
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN,
    failure_reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 补充表 - 系统API密钥表
CREATE TABLE system_api_keys (
    id SERIAL PRIMARY KEY,
    key_name VARCHAR(100) NOT NULL,
    api_key VARCHAR(255) UNIQUE NOT NULL,
    key_permissions JSONB, -- 权限数组
    key_type VARCHAR(20) NOT NULL, -- 'read', 'write', 'admin'
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP,
    last_used_at TIMESTAMP,
    usage_count INTEGER DEFAULT 0,
    created_by INTEGER REFERENCES admins(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 补充表 - 系统API使用记录表
CREATE TABLE system_api_usage_logs (
    id SERIAL PRIMARY KEY,
    api_key_id INTEGER REFERENCES system_api_keys(id),
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    request_ip INET,
    user_agent TEXT,
    request_size INTEGER,
    response_size INTEGER,
    response_status INTEGER,
    response_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 补充表 - 系统缓存统计表
CREATE TABLE system_cache_statistics (
    id SERIAL PRIMARY KEY,
    cache_name VARCHAR(100) NOT NULL,
    cache_type VARCHAR(50) NOT NULL, -- 'redis', 'memcached', 'memory'
    hit_count INTEGER DEFAULT 0,
    miss_count INTEGER DEFAULT 0,
    hit_rate DECIMAL(5,2),
    memory_usage BIGINT,
    key_count INTEGER,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 补充表 - 系统数据库统计表
CREATE TABLE system_database_statistics (
    id SERIAL PRIMARY KEY,
    database_name VARCHAR(100) NOT NULL,
    table_name VARCHAR(100),
    table_size BIGINT,
    index_size BIGINT,
    row_count BIGINT,
    avg_row_length INTEGER,
    auto_increment_value BIGINT,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 补充表 - 系统队列统计表
CREATE TABLE system_queue_statistics (
    id SERIAL PRIMARY KEY,
    queue_name VARCHAR(100) NOT NULL,
    pending_jobs INTEGER DEFAULT 0,
    processing_jobs INTEGER DEFAULT 0,
    completed_jobs INTEGER DEFAULT 0,
    failed_jobs INTEGER DEFAULT 0,
    avg_processing_time_ms INTEGER,
    max_processing_time_ms INTEGER,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 补充表 - 系统任务调度表
CREATE TABLE system_scheduled_tasks (
    id SERIAL PRIMARY KEY,
    task_name VARCHAR(100) NOT NULL,
    task_type VARCHAR(50) NOT NULL, -- 'cleanup', 'report', 'backup', 'notification'
    task_expression VARCHAR(100) NOT NULL, -- cron表达式
    task_config JSONB,
    is_active BOOLEAN DEFAULT true,
    last_run_at TIMESTAMP,
    next_run_at TIMESTAMP,
    run_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    created_by INTEGER REFERENCES admins(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 补充表 - 系统任务执行记录表
CREATE TABLE system_task_executions (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES system_scheduled_tasks(id),
    execution_status VARCHAR(20) NOT NULL, -- 'started', 'running', 'completed', 'failed'
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    execution_time_ms INTEGER,
    execution_details JSONB,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 补充表 - 系统健康检查表
CREATE TABLE system_health_checks (
    id SERIAL PRIMARY KEY,
    check_name VARCHAR(100) NOT NULL,
    check_type VARCHAR(50) NOT NULL, -- 'database', 'cache', 'queue', 'api', 'disk'
    check_status VARCHAR(20) NOT NULL, -- 'healthy', 'warning', 'critical'
    check_details JSONB,
    response_time_ms INTEGER,
    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 补充表 - 系统告警规则表
CREATE TABLE system_alert_rules (
    id SERIAL PRIMARY KEY,
    rule_name VARCHAR(100) NOT NULL,
    rule_type VARCHAR(50) NOT NULL, -- 'metric', 'log', 'error_rate', 'response_time'
    rule_condition JSONB NOT NULL,
    rule_threshold DECIMAL(15,2),
    rule_operator VARCHAR(10), -- '>', '<', '>=', '<=', '=', '!='
    rule_time_window INTEGER, -- 时间窗口（分钟）
    rule_severity VARCHAR(20) NOT NULL, -- 'info', 'warning', 'critical'
    is_active BOOLEAN DEFAULT true,
    notification_channels JSONB, -- 通知渠道数组
    created_by INTEGER REFERENCES admins(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 补充表 - 系统告警记录表
CREATE TABLE system_alerts (
    id SERIAL PRIMARY KEY,
    rule_id INTEGER REFERENCES system_alert_rules(id),
    alert_title VARCHAR(255) NOT NULL,
    alert_message TEXT,
    alert_severity VARCHAR(20) NOT NULL, -- 'info', 'warning', 'critical'
    alert_status VARCHAR(20) DEFAULT 'open', -- 'open', 'acknowledged', 'resolved'
    alert_data JSONB,
    triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    acknowledged_at TIMESTAMP,
    acknowledged_by INTEGER REFERENCES admins(id),
    resolved_at TIMESTAMP,
    resolved_by INTEGER REFERENCES admins(id)
);

-- 补充表 - 系统告警通知记录表
CREATE TABLE system_alert_notifications (
    id SERIAL PRIMARY KEY,
    alert_id INTEGER REFERENCES system_alerts(id),
    notification_channel VARCHAR(50) NOT NULL, -- 'email', 'sms', 'webhook', 'push'
    notification_target VARCHAR(255) NOT NULL,
    notification_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'failed'
    notification_content TEXT,
    sent_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引以提高查询性能
CREATE INDEX idx_admins_email ON admins(email);
CREATE INDEX idx_admins_username ON admins(username);
CREATE INDEX idx_admins_status ON admins(status);
CREATE INDEX idx_admins_last_login_at ON admins(last_login_at);
CREATE INDEX idx_admins_locked_until ON admins(locked_until);
CREATE INDEX idx_admin_tokens_admin_id ON admin_tokens(admin_id);
CREATE INDEX idx_admin_tokens_device_type ON admin_tokens(device_type);
CREATE INDEX idx_admin_tokens_ip_address ON admin_tokens(ip_address);
CREATE INDEX idx_admin_user_roles_admin_id ON admin_user_roles(admin_id);
CREATE INDEX idx_admin_user_roles_role_id ON admin_user_roles(role_id);
CREATE INDEX idx_admin_roles_version ON admin_roles(version);
CREATE INDEX idx_admin_permissions_version ON admin_permissions(version);
CREATE INDEX idx_user_roles_version ON user_roles(version);
CREATE INDEX idx_user_status_logs_admin_id ON user_status_logs(admin_id);
CREATE INDEX idx_expense_reviews_expense_id ON expense_reviews(expense_id);
CREATE INDEX idx_expense_reviews_status ON expense_reviews(status);
CREATE INDEX idx_expense_reviews_admin_id ON expense_reviews(admin_id);
CREATE INDEX idx_expense_reviews_version ON expense_reviews(version);
CREATE INDEX idx_abnormal_expenses_expense_id ON abnormal_expenses(expense_id);
CREATE INDEX idx_abnormal_expenses_status ON abnormal_expenses(status);
CREATE INDEX idx_abnormal_expenses_admin_id ON abnormal_expenses(admin_id);
CREATE INDEX idx_abnormal_expenses_version ON abnormal_expenses(version);
CREATE INDEX idx_bill_admin_logs_admin_id ON bill_admin_logs(admin_id);
CREATE INDEX idx_system_configs_version ON system_configs(version);
CREATE INDEX idx_feature_flags_version ON feature_flags(version);
CREATE INDEX idx_admin_operation_logs_admin_id ON admin_operation_logs(admin_id);
CREATE INDEX idx_admin_operation_logs_resource_type ON admin_operation_logs(resource_type);
CREATE INDEX idx_admin_operation_logs_created_at ON admin_operation_logs(created_at);
CREATE INDEX idx_admin_operation_logs_operation_result ON admin_operation_logs(operation_result);
CREATE INDEX idx_admin_operation_logs_ip_address ON admin_operation_logs(ip_address);
CREATE INDEX idx_data_change_audits_table_name ON data_change_audits(table_name);
CREATE INDEX idx_data_change_audits_record_id ON data_change_audits(record_id);
CREATE INDEX idx_data_change_audits_admin_id ON data_change_audits(admin_id);
CREATE INDEX idx_data_change_audits_ip_address ON data_change_audits(ip_address);
CREATE INDEX idx_batch_jobs_status ON batch_jobs(status);
CREATE INDEX idx_batch_jobs_created_at ON batch_jobs(created_at);
CREATE INDEX idx_batch_jobs_admin_id ON batch_jobs(admin_id);
CREATE INDEX idx_batch_jobs_version ON batch_jobs(version);
CREATE INDEX idx_report_definitions_version ON report_definitions(version);
CREATE INDEX idx_report_snapshots_admin_id ON report_snapshots(admin_id);
CREATE INDEX idx_export_tasks_admin_id ON export_tasks(admin_id);
CREATE INDEX idx_export_tasks_version ON export_tasks(version);
CREATE INDEX idx_moderation_queue_status ON moderation_queue(status);
CREATE INDEX idx_moderation_queue_content_type ON moderation_queue(content_type);
CREATE INDEX idx_moderation_queue_admin_id ON moderation_queue(admin_id);
CREATE INDEX idx_moderation_queue_version ON moderation_queue(version);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX idx_support_tickets_created_at ON support_tickets(created_at);
CREATE INDEX idx_support_tickets_admin_id ON support_tickets(admin_id);
CREATE INDEX idx_support_tickets_version ON support_tickets(version);
CREATE INDEX idx_ticket_comments_admin_id ON ticket_comments(admin_id);
CREATE INDEX idx_ticket_comments_version ON ticket_comments(version);
CREATE INDEX idx_webhooks_is_active ON webhooks(is_active);
CREATE INDEX idx_webhooks_version ON webhooks(version);
CREATE INDEX idx_webhook_events_version ON webhook_events(version);
CREATE INDEX idx_dispute_assignments_admin_id ON dispute_assignments(admin_id);
CREATE INDEX idx_dispute_assignments_version ON dispute_assignments(version);
CREATE INDEX idx_dispute_handling_logs_admin_id ON dispute_handling_logs(admin_id);
CREATE INDEX idx_dorm_admin_logs_admin_id ON dorm_admin_logs(admin_id);
CREATE INDEX idx_room_leaders_admin_id ON room_leaders(admin_id);
CREATE INDEX idx_room_leaders_version ON room_leaders(version);
CREATE INDEX idx_documents_document_type ON documents(document_type);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_slug ON documents(slug);
CREATE INDEX idx_documents_admin_id ON documents(admin_id);
CREATE INDEX idx_documents_version ON documents(version);
CREATE INDEX idx_document_histories_admin_id ON document_histories(admin_id);
CREATE INDEX idx_document_types_version ON document_types(version);
CREATE INDEX idx_admin_sessions_admin_id ON admin_sessions(admin_id);
CREATE INDEX idx_admin_sessions_session_token ON admin_sessions(session_token);
CREATE INDEX idx_admin_sessions_is_active ON admin_sessions(is_active);
CREATE INDEX idx_admin_sessions_expires_at ON admin_sessions(expires_at);
CREATE INDEX idx_admin_permission_history_admin_id ON admin_permission_history(admin_id);
CREATE INDEX idx_admin_permission_history_role_id ON admin_permission_history(role_id);
CREATE INDEX idx_admin_permission_history_permission_id ON admin_permission_history(permission_id);
CREATE INDEX idx_admin_permission_history_granted_by ON admin_permission_history(granted_by);
CREATE INDEX idx_admin_operation_restrictions_admin_id ON admin_operation_restrictions(admin_id);
CREATE INDEX idx_admin_operation_restrictions_is_active ON admin_operation_restrictions(is_active);
CREATE INDEX idx_admin_operation_statistics_admin_id ON admin_operation_statistics(admin_id);
CREATE INDEX idx_admin_operation_statistics_operation_date ON admin_operation_statistics(operation_date);
CREATE INDEX idx_admin_operation_statistics_operation_type ON admin_operation_statistics(operation_type);
CREATE INDEX idx_system_performance_metrics_metric_name ON system_performance_metrics(metric_name);
CREATE INDEX idx_system_performance_metrics_recorded_at ON system_performance_metrics(recorded_at);
CREATE INDEX idx_system_resource_usage_recorded_at ON system_resource_usage(recorded_at);
CREATE INDEX idx_system_error_logs_error_level ON system_error_logs(error_level);
CREATE INDEX idx_system_error_logs_admin_id ON system_error_logs(admin_id);
CREATE INDEX idx_system_error_logs_occurred_at ON system_error_logs(occurred_at);
CREATE INDEX idx_system_audit_logs_event_type ON system_audit_logs(event_type);
CREATE INDEX idx_system_audit_logs_admin_id ON system_audit_logs(admin_id);
CREATE INDEX idx_system_audit_logs_occurred_at ON system_audit_logs(occurred_at);
CREATE INDEX idx_data_backup_records_backup_type ON data_backup_records(backup_type);
CREATE INDEX idx_data_backup_records_backup_status ON data_backup_records(backup_status);
CREATE INDEX idx_data_backup_records_created_by ON data_backup_records(created_by);
CREATE INDEX idx_data_restore_records_backup_id ON data_restore_records(backup_id);
CREATE INDEX idx_data_restore_records_restore_type ON data_restore_records(restore_type);
CREATE INDEX idx_data_restore_records_restore_status ON data_restore_records(restore_status);
CREATE INDEX idx_data_restore_records_created_by ON data_restore_records(created_by);
CREATE INDEX idx_system_maintenance_plans_plan_type ON system_maintenance_plans(plan_type);
CREATE INDEX idx_system_maintenance_plans_status ON system_maintenance_plans(status);
CREATE INDEX idx_system_maintenance_plans_created_by ON system_maintenance_plans(created_by);
CREATE INDEX idx_system_maintenance_executions_plan_id ON system_maintenance_executions(plan_id);
CREATE INDEX idx_system_maintenance_executions_task_status ON system_maintenance_executions(task_status);
CREATE INDEX idx_system_maintenance_executions_executed_by ON system_maintenance_executions(executed_by);
CREATE INDEX idx_system_notifications_notification_type ON system_notifications(notification_type);
CREATE INDEX idx_system_notifications_target_type ON system_notifications(target_type);
CREATE INDEX idx_system_notifications_is_read ON system_notifications(is_read);
CREATE INDEX idx_system_notifications_created_by ON system_notifications(created_by);
CREATE INDEX idx_system_notification_reads_notification_id ON system_notification_reads(notification_id);
CREATE INDEX idx_system_notification_reads_admin_id ON system_notification_reads(admin_id);
CREATE INDEX idx_system_config_history_config_id ON system_config_history(config_id);
CREATE INDEX idx_system_config_history_changed_by ON system_config_history(changed_by);
CREATE INDEX idx_feature_flag_history_flag_id ON feature_flag_history(flag_id);
CREATE INDEX idx_feature_flag_history_changed_by ON feature_flag_history(changed_by);
CREATE INDEX idx_admin_login_history_admin_id ON admin_login_history(admin_id);
CREATE INDEX idx_admin_login_history_login_time ON admin_login_history(login_time);
CREATE INDEX idx_admin_login_history_login_result ON admin_login_history(login_result);
CREATE INDEX idx_admin_devices_admin_id ON admin_devices(admin_id);
CREATE INDEX idx_admin_devices_device_id ON admin_devices(device_id);
CREATE INDEX idx_admin_devices_is_active ON admin_devices(is_active);
CREATE INDEX idx_admin_security_settings_admin_id ON admin_security_settings(admin_id);
CREATE INDEX idx_admin_security_logs_admin_id ON admin_security_logs(admin_id);
CREATE INDEX idx_admin_security_logs_event_type ON admin_security_logs(event_type);
CREATE INDEX idx_admin_security_logs_success ON admin_security_logs(success);
CREATE INDEX idx_system_api_keys_is_active ON system_api_keys(is_active);
CREATE INDEX idx_system_api_keys_created_by ON system_api_keys(created_by);
CREATE INDEX idx_system_api_usage_logs_api_key_id ON system_api_usage_logs(api_key_id);
CREATE INDEX idx_system_api_usage_logs_endpoint ON system_api_usage_logs(endpoint);
CREATE INDEX idx_system_api_usage_logs_response_status ON system_api_usage_logs(response_status);
CREATE INDEX idx_system_cache_statistics_cache_name ON system_cache_statistics(cache_name);
CREATE INDEX idx_system_cache_statistics_recorded_at ON system_cache_statistics(recorded_at);
CREATE INDEX idx_system_database_statistics_database_name ON system_database_statistics(database_name);
CREATE INDEX idx_system_database_statistics_table_name ON system_database_statistics(table_name);
CREATE INDEX idx_system_database_statistics_recorded_at ON system_database_statistics(recorded_at);
CREATE INDEX idx_system_queue_statistics_queue_name ON system_queue_statistics(queue_name);
CREATE INDEX idx_system_queue_statistics_recorded_at ON system_queue_statistics(recorded_at);
CREATE INDEX idx_system_scheduled_tasks_task_type ON system_scheduled_tasks(task_type);
CREATE INDEX idx_system_scheduled_tasks_is_active ON system_scheduled_tasks(is_active);
CREATE INDEX idx_system_scheduled_tasks_next_run_at ON system_scheduled_tasks(next_run_at);
CREATE INDEX idx_system_scheduled_tasks_created_by ON system_scheduled_tasks(created_by);
CREATE INDEX idx_system_task_executions_task_id ON system_task_executions(task_id);
CREATE INDEX idx_system_task_executions_execution_status ON system_task_executions(execution_status);
CREATE INDEX idx_system_health_checks_check_type ON system_health_checks(check_type);
CREATE INDEX idx_system_health_checks_check_status ON system_health_checks(check_status);
CREATE INDEX idx_system_health_checks_checked_at ON system_health_checks(checked_at);
CREATE INDEX idx_system_alert_rules_rule_type ON system_alert_rules(rule_type);
CREATE INDEX idx_system_alert_rules_is_active ON system_alert_rules(is_active);
CREATE INDEX idx_system_alert_rules_created_by ON system_alert_rules(created_by);
CREATE INDEX idx_system_alerts_rule_id ON system_alerts(rule_id);
CREATE INDEX idx_system_alerts_alert_severity ON system_alerts(alert_severity);
CREATE INDEX idx_system_alerts_alert_status ON system_alerts(alert_status);
CREATE INDEX idx_system_alerts_triggered_at ON system_alerts(triggered_at);
CREATE INDEX idx_system_alerts_acknowledged_by ON system_alerts(acknowledged_by);
CREATE INDEX idx_system_alerts_resolved_by ON system_alerts(resolved_by);
CREATE INDEX idx_system_alert_notifications_alert_id ON system_alert_notifications(alert_id);
CREATE INDEX idx_system_alert_notifications_notification_channel ON system_alert_notifications(notification_channel);
CREATE INDEX idx_system_alert_notifications_notification_status ON system_alert_notifications(notification_status);

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为需要updated_at字段的表创建触发器
CREATE TRIGGER update_admins_updated_at BEFORE UPDATE ON admins FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_admin_roles_updated_at BEFORE UPDATE ON admin_roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_configs_updated_at BEFORE UPDATE ON system_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_feature_flags_updated_at BEFORE UPDATE ON feature_flags FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_maintenance_windows_updated_at BEFORE UPDATE ON maintenance_windows FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON announcements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_batch_jobs_updated_at BEFORE UPDATE ON batch_jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_report_definitions_updated_at BEFORE UPDATE ON report_definitions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON support_tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_webhooks_updated_at BEFORE UPDATE ON webhooks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_document_statistics_updated_at BEFORE UPDATE ON document_statistics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_admin_operation_restrictions_updated_at BEFORE UPDATE ON admin_operation_restrictions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_maintenance_plans_updated_at BEFORE UPDATE ON system_maintenance_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_admin_security_settings_updated_at BEFORE UPDATE ON admin_security_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_api_keys_updated_at BEFORE UPDATE ON system_api_keys FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_scheduled_tasks_updated_at BEFORE UPDATE ON system_scheduled_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_alert_rules_updated_at BEFORE UPDATE ON system_alert_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 插入初始管理员数据
INSERT INTO admins (username, email, password_hash, full_name, status) VALUES
('admin', 'admin@system.com', '$2b$10$ExampleHashedPassword', '系统管理员', 'active');

-- 插入默认角色和权限
INSERT INTO admin_roles (name, description, is_system) VALUES
('super_admin', '超级管理员', true),
('content_admin', '内容管理员', false),
('support_admin', '客服管理员', false),
('audit_admin', '审计管理员', false);

-- 插入默认权限
INSERT INTO admin_permissions (code, name, description, module) VALUES
('user:read', '查看用户', '查看用户列表和详情', 'user'),
('user:write', '管理用户', '创建、编辑、删除用户', 'user'),
('user:status', '管理用户状态', '启用/禁用用户账户', 'user'),
('bill:read', '查看账单', '查看账单列表和详情', 'bill'),
('bill:write', '管理账单', '创建、编辑、删除账单', 'bill'),
('expense:review', '审核费用', '审核用户提交的费用', 'expense'),
('system:config', '系统配置', '管理系统配置项', 'system'),
('audit:read', '查看审计日志', '查看操作和变更日志', 'audit'),
('report:generate', '生成报表', '生成和导出报表', 'report'),
('ticket:manage', '管理工单', '处理用户工单', 'support'),
('document:manage', '管理文档', '创建、编辑文档', 'document');

-- 为超级管理员分配所有权限
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT 1, id FROM admin_permissions;

-- 为管理员分配角色
INSERT INTO admin_user_roles (admin_id, role_id, assigned_by) VALUES (1, 1, 1);

-- 插入默认文档类型
INSERT INTO document_types (name, description) VALUES
('用户指南', '用户使用指南和教程'),
('API文档', '接口API文档'),
('系统文档', '系统配置和运维文档'),
('常见问题', '常见问题解答'),
('更新日志', '系统版本更新记录');

-- 插入管理员安全设置初始数据
INSERT INTO admin_security_settings (admin_id, two_factor_enabled, password_change_required, session_timeout_minutes)
SELECT id, false, false, 60 FROM admins;

-- 插入系统调度任务初始数据
INSERT INTO system_scheduled_tasks (task_name, task_type, task_expression, task_config, is_active, created_by)
VALUES
('系统日志清理', 'cleanup', '0 2 * * *', '{"retention_days": 90}', true, 1),
('数据库备份', 'backup', '0 3 * * 0', '{"backup_type": "full"}', true, 1),
('性能指标收集', 'report', '*/5 * * * *', '{"metrics": ["cpu", "memory", "disk"]}', true, 1),
('缓存统计', 'report', '*/10 * * * *', '{"cache_types": ["redis", "memcached"]}', true, 1);

-- 插入系统告警规则初始数据
INSERT INTO system_alert_rules (rule_name, rule_type, rule_condition, rule_threshold, rule_operator, rule_time_window, rule_severity, is_active, notification_channels, created_by)
VALUES
('CPU使用率过高', 'metric', '{"metric": "cpu_usage"}', 80, '>', 5, 'warning', true, '["email"]', 1),
('内存使用率过高', 'metric', '{"metric": "memory_usage"}', 85, '>', 5, 'warning', true, '["email"]', 1),
('磁盘空间不足', 'metric', '{"metric": "disk_usage"}', 90, '>', 5, 'critical', true, '["email", "sms"]', 1),
('错误率过高', 'error_rate', '{"endpoint": "/api/*"}', 5, '>', 10, 'warning', true, '["email"]', 1),
('API响应时间过长', 'response_time', '{"endpoint": "/api/*"}', 2000, '>', 5, 'warning', true, '["email"]', 1);

-- 插入系统健康检查初始数据
INSERT INTO system_health_checks (check_name, check_type, check_status, check_details, response_time_ms)
VALUES
('数据库连接', 'database', 'healthy', '{"database": "postgresql"}', 10),
('Redis缓存', 'cache', 'healthy', '{"cache": "redis"}', 5),
('消息队列', 'queue', 'healthy', '{"queue": "rabbitmq"}', 8),
('磁盘空间', 'disk', 'healthy', '{"usage": "45%"}', 2);

-- 插入系统性能指标初始数据
INSERT INTO system_performance_metrics (metric_name, metric_value, metric_unit, additional_data)
VALUES
('cpu_usage', 25.5, '%', '{"cores": 4}'),
('memory_usage', 60.2, '%', '{"total": "8GB", "used": "4.8GB"}'),
('disk_usage', 45.8, '%', '{"total": "100GB", "used": "45.8GB"}');