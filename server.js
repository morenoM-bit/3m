const express = require('express');
const cors = require('cors');
const path = require('path');
const mikrotikConfig = require('./config/mikrotik');
const storageConfig = require('./config/storage');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// 1. Endpoint Login Admin Panel
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

  if (password === adminPassword) {
    return res.json({ success: true, message: 'Login admin berhasil' });
  } else {
    return res.status(401).json({ success: false, message: 'Password admin salah' });
  }
});

// 2. Endpoint Register User Baru
app.post('/api/register', async (req, res) => {
  try {
    const { username, password, fullName, phone, email } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username dan password wajib diisi' });
    }

    const existingUser = await storageConfig.getUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Username sudah terdaftar' });
    }

    const newUser = {
      username,
      password,
      fullName: fullName || username,
      phone: phone || '',
      email: email || '',
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    await storageConfig.addUser(newUser);

    res.json({ success: true, message: 'Pendaftaran berhasil, menunggu persetujuan admin' });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: 'Gagal melakukan pendaftaran: ' + error.message });
  }
});

// 3. Endpoint Login User Hotspot
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await storageConfig.getUserByUsername(username);
    if (!user || user.password !== password) {
      return res.status(401).json({ success: false, message: 'Username atau password salah' });
    }

    if (user.status !== 'approved') {
      return res.status(403).json({ success: false, message: 'Akun Anda belum disetujui oleh admin' });
    }

    res.json({ success: true, message: 'Login berhasil', user });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Gagal login: ' + error.message });
  }
});

// 4. Endpoint Approve User (Admin Only)
app.post('/api/approve', async (req, res) => {
  try {
    const { username, adminName } = req.body;
    
    if (!username) {
      return res.status(400).json({ success: false, message: 'Username is required' });
    }
    
    await storageConfig.approveUser(username, adminName || 'Admin');
    
    const userData = await storageConfig.getUserByUsername(username);
    if (!userData) {
      return res.status(404).json({ success: false, message: 'User data not found in storage' });
    }

    if (mikrotikConfig.addUserToHotspot && typeof mikrotikConfig.addUserToHotspot === 'function') {
      const result = await mikrotikConfig.addUserToHotspot(userData.username, userData.password);
      if (!result.success) {
        console.error('Gagal sync ke MikroTik:', result.message);
      }
    }
    
    res.json({ success: true, message: 'User approved and added to MikroTik successfully' });
  } catch (error) {
    console.error('Approval error:', error);
    res.status(500).json({ success: false, message: 'Approval failed: ' + error.message });
  }
});

// 5. Endpoint Ambil Semua User (Admin Only)
app.get('/api/users', async (req, res) => {
  try {
    const users = await storageConfig.getAllUsers();
    res.json({ success: true, users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil data user' });
  }
});

// 5b. Endpoint Cek Status Spesifik User
app.get('/api/users/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const user = await storageConfig.getUserByUsername(username);

    if (user) {
      return res.json({ 
        success: true, 
        user: { 
          username: user.username, 
          status: user.status 
        } 
      });
    } else {
      return res.json({ success: false, message: 'User tidak ditemukan' });
    }
  } catch (error) {
    console.error('Cek status error:', error);
    res.json({ success: false, message: 'Gagal mengecek status user' });
  }
});

// 6. Endpoint Ambil Statistik Traffic Realtime Per-User (Active Users)
app.get('/api/mikrotik/active', async (req, res) => {
  try {
    if (mikrotikConfig.getActiveUsers && typeof mikrotikConfig.getActiveUsers === 'function') {
      const activeUsers = await mikrotikConfig.getActiveUsers();
      return res.json({ success: true, activeUsers });
    }
    res.json({ success: true, activeUsers: [] });
  } catch (error) {
    console.error('Active users traffic error:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil traffic realtime MikroTik' });
  }
});

// 7. Endpoint Ambil Statistik Umum Traffic / Online MikroTik
app.get('/api/mikrotik/stats', async (req, res) => {
  try {
    if (mikrotikConfig.getUsersStats && typeof mikrotikConfig.getUsersStats === 'function') {
      const stats = await mikrotikConfig.getUsersStats();
      return res.json({ success: true, stats });
    }
    res.json({ success: true, stats: [] });
  } catch (error) {
    console.error('Mikrotik stats error:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil statistik MikroTik' });
  }
});

// Routing Halaman Admin & Catch-all
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
