const express = require('express');
const router = express.Router();
const docsController = require('../controllers/docs-controller');
const { authenticateToken, authorize } = require('../middleware/tokenManager');
const { upload } = require('../middleware/upload');

// 文档管理相关路由

// 获取文档列表
router.get('/list', authenticateToken, docsController.getDocsList);

// 获取文档详情
router.get('/:id', authenticateToken, docsController.getDocsDetail);

// 创建文档
router.post('/', 
  authenticateToken, 
  authorize('docs:create'), 
  docsController.createDocs
);

// 更新文档
router.put('/:id', 
  authenticateToken, 
  authorize('docs:update'), 
  docsController.updateDocs
);

// 删除文档
router.delete('/:id', 
  authenticateToken, 
  authorize('docs:delete'), 
  docsController.deleteDocs
);

// 获取文档分类列表
router.get('/categories', authenticateToken, docsController.getDocsCategories);

// 获取文档标签列表
router.get('/tags', authenticateToken, docsController.getDocsTags);

// 上传文档附件
router.post('/upload', 
  authenticateToken, 
  authorize('docs:upload'), 
  upload.single('file'), 
  docsController.uploadDocsAttachment
);

// 获取文档版本历史
router.get('/:id/versions', authenticateToken, docsController.getDocsVersionHistory);

// 恢复文档版本
router.post('/:id/versions/:versionId/restore', 
  authenticateToken, 
  authorize('docs:restore'), 
  docsController.restoreDocsVersion
);

// 获取文档评论列表
router.get('/:id/comments', authenticateToken, docsController.getDocsComments);

// 添加文档评论
router.post('/:id/comments', 
  authenticateToken, 
  authorize('docs:comment'), 
  docsController.addDocsComment
);

// 删除文档评论
router.delete('/:id/comments/:commentId', 
  authenticateToken, 
  docsController.deleteDocsComment
);

// 点赞/取消点赞文档
router.post('/:id/like', authenticateToken, docsController.toggleDocsLike);

// 收藏/取消收藏文档
router.post('/:id/favorite', authenticateToken, docsController.toggleDocsFavorite);

// 获取用户收藏的文档列表
router.get('/favorites', authenticateToken, docsController.getUserFavoriteDocs);

// 获取用户点赞的文档列表
router.get('/likes', authenticateToken, docsController.getUserLikedDocs);

// 获取文档阅读统计
router.get('/:id/stats', authenticateToken, docsController.getDocsReadStats);

// 记录文档阅读
router.post('/:id/read', authenticateToken, docsController.recordDocsRead);

// 搜索文档
router.get('/search', authenticateToken, docsController.searchDocs);

// 导出文档
router.get('/:id/export', 
  authenticateToken, 
  authorize('docs:export'), 
  docsController.exportDocs
);

// 批量操作文档
router.post('/batch', 
  authenticateToken, 
  authorize('docs:batch'), 
  docsController.batchDocsOperation
);

module.exports = router;