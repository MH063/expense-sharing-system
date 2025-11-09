const express = require('express');
const router = express.Router();
const otherController = require('../controllers/other-controller');
const { authenticateToken, checkRole } = require('../middleware/auth-middleware');

// 系统信息相关路由
router.get('/system-info', otherController.getSystemInfo);
router.get('/version', otherController.getVersionInfo);

// 文件上传相关路由
router.post('/upload', authenticateToken, otherController.uploadFile);
router.get('/uploads', authenticateToken, checkRole(['admin', 'manager']), otherController.getUploadList);
router.delete('/uploads/:fileId', authenticateToken, checkRole(['admin']), otherController.deleteUpload);

// 公告相关路由
router.get('/announcements', otherController.getAnnouncements);
router.get('/announcements/:announcementId', otherController.getAnnouncementDetail);
router.post('/announcements', authenticateToken, checkRole(['admin', 'manager']), otherController.createAnnouncement);
router.put('/announcements/:announcementId', authenticateToken, checkRole(['admin', 'manager']), otherController.updateAnnouncement);
router.delete('/announcements/:announcementId', authenticateToken, checkRole(['admin']), otherController.deleteAnnouncement);

// 帮助文档相关路由
router.get('/help-docs', otherController.getHelpDocuments);
router.get('/help-docs/:docId', otherController.getHelpDocumentDetail);
router.get('/help-docs/search', otherController.searchHelpDocuments);

// 反馈相关路由
router.get('/feedback', authenticateToken, checkRole(['admin', 'manager']), otherController.getFeedbackList);
router.post('/feedback', authenticateToken, otherController.submitFeedback);
router.get('/feedback/:feedbackId', authenticateToken, otherController.getFeedbackDetail);
router.post('/feedback/:feedbackId/reply', authenticateToken, checkRole(['admin', 'manager']), otherController.replyFeedback);

// 常用链接相关路由
router.get('/common-links', otherController.getCommonLinks);
router.post('/common-links', authenticateToken, checkRole(['admin', 'manager']), otherController.createCommonLink);
router.put('/common-links/:linkId', authenticateToken, checkRole(['admin', 'manager']), otherController.updateCommonLink);
router.delete('/common-links/:linkId', authenticateToken, checkRole(['admin']), otherController.deleteCommonLink);

// 数据导入导出相关路由
router.get('/export', authenticateToken, checkRole(['admin']), otherController.exportData);
router.post('/import', authenticateToken, checkRole(['admin']), otherController.importData);
router.get('/import/history', authenticateToken, checkRole(['admin']), otherController.getImportHistory);

// 缓存管理相关路由
router.post('/cache/clear', authenticateToken, checkRole(['admin']), otherController.clearCache);
router.get('/cache/status', authenticateToken, checkRole(['admin']), otherController.getCacheStatus);

module.exports = router;