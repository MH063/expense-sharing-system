const { Docs, DocsCategory, DocsTag, DocsComment, DocsVersion, DocsLike, DocsFavorite, DocsRead, User } = require('../models');
const { Op } = require('sequelize');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { logger } = require('../config/logger');
const { RBACService } = require('../services/rbac-service');

/**
 * 文档管理控制器
 */
class DocsController {
  /**
   * 获取文档列表
   */
  async getDocsList(req, res) {
    try {
      const { page = 1, pageSize = 10, category, keyword, status = 'published' } = req.query;
      const offset = (page - 1) * pageSize;
      const limit = parseInt(pageSize);
      
      // 构建查询条件
      const whereCondition = {
        status
      };
      
      if (category) {
        whereCondition.categoryId = category;
      }
      
      if (keyword) {
        whereCondition[Op.or] = [
          { title: { [Op.like]: `%${keyword}%` } },
          { content: { [Op.like]: `%${keyword}%` } }
        ];
      }
      
      const { count, rows: docs } = await Docs.findAndCountAll({
        where: whereCondition,
        include: [
          {
            model: DocsCategory,
            as: 'category',
            attributes: ['id', 'name']
          },
          {
            model: User,
            as: 'author',
            attributes: ['id', 'username', 'nickname']
          },
          {
            model: DocsTag,
            as: 'tags',
            attributes: ['id', 'name'],
            through: { attributes: [] }
          }
        ],
        order: [['updatedAt', 'DESC']],
        offset,
        limit
      });
      
      return res.json({
        success: true,
        data: {
          total: count,
          docs,
          pagination: {
            page: parseInt(page),
            pageSize: limit,
            total: count,
            totalPages: Math.ceil(count / limit)
          }
        }
      });
    } catch (error) {
      logger.error('获取文档列表失败:', error);
      return res.status(500).json({
        success: false,
        message: '获取文档列表失败',
        error: error.message
      });
    }
  }

  /**
   * 获取文档详情
   */
  async getDocsDetail(req, res) {
    try {
      const { id } = req.params;
      
      const doc = await Docs.findByPk(id, {
        include: [
          {
            model: DocsCategory,
            as: 'category',
            attributes: ['id', 'name']
          },
          {
            model: User,
            as: 'author',
            attributes: ['id', 'username', 'nickname', 'avatar']
          },
          {
            model: DocsTag,
            as: 'tags',
            attributes: ['id', 'name'],
            through: { attributes: [] }
          },
          {
            model: DocsComment,
            as: 'comments',
            include: [
              {
                model: User,
                as: 'user',
                attributes: ['id', 'username', 'nickname', 'avatar']
              }
            ],
            order: [['createdAt', 'ASC']]
          }
        ]
      });
      
      if (!doc) {
        return res.status(404).json({
          success: false,
          message: '文档不存在'
        });
      }
      
      // 记录阅读
      await this.recordDocsReadInternal(id, req.user.id);
      
      return res.json({
        success: true,
        data: doc
      });
    } catch (error) {
      logger.error('获取文档详情失败:', error);
      return res.status(500).json({
        success: false,
        message: '获取文档详情失败',
        error: error.message
      });
    }
  }

  /**
   * 创建文档
   */
  async createDocs(req, res) {
    try {
      const { title, content, categoryId, tags, isPublic = true } = req.body;
      
      if (!title || !content) {
        return res.status(400).json({
          success: false,
          message: '标题和内容不能为空'
        });
      }
      
      // 创建文档
      const newDoc = await Docs.create({
        title,
        content,
        categoryId,
        authorId: req.user.id,
        isPublic,
        status: 'published'
      });
      
      // 处理标签
      if (tags && tags.length > 0) {
        const tagInstances = await Promise.all(
          tags.map(tagName => 
            DocsTag.findOrCreate({
              where: { name: tagName },
              defaults: { name: tagName }
            }).then(([tag]) => tag)
          )
        );
        
        await newDoc.setTags(tagInstances);
      }
      
      // 创建版本记录
      await DocsVersion.create({
        docsId: newDoc.id,
        version: '1.0',
        title,
        content,
        createdBy: req.user.id
      });
      
      return res.json({
        success: true,
        message: '文档创建成功',
        data: newDoc
      });
    } catch (error) {
      logger.error('创建文档失败:', error);
      return res.status(500).json({
        success: false,
        message: '创建文档失败',
        error: error.message
      });
    }
  }

