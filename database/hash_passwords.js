const bcrypt = require('bcryptjs');
const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const dbPath = path.join(__dirname, 'aims.db');
const db = new DatabaseSync(dbPath);

const defaultPassword = 'password123';
const salt = bcrypt.genSaltSync(10);
const hash = bcrypt.hashSync(defaultPassword, salt);

console.log('[SECURITY] Generated Bcrypt Hash for "password123":', hash);

const updateStmt = db.prepare('UPDATE users SET password_hash = ? WHERE user_id = ?');

const users = db.prepare('SELECT user_id, full_name, email, role FROM users').all();
for (const u of users) {
  updateStmt.run(hash, u.user_id);
  console.log(`[SECURITY] Updated user #${u.user_id} (${u.full_name} - ${u.role}) with bcrypt password hash.`);
}

console.log('[SECURITY] All user accounts secured with Bcrypt!');
