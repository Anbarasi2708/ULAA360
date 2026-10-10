const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const dbPath = path.join(__dirname, '..', 'data', 'ulaa360.sqlite');

let db = null;

async function initDB() {
  const SQL = await initSqlJs();
  
  if (fs.existsSync(dbPath)) {
    const filebuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(filebuffer);
  } else {
    db = new SQL.Database();
    // Create schema
    db.run(`
      CREATE TABLE IF NOT EXISTS depot_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_depot TEXT NOT NULL,
        dest_depot TEXT NOT NULL,
        reason TEXT,
        required_buses INTEGER,
        status TEXT DEFAULT 'PENDING',
        reject_reason TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Seed test admin accounts
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password_hash TEXT,
        role TEXT,
        depot_id TEXT
      );
    `);
    
    // Simple prototype hash for demo (in production use bcrypt)
    const hash = (pass) => Buffer.from(pass).toString('base64');
    
    db.run(`INSERT INTO users (username, password_hash, role, depot_id) VALUES 
      ('admin_kum', '${hash('kum@360')}', 'DEPOT_MANAGER', 'TNSTC_KUM'),
      ('admin_mdu', '${hash('mdu@360')}', 'DEPOT_MANAGER', 'TNSTC_MDU'),
      ('admin_cbe', '${hash('cbe@360')}', 'DEPOT_MANAGER', 'TNSTC_CBE')
    `);
    
    saveDB();
  }
}

function saveDB() {
  const data = db.export();
  const buffer = Buffer.from(data);
  const dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  fs.writeFileSync(dbPath, buffer);
}

function getDB() {
  return db;
}

module.exports = { initDB, getDB, saveDB };