  /**
   * 更新文档
   */
  async updateDocs(req, res) {
    try {
      const { id } = req.params;
      const { title, content, categoryId, tags, isPublic } = req.body;
      
      const doc = await Docs.findByPk(id);
      
      if (!doc) {
        return res.status(404).json({
          success: false,
          message: '文档不存在'
        });
      }
      
      // 检查权限
      if (doc.authorId !== req.user.id && !(await RBACService.hasRole(req.user.id, ['admin']))) {
        return res.status(403).json({
          success: false,
          message: '没有权限修改此文档'
        });
      }
      
      // 获取当前版本号
      const lastVersion = await DocsVersion.findOne({
        where: { docsId: id },
        order: [['createdAt', 'DESC']]
      });
      
      const versionParts = lastVersion.version.split('.');
      const newVersion = `${versionParts[0]}.${parseInt(versionParts[1]) + 1}`;
      
      // 更新文档
      await doc.update({
        title: title || doc.title,
        content: content || doc.content,
        categoryId: categoryId || doc.categoryId,
        isPublic: isPublic !== undefined ? isPublic : doc.isPublic
      });
      
      // 处理标签
      if (tags) {
        if (tags.length > 0) {
          const tagInstances = await Promise.all(
            tags.map(tagName => 
              DocsTag.findOrCreate({
                where: { name: tagName },
                defaults: { name: tagName }
              }).then(([tag]) => tag)
            )
          );
          
          await doc.setTags(tagInstances);
        } else {
          await doc.setTags([]);
        }
      }
      
      // 创建版本记录
      await DocsVersion.create({
        docsId: id,
        version: newVersion,
        title: title || doc.title,
        content: content || doc.content,
        createdBy: req.user.id
      });
      
      return res.json({
        success: true,
        message: '文档更新成功',
        data: doc
      });
    } catch (error) {
      logger.error('更新文档失败:', error);
      return res.status(500).json({
        success: false,
        message: '更新文档失败',
        error: error.message
      });
    }
  }

  /**
   * 删除文档
   */
  async deleteDocs(req, res) {
    try {
      const { id } = req.params;
      
      const doc = await Docs.findByPk(id);
      
      if (!doc) {
        return res.status(404).json({
          success: false,
          message: '文档不存在'
        });
      }
      
      // 检查权限
      if (doc.authorId !== req.user.id && !(await RBACService.hasRole(req.user.id, ['admin']))) {
        return res.status(403).json({
          success: false,
          message: '没有权限删除此文档'
        });
      }
      
      // 软删除
      await doc.update({ status: 'deleted' });
      
      return res.json({
        success: true,
        message: '文档删除成功'
      });
    } catch (error) {
      logger.error('删除文档失败:', error);
      return res.status(500).json({
        success: false,
        message: '删除文档失败',
        error: error.message
      });
    }
  }

  /**
   * 获取文档分类列表
   */
  async getDocsCategories(req, res) {
    try {
      const categories = await DocsCategory.findAll({
        order: [['name', 'ASC']]
      });
      
      return res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      logger.error('获取文档分类列表失败:', error);
      return res.status(500).json({
        success: false,
        message: '获取文档分类列表失败',
        error: error.message
      });
    }
  }

  /**
   * 获取文档标签列表
   */
  async getDocsTags(req, res) {
    try {
      const tags = await DocsTag.findAll({
        order: [['name', 'ASC']]
      });
      
      return res.json({
        success: true,
        data: tags
      });
    } catch (error) {
      logger.error('获取文档标签列表失败:', error);
      return res.status(500).json({
        success: false,
        message: '获取文档标签列表失败',
        error: error.message
      });
    }
  }

