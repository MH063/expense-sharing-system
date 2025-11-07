const bcrypt = require('bcryptjs');

const DEFAULT_SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS || 10);

async function hashPassword(plainTextPassword, saltRounds = DEFAULT_SALT_ROUNDS) {
  if (typeof plainTextPassword !== 'string' || plainTextPassword.length < 6) {
    throw new Error('密码强度不足');
  }
  return await bcrypt.hash(plainTextPassword, saltRounds);
}

async function verifyPassword(plainTextPassword, passwordHash) {
  if (!passwordHash) return false;
  return await bcrypt.compare(plainTextPassword, passwordHash);
}

module.exports = {
  hashPassword,
  verifyPassword,
};