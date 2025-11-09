const express = require('express');
const router = express.Router();
const otherController = require('../controllers/other-controller');
const { auth, authorize } = require('../middleware/auth');

// 系统信息相关路由
router.get('/system-info', otherController.getSystemInfo);
router.get('/version', otherController.getVersionInfo);

// 文件上传相关路由
router.post('/upload', auth, otherController.uploadFile);
router.get('/uploads', auth, authorize(['admin', 'manager']), otherController.getUploadList);
router.delete('/uploads/:fileId', auth, authorize(['admin']), otherController.deleteUpload);

// 公告相关路由
router.get('/announcements', otherController.getAnnouncements);
router.get('/announcements/:announcementId', otherController.getAnnouncementDetail);
router.post('/announcements', auth, authorize(['admin', 'manager']), otherController.createAnnouncement);
router.put('/announcements/:announcementId', auth, authorize(['admin', 'manager']), otherController.updateAnnouncement);
router.delete('/announcements/:announcementId', auth, authorize(['admin']), otherController.deleteAnnouncement);

// 帮助文档相关路由
router.get('/help-docs', otherController.getHelpDocuments);
router.get('/help-docs/:docId', otherController.getHelpDocumentDetail);
router.get('/help-docs/search', otherController.searchHelpDocuments);

// 反馈相关路由
router.get('/feedback', auth, authorize(['admin', 'manager']), otherController.getFeedbackList);
router.post('/feedback', auth, otherController.submitFeedback);
router.get('/feedback/:feedbackId', auth, otherController.getFeedbackDetail);
router.post('/feedback/:feedbackId/reply', auth, authorize(['admin', 'manager']), otherController.replyFeedback);

// 常用链接相关路由
router.get('/common-links', otherController.getCommonLinks);
router.post('/common-links', auth, authorize(['admin', 'manager']), otherController.createCommonLink);
router.put('/common-links/:linkId', auth, authorize(['admin', 'manager']), otherController.updateCommonLink);
router.delete('/common-links/:linkId', auth, authorize(['admin']), otherController.deleteCommonLink);

// 数据导入导出相关路由
router.get('/export', auth, authorize(['admin']), otherController.exportData);
router.post('/import', auth, authorize(['admin']), otherController.importData);
router.get('/import/history', auth, authorize(['admin']), otherController.getImportHistory);

// 缓存管理相关路由
router.post('/cache/clear', auth, authorize(['admin']), otherController.clearCache);
router.get('/cache/status', auth, authorize(['admin']), otherController.getCacheStatus);

module.exports = router;