const crypto = require('crypto');
const mongoose = require('mongoose');

const ROLES = ['viewer', 'analyst', 'admin'];
const ITERATIONS = 210000;
const KEY_LENGTH = 32;
const DIGEST = 'sha256';

const hashPassword = (password, salt = crypto.randomBytes(16).toString('hex')) => ({
  salt,
  hash: crypto.pbkdf2Sync(String(password), salt, ITERATIONS, KEY_LENGTH, DIGEST).toString('hex'),
});

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true, lowercase: true },
  role: { type: String, required: true, enum: ROLES, default: 'viewer' },
  passwordHash: { type: String, required: true },
  passwordSalt: { type: String, required: true },
  active: { type: Boolean, default: true },
  lastLoginAt: Date,
}, { timestamps: true });

userSchema.methods.setPassword = function setPassword(password) {
  const credentials = hashPassword(password);
  this.passwordSalt = credentials.salt;
  this.passwordHash = credentials.hash;
};

userSchema.methods.verifyPassword = function verifyPassword(password) {
  const credentials = hashPassword(password, this.passwordSalt);
  const expected = Buffer.from(this.passwordHash, 'hex');
  const actual = Buffer.from(credentials.hash, 'hex');
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
};

userSchema.statics.upsertWithPassword = async function upsertWithPassword({ username, password, role }) {
  const credentials = hashPassword(password);
  return this.findOneAndUpdate(
    { username: String(username).trim().toLowerCase() },
    {
      username: String(username).trim().toLowerCase(),
      role,
      passwordHash: credentials.hash,
      passwordSalt: credentials.salt,
      active: true,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
};

module.exports = mongoose.model('User', userSchema);
