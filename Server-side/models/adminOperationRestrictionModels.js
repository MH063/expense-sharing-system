module.exports = (sequelize, DataTypes) => {
  const AdminOperationRestriction = require('./adminOperationRestriction')(sequelize, DataTypes);
  const AdminOperationRestrictionLog = require('./adminOperationRestrictionLog')(sequelize, DataTypes);
  const AdminOperationRestrictionStats = require('./adminOperationRestrictionStats')(sequelize, DataTypes);
  const AdminOperationRestrictionException = require('./adminOperationRestrictionException')(sequelize, DataTypes);
  const AdminOperationRestrictionConfig = require('./adminOperationRestrictionConfig')(sequelize, DataTypes);

  return {
    AdminOperationRestriction,
    AdminOperationRestrictionLog,
    AdminOperationRestrictionStats,
    AdminOperationRestrictionException,
    AdminOperationRestrictionConfig
  };
};