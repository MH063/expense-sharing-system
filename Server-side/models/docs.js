const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  /**
   * 文档模型
   */
  const Docs = sequelize.define('Docs', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
      comment: '文档标题'
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: '文档内容'
    },
    categoryId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: '分类ID'
    },
    authorId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: '作者ID'
    },
    isPublic: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: '是否公开'
    },
    status: {
      type: DataTypes.ENUM('draft', 'published', 'deleted'),
      defaultValue: 'draft',
      comment: '状态'
    },
    viewCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '查看次数'
    },
    likeCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '点赞数'
    },
    favoriteCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '收藏数'
    },
    commentCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '评论数'
    },
    attachmentCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '附件数'
    },
    isTop: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: '是否置顶'
    },
    orderIndex: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '排序索引'
    },
    tags: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: '标签（JSON格式）'
    },
    attachments: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: '附件（JSON格式）'
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: '元数据（JSON格式）'
    }
  }, {
    tableName: 'docs',
    timestamps: true,
    indexes: [
      {
        fields: ['title']
      },
      {
        fields: ['categoryId']
      },
      {
        fields: ['authorId']
      },
      {
        fields: ['status']
      },
      {
        fields: ['isPublic']
      },
      {
        fields: ['isTop']
      },
      {
        fields: ['createdAt']
      },
      {
        fields: ['updatedAt']
      }
    ]
  });

  /**
   * 文档分类模型
   */
  const DocsCategory = sequelize.define('DocsCategory', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      comment: '分类名称'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '分类描述'
    },
    parentId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: '父分类ID'
    },
    icon: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: '图标'
    },
    color: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: '颜色'
    },
    orderIndex: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '排序索引'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: '是否激活'
    }
  }, {
    tableName: 'docs_categories',
    timestamps: true,
    indexes: [
      {
        fields: ['name']
      },
      {
        fields: ['parentId']
      },
      {
        fields: ['orderIndex']
      },
      {
        fields: ['isActive']
      }
    ]
  });

  /**
   * 文档标签模型
   */
  const DocsTag = sequelize.define('DocsTag', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      comment: '标签名称'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '标签描述'
    },
    color: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: '颜色'
    },
    usageCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '使用次数'
    }
  }, {
    tableName: 'docs_tags',
    timestamps: true,
    indexes: [
      {
        fields: ['name']
      },
      {
        fields: ['usageCount']
      }
    ]
  });

  /**
   * 文档评论模型
   */
  const DocsComment = sequelize.define('DocsComment', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    docsId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: '文档ID'
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: '用户ID'
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: '评论内容'
    },
    parentId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: '父评论ID'
    },
    likeCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '点赞数'
    },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: '是否已删除'
    }
  }, {
    tableName: 'docs_comments',
    timestamps: true,
    indexes: [
      {
        fields: ['docsId']
      },
      {
        fields: ['userId']
      },
      {
        fields: ['parentId']
      },
      {
        fields: ['isDeleted']
      },
      {
        fields: ['createdAt']
      }
    ]
  });

  /**
   * 文档版本模型
   */
  const DocsVersion = sequelize.define('DocsVersion', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    docsId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: '文档ID'
    },
    version: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: '版本号'
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
      comment: '标题'
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: '内容'
    },
    note: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '版本说明'
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: '创建者ID'
    }
  }, {
    tableName: 'docs_versions',
    timestamps: true,
    indexes: [
      {
        fields: ['docsId']
      },
      {
        fields: ['version']
      },
      {
        fields: ['createdBy']
      },
      {
        fields: ['createdAt']
      }
    ]
  });

  /**
   * 文档点赞模型
   */
  const DocsLike = sequelize.define('DocsLike', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    docsId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: '文档ID'
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: '用户ID'
    }
  }, {
    tableName: 'docs_likes',
    timestamps: true,
    indexes: [
      {
        fields: ['docsId']
      },
      {
        fields: ['userId']
      },
      {
        unique: true,
        fields: ['docsId', 'userId']
      }
    ]
  });

  /**
   * 文档收藏模型
   */
  const DocsFavorite = sequelize.define('DocsFavorite', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    docsId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: '文档ID'
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: '用户ID'
    }
  }, {
    tableName: 'docs_favorites',
    timestamps: true,
    indexes: [
      {
        fields: ['docsId']
      },
      {
        fields: ['userId']
      },
      {
        unique: true,
        fields: ['docsId', 'userId']
      }
    ]
  });

  /**
   * 文档阅读记录模型
   */
  const DocsRead = sequelize.define('DocsRead', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    docsId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: '文档ID'
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: '用户ID'
    },
    readDuration: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '阅读时长（秒）'
    },
    readProgress: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
      comment: '阅读进度（百分比）'
    }
  }, {
    tableName: 'docs_reads',
    timestamps: true,
    indexes: [
      {
        fields: ['docsId']
      },
      {
        fields: ['userId']
      },
      {
        fields: ['createdAt']
      }
    ]
  });

  /**
   * 文档附件模型
   */
  const DocsAttachment = sequelize.define('DocsAttachment', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    docsId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: '文档ID'
    },
    filename: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: '文件名'
    },
    originalName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: '原始文件名'
    },
    mimeType: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'MIME类型'
    },
    size: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '文件大小（字节）'
    },
    path: {
      type: DataTypes.STRING(500),
      allowNull: false,
      comment: '文件路径'
    },
    uploadedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: '上传者ID'
    }
  }, {
    tableName: 'docs_attachments',
    timestamps: true,
    indexes: [
      {
        fields: ['docsId']
      },
      {
        fields: ['uploadedBy']
      },
      {
        fields: ['mimeType']
      }
    ]
  });

  // 定义关联关系
  Docs.associate = (models) => {
    // 文档与分类
    Docs.belongsTo(models.DocsCategory, {
      foreignKey: 'categoryId',
      as: 'category'
    });

    // 文档与作者
    Docs.belongsTo(models.User, {
      foreignKey: 'authorId',
      as: 'author'
    });

    // 文档与标签（多对多）
    Docs.belongsToMany(models.DocsTag, {
      through: 'docs_tags_relations',
      foreignKey: 'docsId',
      otherKey: 'tagId',
      as: 'tags'
    });

    // 文档与评论
    Docs.hasMany(models.DocsComment, {
      foreignKey: 'docsId',
      as: 'comments'
    });

    // 文档与版本
    Docs.hasMany(models.DocsVersion, {
      foreignKey: 'docsId',
      as: 'versions'
    });

    // 文档与点赞
    Docs.hasMany(models.DocsLike, {
      foreignKey: 'docsId',
      as: 'likes'
    });

    // 文档与收藏
    Docs.hasMany(models.DocsFavorite, {
      foreignKey: 'docsId',
      as: 'favorites'
    });

    // 文档与阅读记录
    Docs.hasMany(models.DocsRead, {
      foreignKey: 'docsId',
      as: 'reads'
    });

    // 文档与附件
    Docs.hasMany(models.DocsAttachment, {
      foreignKey: 'docsId',
      as: 'attachments'
    });
  };

  DocsCategory.associate = (models) => {
    // 分类与文档
    DocsCategory.hasMany(models.Docs, {
      foreignKey: 'categoryId',
      as: 'docs'
    });

    // 分类与父分类
    DocsCategory.belongsTo(models.DocsCategory, {
      foreignKey: 'parentId',
      as: 'parent'
    });

    // 分类与子分类
    DocsCategory.hasMany(models.DocsCategory, {
      foreignKey: 'parentId',
      as: 'children'
    });
  };

  DocsTag.associate = (models) => {
    // 标签与文档（多对多）
    DocsTag.belongsToMany(models.Docs, {
      through: 'docs_tags_relations',
      foreignKey: 'tagId',
      otherKey: 'docsId',
      as: 'docs'
    });
  };

  DocsComment.associate = (models) => {
    // 评论与文档
    DocsComment.belongsTo(models.Docs, {
      foreignKey: 'docsId',
      as: 'doc'
    });

    // 评论与用户
    DocsComment.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });

    // 评论与父评论
    DocsComment.belongsTo(models.DocsComment, {
      foreignKey: 'parentId',
      as: 'parent'
    });

    // 评论与子评论
    DocsComment.hasMany(models.DocsComment, {
      foreignKey: 'parentId',
      as: 'children'
    });
  };

  DocsVersion.associate = (models) => {
    // 版本与文档
    DocsVersion.belongsTo(models.Docs, {
      foreignKey: 'docsId',
      as: 'doc'
    });

    // 版本与创建者
    DocsVersion.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator'
    });
  };

  DocsLike.associate = (models) => {
    // 点赞与文档
    DocsLike.belongsTo(models.Docs, {
      foreignKey: 'docsId',
      as: 'doc'
    });

    // 点赞与用户
    DocsLike.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  DocsFavorite.associate = (models) => {
    // 收藏与文档
    DocsFavorite.belongsTo(models.Docs, {
      foreignKey: 'docsId',
      as: 'doc'
    });

    // 收藏与用户
    DocsFavorite.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  DocsRead.associate = (models) => {
    // 阅读记录与文档
    DocsRead.belongsTo(models.Docs, {
      foreignKey: 'docsId',
      as: 'doc'
    });

    // 阅读记录与用户
    DocsRead.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  DocsAttachment.associate = (models) => {
    // 附件与文档
    DocsAttachment.belongsTo(models.Docs, {
      foreignKey: 'docsId',
      as: 'doc'
    });

    // 附件与上传者
    DocsAttachment.belongsTo(models.User, {
      foreignKey: 'uploadedBy',
      as: 'uploader'
    });
  };

  return {
    Docs,
    DocsCategory,
    DocsTag,
    DocsComment,
    DocsVersion,
    DocsLike,
    DocsFavorite,
    DocsRead,
    DocsAttachment
  };
};