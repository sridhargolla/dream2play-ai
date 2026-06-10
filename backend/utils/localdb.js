const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '..', 'local_db.json');

// Default empty database structure
const DEFAULT_DB = {
  users: [],
  dreams: [],
  scores: [],
};

function readDb() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2));
      return DEFAULT_DB;
    }
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading local JSON database, returning in-memory store:', err.message);
    return DEFAULT_DB;
  }
}

function writeDb(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error writing to local JSON database:', err.message);
  }
}

// User Methods
function findUserByEmail(email) {
  const db = readDb();
  return db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

function findUserById(id) {
  const db = readDb();
  return db.users.find((u) => u.id === id);
}

function createUser(user) {
  const db = readDb();
  const newUser = { id: Date.now().toString(), ...user };
  db.users.push(newUser);
  writeDb(db);
  return newUser;
}

// Dream Methods
function getDreamsByUser(userId) {
  const db = readDb();
  return db.dreams.filter((d) => d.userId === userId);
}

function saveDream(dream) {
  const db = readDb();
  const newDream = { id: dream.id || Date.now().toString(), createdAt: new Date().toISOString(), ...dream };
  db.dreams.push(newDream);
  writeDb(db);
  return newDream;
}

function deleteDream(id, userId) {
  const db = readDb();
  const initialCount = db.dreams.length;
  db.dreams = db.dreams.filter((d) => !(d.id === id && d.userId === userId));
  writeDb(db);
  return db.dreams.length < initialCount;
}

function getDreamById(id) {
  const db = readDb();
  return db.dreams.find((d) => d.id === id);
}

// Score Methods
function getScores() {
  const db = readDb();
  // Return sorted high scores (descending score, ascending time)
  return db.scores.sort((a, b) => b.score - a.score || a.completionTime - b.completionTime).slice(0, 50); // limit to top 50
}

function saveScore(score) {
  const db = readDb();
  const newScore = { id: Date.now().toString(), date: new Date().toISOString(), ...score };
  db.scores.push(newScore);
  writeDb(db);
  return newScore;
}

module.exports = {
  findUserByEmail,
  findUserById,
  createUser,
  getDreamsByUser,
  saveDream,
  deleteDream,
  getDreamById,
  getScores,
  saveScore,
};
