const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./models');

const attendanceRoutes = require('./routes/attendance');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/attendance', attendanceRoutes);

// Replace express.static with a minimal custom static file handler to avoid mime.lookup errors
const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, 'public');
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

app.use((req, res, next) => {
  // Do not interfere with API routes
  if (req.path.startsWith('/api/')) return next();

  // Map root to index.html
  const reqPath = req.path === '/' ? '/index.html' : req.path;

  // Basic safety: decode and normalize path, prevent directory traversal
  let safePath;
  try {
    safePath = path.normalize(decodeURIComponent(reqPath));
  } catch (err) {
    return res.status(400).end();
  }
  const filePath = path.join(PUBLIC_DIR, safePath);

  if (!filePath.startsWith(PUBLIC_DIR)) return res.status(400).end();

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) return next();
    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    const stream = fs.createReadStream(filePath);
    stream.on('error', () => res.status(500).end());
    stream.pipe(res);
  });
});

// Fallback for unmatched API routes (keep existing 404 for others)
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

const PORT = process.env.PORT || 4000;

// Use authenticate + retry loop so app waits until MySQL is ready
async function startServer() {
  const maxRetries = parseInt(process.env.DB_CONNECT_RETRIES, 10) || 10;
  const retryDelay = parseInt(process.env.DB_CONNECT_RETRY_DELAY_MS, 10) || 2000;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      attempt++;
      await db.sequelize.authenticate();
      await db.sequelize.sync();
      console.log('MySQL connected and tables created');
      app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
      return;
    } catch (err) {
      console.log(`DB connect attempt ${attempt}/${maxRetries} failed: ${err.message}`);
      if (attempt >= maxRetries) {
        console.error('Exceeded max DB connection attempts, exiting');
        process.exit(1);
      }
      await new Promise(r => setTimeout(r, retryDelay));
    }
  }
}

startServer().catch(err => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});

module.exports = app;
