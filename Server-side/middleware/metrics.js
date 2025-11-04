// 简易零成本指标采集中间件（内存）
const metrics = {
  requestsTotal: 0,
  errorsTotal: 0,
  byStatus: {},
  startedAt: Date.now(),
};

function metricsMiddleware(req, res, next) {
  metrics.requestsTotal += 1;
  const start = Date.now();
  res.on('finish', () => {
    const status = res.statusCode;
    metrics.byStatus[status] = (metrics.byStatus[status] || 0) + 1;
    // 5xx 计为错误
    if (status >= 500) metrics.errorsTotal += 1;
    // 也可以扩展耗时分布等
  });
  next();
}

function getMetrics() {
  return { ...metrics, uptimeMs: Date.now() - metrics.startedAt };
}

module.exports = { metricsMiddleware, getMetrics };
