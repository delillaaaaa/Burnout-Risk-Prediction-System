const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Database SQLite lokal
const db = new sqlite3.Database('./burnout.db');
db.run(`CREATE TABLE IF NOT EXISTS assessments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_name TEXT,
  score INTEGER,
  risk_level TEXT,
  date TEXT
)`);

app.post('/api/assessment', (req, res) => {
  const { user_name, score, risk_level, date } = req.body;
  db.run(
    'INSERT INTO assessments (user_name, score, risk_level, date) VALUES (?, ?, ?, ?)',
    [user_name, score, risk_level, date],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

app.get('/api/history', (req, res) => {
  db.all('SELECT * FROM assessments ORDER BY date DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.listen(PORT, () => console.log(`✅ Backend SQLite running at http://localhost:${PORT}`));