/* ==========================================================================
   JUDUL: SERVER BACKEND (EXPRESS.JS & SOCKET.IO)
   NAMA FILE: server.js
   ========================================================================== */

const express = require('express');
const http = require('http');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const JWT_SECRET = process.env.JWT_SECRET || 'secret_key_triple_m_hotspot';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Data Pengguna dengan Nama Realistis
let users = [
  {
    id: 1,
    username: 'Budi_Santoso',
    status: 'pending',
    download: 102450000,
    upload: 52400000,
    downloadSpeed: 0,
    uploadSpeed: 0,
    created_at: new Date()
  },
  {
    id: 2,
    username: 'Rizky_Gamer',
    status: 'active',
    download: 512000000,
    upload: 120000000,
    downloadSpeed: 14.2,
    uploadSpeed: 3.5,
    created_at: new Date()
  },
  {
    id: 3,
    username: 'Siti_Office',
    status: 'active',
    download: 240000000,
    upload: 85000000,
    downloadSpeed: 5.8,
    uploadSpeed: 1.2,
    created_at: new Date()
  },
  {
    id: 4,
    username: 'Moreno_VIP',
    status: 'active',
    download: 890000000,
    upload: 310000000,
    downloadSpeed: 28.4,
    uploadSpeed: 8.7,
    created_at: new Date()
  }
];

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Akses ditolak. Token tidak ditemukan.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Token tidak valid.' });
    }
    req.user = user;
    next();
  });
}

// Endpoint Login Admin
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '1d' });
    return res.json({ success: true, token, message: 'Login berhasil' });
  }
  return res.status(401).json({ success: false, message: 'Password salah' });
});

// Endpoint Ambil Users
app.get('/api/users', authenticateToken, (req, res) => {
  res.json({ success: true, users });
});

// Endpoint Approve
app.post('/api/approve', authenticateToken, (req, res) => {
  const { username } = req.body;
  const user = users.find(u => u.username === username);
  if (!user) return res.status(404).json({ success: false, message: 'User tidak ditemukan' });

  user.status = 'active';
  res.json({ success: true, message: `Pengguna ${username} disetujui.` });
});

// Endpoint Reject
app.post('/api/reject', authenticateToken, (req, res) => {
  const { username } = req.body;
  const user = users.find(u => u.username === username);
  if (!user) return res.status(404).json({ success: false, message: 'User tidak ditemukan' });

  user.status = 'rejected';
  user.downloadSpeed = 0;
  user.uploadSpeed = 0;
  res.json({ success: true, message: `Pengguna ${username} ditolak.` });
});

// Endpoint Delete
app.delete('/api/users/:username', authenticateToken, (req, res) => {
  const { username } = req.params;
  const initialLength = users.length;
  users = users.filter(u => u.username !== username);

  if (users.length === initialLength) {
    return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
  }
  res.json({ success: true, message: `Pengguna ${username} dihapus.` });
});

// Realtime Socket.io per User
io.on('connection', (socket) => {
  const trafficInterval = setInterval(() => {
    users.forEach(u => {
      if (u.status === 'active') {
        u.downloadSpeed = parseFloat((Math.random() * (35 - 2) + 2).toFixed(2));
        u.uploadSpeed = parseFloat((Math.random() * (12 - 0.5) + 0.5).toFixed(2));
        u.download += Math.floor(u.downloadSpeed * 125000);
        u.upload += Math.floor(u.uploadSpeed * 125000);
      } else {
        u.downloadSpeed = 0;
        u.uploadSpeed = 0;
      }
    });

    socket.emit('userTrafficUpdate', {
      timestamp: new Date().toLocaleTimeString(),
      users: users
    });
  }, 1000);

  socket.on('disconnect', () => {
    clearInterval(trafficInterval);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server Triple M Hotspot berjalan di port ${PORT}`);
});
