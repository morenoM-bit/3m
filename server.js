// Approve user (admin only)
app.post('/api/approve', async (req, res) => {
  try {
    const { username, adminName } = req.body;
    
    if (!username) {
      return res.status(400).json({ success: false, message: 'Username is required' });
    }
    
    // 1. Update status di storage / Redis
    await storageConfig.approveUser(username, adminName || 'Admin');
    
    // 2. Ambil data password user dari storage
    const userData = await storageConfig.getUserByUsername(username);
    if (!userData) {
      return res.status(404).json({ success: false, message: 'User data not found in storage' });
    }

    // 3. Tambahkan ke MikroTik Hotspot
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