  /**
   * 上传文档附件
   */
  async uploadDocsAttachment(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: '请选择要上传的文件'
        });
      }
      
      const fileUrl = `/uploads/${req.file.filename}`;
      
      return res.json({
        success: true,
        message: '文件上传成功',
        data: {
          filename: req.file.filename,
          originalName: req.file.originalname,
          size: req.file.size,
          url: fileUrl
        }
      });
    } catch (error) {
      logger.error('上传文档附件失败:', error);
      return res.status(500).json({
        success: false,
        message: '上传文档附件失败',
        error: error.message
      });
    }
  }

  /**
   * 获取文档版本历史
   */
  async getDocsVersionHistory(req, res) {
    try {
      const { id } = req.params;
      
      const versions = await DocsVersion.findAll({
        where: { docsId: id },
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'username', 'nickname']
          }
        ],
        order: [['createdAt', 'DESC']]
      });
      
      return res.json({
        success: true,
        data: versions
      });
    } catch (error) {
      logger.error('获取文档版本历史失败:', error);
      return res.status(500).json({
        success: false,
        message: '获取文档版本历史失败',
        error: error.message
      });
    }
  }

  /**
   * 恢复文档版本
   */
  async restoreDocsVersion(req, res) {
    try {
      const { id, versionId } = req.params;
      
      const doc = await Docs.findByPk(id);
      
      if (!doc) {
        return res.status(404).json({
          success: false,
          message: '文档不存在'
        });
      }
      
      // 检查权限
      if (doc.authorId !== req.user.id && !(await RBACService.hasRole(req.user.id, ['admin']))) {
        return res.status(403).json({
          success: false,
          message: '没有权限恢复此文档'
        });
      }
      
      const version = await DocsVersion.findByPk(versionId);
      
      if (!version || version.docsId !== id) {
        return res.status(404).json({
          success: false,
          message: '版本不存在'
        });
      }
      
      // 获取当前版本号
      const lastVersion = await DocsVersion.findOne({
        where: { docsId: id },
        order: [['createdAt', 'DESC']]
      });
      
      const versionParts = lastVersion.version.split('.');
      const newVersion = `${parseInt(versionParts[0]) + 1}.0`;
      
      // 更新文档
      await doc.update({
        title: version.title,
        content: version.content
      });
      
      // 创建版本记录
      await DocsVersion.create({
        docsId: id,
        version: newVersion,
        title: version.title,
        content: version.content,
        createdBy: req.user.id,
        note: `从版本 ${version.version} 恢复`
      });
      
      return res.json({
        success: true,
        message: '文档版本恢复成功',
        data: doc
      });
    } catch (error) {
      logger.error('恢复文档版本失败:', error);
      return res.status(500).json({
        success: false,
        message: '恢复文档版本失败',
        error: error.message
      });
    }
  }

  /**
   * 获取文档评论列表
   */
  async getDocsComments(req, res) {
    try {
      const { id } = req.params;
      const { page = 1, pageSize = 10 } = req.query;
      const offset = (page - 1) * pageSize;
      const limit = parseInt(pageSize);
      
      const { count, rows: comments } = await DocsComment.findAndCountAll({
        where: { docsId: id },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'nickname', 'avatar']
          }
        ],
        order: [['createdAt', 'DESC']],
        offset,
        limit
      });
      
      return res.json({
        success: true,
        data: {
          total: count,
          comments,
          pagination: {
            page: parseInt(page),
            pageSize: limit,
            total: count,
            totalPages: Math.ceil(count / limit)
          }
        }
      });
    } catch (error) {
      logger.error('获取文档评论列表失败:', error);
      return res.status(500).json({
        success: false,
        message: '获取文档评论列表失败',
        error: error.message
      });
    }
  }

  /**
   * 添加文档评论
   */
  async addDocsComment(req, res) {
    try {
      const { id } = req.params;
      const { content } = req.body;
      
      if (!content) {
        return res.status(400).json({
          success: false,
          message: '评论内容不能为空'
        });
      }
      
      // 检查文档是否存在
      const doc = await Docs.findByPk(id);
      
      if (!doc) {
        return res.status(404).json({
          success: false,
          message: '文档不存在'
        });
      }
      
      // 创建评论
      const comment = await DocsComment.create({
        docsId: id,
        userId: req.user.id,
        content
      });
      
      // 获取包含用户信息的评论
      const newComment = await DocsComment.findByPk(comment.id, {
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'nickname', 'avatar']
          }
        ]
      });
      
      return res.json({
        success: true,
        message: '评论添加成功',
        data: newComment
      });
    } catch (error) {
      logger.error('添加文档评论失败:', error);
      return res.status(500).json({
        success: false,
        message: '添加文档评论失败',
        error: error.message
      });
    }
  }

  /**
   * 删除文档评论
   */
  async deleteDocsComment(req, res) {
    try {
      const { id, commentId } = req.params;
      
      const comment = await DocsComment.findByPk(commentId);
      
      if (!comment) {
        return res.status(404).json({
          success: false,
          message: '评论不存在'
        });
      }
      
      // 检查权限
      if (comment.userId !== req.user.id && !(await RBACService.hasRole(req.user.id, ['admin']))) {
        return res.status(403).json({
          success: false,
          message: '没有权限删除此评论'
        });
      }
      
      await comment.destroy();
      
      return res.json({
        success: true,
        message: '评论删除成功'
      });
    } catch (error) {
      logger.error('删除文档评论失败:', error);
      return res.status(500).json({
        success: false,
        message: '删除文档评论失败',
        error: error.message
      });
    }
  }

  /**
   * 点赞/取消点赞文档
   */
  async toggleDocsLike(req, res) {
    try {
      const { id } = req.params;
      
      // 检查文档是否存在
      const doc = await Docs.findByPk(id);
      
      if (!doc) {
        return res.status(404).json({
          success: false,
          message: '文档不存在'
        });
      }
      
      // 检查是否已点赞
      const existingLike = await DocsLike.findOne({
        where: {
          docsId: id,
          userId: req.user.id
        }
      });
      
      if (existingLike) {
        // 取消点赞
        await existingLike.destroy();
        
        return res.json({
          success: true,
          message: '已取消点赞',
          data: { liked: false }
        });
      } else {
        // 点赞
        await DocsLike.create({
          docsId: id,
          userId: req.user.id
        });
        
        return res.json({
          success: true,
          message: '点赞成功',
          data: { liked: true }
        });
      }
    } catch (error) {
      logger.error('点赞/取消点赞文档失败:', error);
      return res.status(500).json({
        success: false,
        message: '操作失败',
        error: error.message
      });
    }
  }

  /**
   * 收藏/取消收藏文档
   */
  async toggleDocsFavorite(req, res) {
    try {
      const { id } = req.params;
      
      // 检查文档是否存在
      const doc = await Docs.findByPk(id);
      
      if (!doc) {
        return res.status(404).json({
          success: false,
          message: '文档不存在'
        });
      }
      
      // 检查是否已收藏
      const existingFavorite = await DocsFavorite.findOne({
        where: {
          docsId: id,
          userId: req.user.id
        }
      });
      
      if (existingFavorite) {
        // 取消收藏
        await existingFavorite.destroy();
        
        return res.json({
          success: true,
          message: '已取消收藏',
          data: { favorited: false }
        });
      } else {
        // 收藏
        await DocsFavorite.create({
          docsId: id,
          userId: req.user.id
        });
        
        return res.json({
          success: true,
          message: '收藏成功',
          data: { favorited: true }
        });
      }
    } catch (error) {
      logger.error('收藏/取消收藏文档失败:', error);
      return res.status(500).json({
        success: false,
        message: '操作失败',
        error: error.message
      });
    }
  }

  /**
   * 获取用户收藏的文档列表
   */
  async getUserFavoriteDocs(req, res) {
    try {
      const { page = 1, pageSize = 10 } = req.query;
      const offset = (page - 1) * pageSize;
      const limit = parseInt(pageSize);
      
      const { count, rows: favorites } = await DocsFavorite.findAndCountAll({
        where: { userId: req.user.id },
        include: [
          {
            model: Docs,
            as: 'doc',
            include: [
              {
                model: DocsCategory,
                as: 'category',
                attributes: ['id', 'name']
              },
              {
                model: User,
                as: 'author',
                attributes: ['id', 'username', 'nickname']
              }
            ]
          }
        ],
        order: [['createdAt', 'DESC']],
        offset,
        limit
      });
      
      const docs = favorites.map(favorite => favorite.doc);
      
      return res.json({
        success: true,
        data: {
          total: count,
          docs,
          pagination: {
            page: parseInt(page),
            pageSize: limit,
            total: count,
            totalPages: Math.ceil(count / limit)
          }
        }
      });
    } catch (error) {
      logger.error('获取用户收藏的文档列表失败:', error);
      return res.status(500).json({
        success: false,
        message: '获取用户收藏的文档列表失败',
        error: error.message
      });
    }
  }

  /**
   * 获取用户点赞的文档列表
   */
  async getUserLikedDocs(req, res) {
    try {
      const { page = 1, pageSize = 10 } = req.query;
      const offset = (page - 1) * pageSize;
      const limit = parseInt(pageSize);
      
      const { count, rows: likes } = await DocsLike.findAndCountAll({
        where: { userId: req.user.id },
        include: [
          {
            model: Docs,
            as: 'doc',
            include: [
              {
                model: DocsCategory,
                as: 'category',
                attributes: ['id', 'name']
              },
              {
                model: User,
                as: 'author',
                attributes: ['id', 'username', 'nickname']
              }
            ]
          }
        ],
        order: [['createdAt', 'DESC']],
        offset,
        limit
      });
      
      const docs = likes.map(like => like.doc);
      
      return res.json({
        success: true,
        data: {
          total: count,
          docs,
          pagination: {
            page: parseInt(page),
            pageSize: limit,
            total: count,
            totalPages: Math.ceil(count / limit)
          }
        }
      });
    } catch (error) {
      logger.error('获取用户点赞的文档列表失败:', error);
      return res.status(500).json({
        success: false,
        message: '获取用户点赞的文档列表失败',
        error: error.message
      });
    }
  }

  /**
   * 获取文档阅读统计
   */
  async getDocsReadStats(req, res) {
    try {
      const { id } = req.params;
      
      // 检查文档是否存在
      const doc = await Docs.findByPk(id);
      
      if (!doc) {
        return res.status(404).json({
          success: false,
          message: '文档不存在'
        });
      }
      
      // 获取阅读统计
      const readCount = await DocsRead.count({
        where: { docsId: id }
      });
      
      const likeCount = await DocsLike.count({
        where: { docsId: id }
      });
      
      const favoriteCount = await DocsFavorite.count({
        where: { docsId: id }
      });
      
      const commentCount = await DocsComment.count({
        where: { docsId: id }
      });
      
      return res.json({
        success: true,
        data: {
          readCount,
          likeCount,
          favoriteCount,
          commentCount
        }
      });
    } catch (error) {
      logger.error('获取文档阅读统计失败:', error);
      return res.status(500).json({
        success: false,
        message: '获取文档阅读统计失败',
        error: error.message
      });
    }
  }

  /**
   * 记录文档阅读
   */
  async recordDocsRead(req, res) {
    try {
      const { id } = req.params;
      
      // 检查文档是否存在
      const doc = await Docs.findByPk(id);
      
      if (!doc) {
        return res.status(404).json({
          success: false,
          message: '文档不存在'
        });
      }
      
      await this.recordDocsReadInternal(id, req.user.id);
      
      return res.json({
        success: true,
        message: '阅读记录已添加'
      });
    } catch (error) {
      logger.error('记录文档阅读失败:', error);
      return res.status(500).json({
        success: false,
        message: '记录文档阅读失败',
        error: error.message
      });
    }
  }

  /**
   * 内部方法：记录文档阅读
   */
  async recordDocsReadInternal(docsId, userId) {
    try {
      // 检查今天是否已记录过阅读
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const existingRead = await DocsRead.findOne({
        where: {
          docsId,
          userId,
          createdAt: {
            [Op.gte]: today
          }
        }
      });
      
      if (!existingRead) {
        await DocsRead.create({
          docsId,
          userId
        });
      }
    } catch (error) {
      logger.error('记录文档阅读内部方法失败:', error);
    }
  }

  /**
   * 搜索文档
   */
  async searchDocs(req, res) {
    try {
      const { keyword, category, tags, sort = 'relevance', page = 1, pageSize = 10 } = req.query;
      const offset = (page - 1) * pageSize;
      const limit = parseInt(pageSize);
      
      // 构建查询条件
      const whereCondition = {
        status: 'published'
      };
      
      if (keyword) {
        whereCondition[Op.or] = [
          { title: { [Op.like]: `%${keyword}%` } },
          { content: { [Op.like]: `%${keyword}%` } }
        ];
      }
      
      if (category) {
        whereCondition.categoryId = category;
      }
      
      // 构建包含条件
      const includeCondition = [
        {
          model: DocsCategory,
          as: 'category',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'nickname']
        }
      ];
      
      // 如果有标签过滤
      if (tags) {
        const tagArray = Array.isArray(tags) ? tags : tags.split(',');
        includeCondition.push({
          model: DocsTag,
          as: 'tags',
          attributes: ['id', 'name'],
          through: { attributes: [] },
          where: {
            id: {
              [Op.in]: tagArray
            }
          }
        });
      } else {
        includeCondition.push({
          model: DocsTag,
          as: 'tags',
          attributes: ['id', 'name'],
          through: { attributes: [] }
        });
      }
      
      // 构建排序条件
      let orderCondition;
      switch (sort) {
        case 'newest':
          orderCondition = [['createdAt', 'DESC']];
          break;
        case 'oldest':
          orderCondition = [['createdAt', 'ASC']];
          break;
        case 'popular':
          orderCondition = [['viewCount', 'DESC']];
          break;
        case 'relevance':
        default:
          // 如果有关键词，按相关性排序
          if (keyword) {
            // 简单的相关性排序：标题匹配优先于内容匹配
            orderCondition = [
              [
                sequelize.literal(`CASE WHEN title LIKE '%${keyword}%' THEN 1 ELSE 0 END`),
                'DESC'
              ],
              ['updatedAt', 'DESC']
            ];
          } else {
            orderCondition = [['updatedAt', 'DESC']];
          }
          break;
      }
      
      const { count, rows: docs } = await Docs.findAndCountAll({
        where: whereCondition,
        include: includeCondition,
        order: orderCondition,
        offset,
        limit
      });
      
      return res.json({
        success: true,
        data: {
          total: count,
          docs,
          pagination: {
            page: parseInt(page),
            pageSize: limit,
            total: count,
            totalPages: Math.ceil(count / limit)
          }
        }
      });
    } catch (error) {
      logger.error('搜索文档失败:', error);
      return res.status(500).json({
        success: false,
        message: '搜索文档失败',
        error: error.message
      });
    }
  }

  /**
   * 导出文档
   */
  async exportDocs(req, res) {
    try {
      const { id } = req.params;
      const { format = 'pdf' } = req.query;
      
      // 检查文档是否存在
      const doc = await Docs.findByPk(id, {
        include: [
          {
            model: DocsCategory,
            as: 'category',
            attributes: ['id', 'name']
          },
          {
            model: User,
            as: 'author',
            attributes: ['id', 'username', 'nickname']
          }
        ]
      });
      
      if (!doc) {
        return res.status(404).json({
          success: false,
          message: '文档不存在'
        });
      }
      
      // 记录导出
      logger.info(`用户 ${req.user.id} 导出文档 ${id}，格式：${format}`);
      
      // 根据格式导出
      switch (format.toLowerCase()) {
        case 'pdf':
          return this.exportToPdf(doc, res);
        case 'docx':
          return this.exportToDocx(doc, res);
        case 'md':
          return this.exportToMarkdown(doc, res);
        default:
          return res.status(400).json({
            success: false,
            message: '不支持的导出格式'
          });
      }
    } catch (error) {
      logger.error('导出文档失败:', error);
      return res.status(500).json({
        success: false,
        message: '导出文档失败',
        error: error.message
      });
    }
  }

  /**
   * 导出为PDF
   */
  exportToPdf(doc, res) {
    try {
      // 创建PDF文档
      const docPdf = new PDFDocument();
      const filename = `${doc.title}.pdf`;
      
      // 设置响应头
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      // 将PDF流式传输到响应
      docPdf.pipe(res);
      
      // 添加内容
      docPdf.fontSize(20).text(doc.title, { align: 'center' });
      docPdf.fontSize(12).text(`作者：${doc.author.nickname || doc.author.username}`, { align: 'center' });
      docPdf.fontSize(12).text(`分类：${doc.category ? doc.category.name : '未分类'}`, { align: 'center' });
      docPdf.fontSize(12).text(`创建时间：${new Date(doc.createdAt).toLocaleString()}`, { align: 'center' });
      docPdf.moveDown();
      
      // 添加内容
      docPdf.fontSize(14).text(doc.content);
      
      // 完成PDF
      docPdf.end();
    } catch (error) {
      logger.error('导出PDF失败:', error);
      return res.status(500).json({
        success: false,
        message: '导出PDF失败',
        error: error.message
      });
    }
  }

  /**
   * 导出为Word文档
   */
  exportToDocx(doc, res) {
    try {
      // 这里需要安装并使用docx库
      // 由于当前环境可能没有安装，这里返回一个简单的文本文件
      const filename = `${doc.title}.doc`;
      const content = `
标题：${doc.title}
作者：${doc.author.nickname || doc.author.username}
分类：${doc.category ? doc.category.name : '未分类'}
创建时间：${new Date(doc.createdAt).toLocaleString()}

${doc.content}
      `;
      
      res.setHeader('Content-Type', 'application/msword');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(content);
    } catch (error) {
      logger.error('导出Word文档失败:', error);
      return res.status(500).json({
        success: false,
        message: '导出Word文档失败',
        error: error.message
      });
    }
  }

  /**
   * 导出为Markdown
   */
  exportToMarkdown(doc, res) {
    try {
      const filename = `${doc.title}.md`;
      const content = `# ${doc.title}

**作者：** ${doc.author.nickname || doc.author.username}  
**分类：** ${doc.category ? doc.category.name : '未分类'}  
**创建时间：** ${new Date(doc.createdAt).toLocaleString()}

---

${doc.content}
      `;
      
      res.setHeader('Content-Type', 'text/markdown');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(content);
    } catch (error) {
      logger.error('导出Markdown失败:', error);
      return res.status(500).json({
        success: false,
        message: '导出Markdown失败',
        error: error.message
      });
    }
  }

  /**
   * 批量操作文档
   */
  async batchDocsOperation(req, res) {
    try {
      const { ids, action, params = {} } = req.body;
      
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: '请选择要操作的文档'
        });
      }
      
      if (!action) {
        return res.status(400).json({
          success: false,
          message: '请指定操作类型'
        });
      }
      
      // 检查权限
      if (action !== 'delete' && action !== 'move' && action !== 'tag') {
        return res.status(400).json({
          success: false,
          message: '不支持的操作类型'
        });
      }
      
      let result;
      
      switch (action) {
        case 'delete':
          // 批量删除
          result = await Docs.update(
            { status: 'deleted' },
            {
              where: {
                id: {
                  [Op.in]: ids
                },
                authorId: req.user.id
              }
            }
          );
          break;
          
        case 'move':
          // 批量移动分类
          if (!params.categoryId) {
            return res.status(400).json({
              success: false,
              message: '请指定目标分类'
            });
          }
          
          result = await Docs.update(
            { categoryId: params.categoryId },
            {
              where: {
                id: {
                  [Op.in]: ids
                },
                authorId: req.user.id
              }
            }
          );
          break;
          
        case 'tag':
          // 批量添加标签
          if (!params.tags || !Array.isArray(params.tags) || params.tags.length === 0) {
            return res.status(400).json({
              success: false,
              message: '请指定要添加的标签'
            });
          }
          
          // 获取文档
          const docs = await Docs.findAll({
            where: {
              id: {
                [Op.in]: ids
              },
              authorId: req.user.id
            },
            include: [
              {
                model: DocsTag,
                as: 'tags',
                attributes: ['id', 'name'],
                through: { attributes: [] }
              }
            ]
          });
          
          // 获取或创建标签
          const tagInstances = await Promise.all(
            params.tags.map(tagName => 
              DocsTag.findOrCreate({
                where: { name: tagName },
                defaults: { name: tagName }
              }).then(([tag]) => tag)
            )
          );
          
          // 为每个文档添加标签
          for (const doc of docs) {
            const existingTagIds = doc.tags.map(tag => tag.id);
            const newTags = tagInstances.filter(tag => !existingTagIds.includes(tag.id));
            
            if (newTags.length > 0) {
              await doc.addTags(newTags);
            }
          }
          
          result = docs.length;
          break;
      }
      
      return res.json({
        success: true,
        message: `批量${action}操作成功`,
        data: {
          affectedCount: Array.isArray(result) ? result[0] : result
        }
      });
    } catch (error) {
      logger.error('批量操作文档失败:', error);
      return res.status(500).json({
        success: false,
        message: '批量操作文档失败',
        error: error.message
      });
    }
  }
}

module.exports = new DocsController();