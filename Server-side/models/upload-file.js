module.exports = (sequelize, DataTypes) => {
  const UploadFile = sequelize.define('UploadFile', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    originalName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: '原始文件名'
    },
    filename: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: '存储文件名'
    },
    path: {
      type: DataTypes.STRING(500),
      allowNull: false,
      comment: '文件路径'
    },
    size: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '文件大小（字节）'
    },
    mimetype: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '文件类型'
    },
    uploadedBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: '上传者ID'
    },
    downloadCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: '下载次数'
    }
  }, {
    tableName: 'upload_files',
    timestamps: true,
    indexes: [
      {
        fields: ['originalName']
      },
      {
        fields: ['filename']
      },
      {
        fields: ['mimetype']
      },
      {
        fields: ['uploadedBy']
      },
      {
        fields: ['uploadTime']
      }
    ]
  });

  UploadFile.associate = (models) => {
    // 上传文件与用户关联（上传者）
    UploadFile.belongsTo(models.User, {
      foreignKey: 'uploadedBy',
      as: 'uploader'
    });
  };

  return UploadFile;
};