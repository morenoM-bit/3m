/* ==========================================================================
   JUDUL: SERVER BACKEND (EXPRESS.JS & SOCKET.IO)
   NAMA FILE: server.js
   DESKRIPSI: Server backend untuk menangani API Admin & Trafik Realtime
   ========================================================================== */

// --------------------------------------------------------------------------
// BAGIAN 1: IMPORT LIBRARY / MODUL YANG DIBUTUHKAN
// --------------------------------------------------------------------------
const express = require('express');
const http = require('http');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');

// --------------------------------------------------------------------------
// BAGIAN 2: INISIALISASI APLIKASI DAN KONFIGURASI SERVER
// --------------------------------------------------------------------------
const app = express();
const server = http.createServer(app);

// Konfigurasi WebSocket (Socket.io) untuk komunikasi realtime dengan frontend
const io = new Server(server, {
  cors: {
    origin: "*", // Mengizinkan semua domain mengakses server
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Kunci rahasia JWT & Password Admin (Bisa diganti sesuai kebutuhan)
const JWT_SECRET = process.env.JWT_SECRET || 'secret_key_triple_m_hotspot';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// --------------------------------------------------------------------------
// BAGIAN 3: DATABASE DUMMY (DATA PENGGUNA MIKROTIK/HOTSPOT)
// --------------------------------------------------------------------------
let users = [
  {
    id: 1,
    username: 'user01',
    status: 'pending', // Pilihan status: pending, active, rejected
    download: 102450000, // Ukuran data dalam satuan Bytes
    upload: 52400000,
    created_at: new Date()
  },
  {
    id: 2,
    username: 'user02',
    status: 'active',
    download: 512000000,
    upload: 120000000,
    created_at: new Date()
  }
];

// --------------------------------------------------------------------------
// BAGIAN 4: MIDDLEWARE KEAMANAN (VERIFIKASI TOKEN ADMIN)
// --------------------------------------------------------------------------
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Akses ditolak. Token tidak ditemukan.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Token tidak valid atau sudah kadaluwarsa.' });
    }
    req.user = user;
    next();
  });
}

// --------------------------------------------------------------------------
// BAGIAN 5: ENDPOINT API (LOGIN & MANAJEMEN USER)
// --------------------------------------------------------------------------

// 5.1. Endpoint Login Admin
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;

  if (password === ADMIN_PASSWORD) {
    const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '1d' });
    return res.json({ success: true, token, message: 'Login berhasil' });
  }

  return res.status(401).json({ success: false, message: 'Password salah' });
});

// 5.2. Endpoint Mengambil Seluruh Data Pengguna
app.get('/api/users', authenticateToken, (req, res) => {
  res.json({ success: true, users });
});

// 5.3. Endpoint Menyetujui Pengguna (Approve)
app.post('/api/approve', authenticateToken, (req, res) => {
  const { username } = req.body;
  const user = users.find(u => u.username === username);

  if (!user) {
    return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan' });
  }

  user.status = 'active';
  res.json({ success: true, message: `Pengguna ${username} telah disetujui.` });
});

// 5.4. Endpoint Menolak Pengguna (Reject)
app.post('/api/reject', authenticateToken, (req, res) => {
  const { username } = req.body;
  const user = users.find(u => u.username === username);

  if (!user) {
    return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan' });
  }

  user.status = 'rejected';
  res.json({ success: true, message: `Pengguna ${username} ditolak.` });
});

// 5.5. Endpoint Menghapus Pengguna (Delete)
app.delete('/api/users/:username', authenticateToken, (req, res) => {
  const { username } = req.params;
  const initialLength = users.length;
  users = users.filter(u => u.username !== username);

  if (users.length === initialLength) {
    return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan' });
  }

  res.json({ success: true, message: `Pengguna ${username} berhasil dihapus.` });
});

// --------------------------------------------------------------------------
// BAGIAN 6: FITUR REALTIME TRAFFIC MONITOR (SOCKET.IO)
// --------------------------------------------------------------------------
io.on('connection', (socket) => {
  console.log('Admin terhubung ke Realtime Monitor Socket ID:', socket.id);

  // Mengirim data kecepatan trafik (Mbps) secara realtime setiap 1 detik
  const trafficInterval = setInterval(() => {
    // Simulasi data trafik acak (Download: 5-50 Mbps, Upload: 1-20 Mbps)
    const downloadSpeed = (Math.random() * (50 - 5) + 5).toFixed(2);
    const uploadSpeed = (Math.random() * (20 - 1) + 1).toFixed(2);

    socket.emit('trafficData', {
      timestamp: new Date().toLocaleTimeString(),
      downloadMbps: parseFloat(downloadSpeed),
      uploadMbps: parseFloat(uploadSpeed)
    });
  }, 1000);

  // Membersihkan koneksi saat admin terputus / mereload halaman
  socket.on('disconnect', () => {
    console.log('Admin terputus dari Realtime Monitor');
    clearInterval(trafficInterval);
  });
});

// --------------------------------------------------------------------------
// BAGIAN 7: MENJALANKAN SERVER
// --------------------------------------------------------------------------
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server Triple M Hotspot Backend berjalan di port ${PORT}`);
});
