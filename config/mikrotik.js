class MikrotikConfig {
  constructor() {
    this.host = process.env.MIKROTIK_HOST || process.env.MIKROTIK_IP;
    this.user = process.env.MIKROTIK_USER || process.env.MIKROTIK_API_USER;
    this.password = process.env.MIKROTIK_PASSWORD || process.env.MIKROTIK_API_PASSWORD;
    this.port = process.env.MIKROTIK_PORT || process.env.MIKROTIK_API_PORT || 3111;
  }

  // Fungsi otomatis menambahkan user ke Hotspot MikroTik v7 via REST API
  async addUserToHotspot(username, password, profile = 'default') {
    try {
      const auth = Buffer.from(`${this.user}:${this.password}`).toString('base64');
      const url = `http://${this.host}:${this.port}/rest/ip/hotspot/user/add`;

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${auth}`
        },
        body: JSON.stringify({
          name: username,
          password: password,
          profile: profile
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('MikroTik REST API Error:', errorText);
        return { success: false, message: `Error MikroTik: ${errorText}` };
      }

      console.log(`Berhasil menambahkan user ${username} ke MikroTik Hotspot!`);
      return { success: true, message: 'User added to hotspot' };
    } catch (error) {
      console.error('Error adding user to hotspot:', error);
      return { success: false, message: error.message };
    }
  }

  // Fungsi hapus user dari Hotspot (opsional jika dibutuhkan)
  async removeUserFromHotspot(username) {
    try {
      const auth = Buffer.from(`${this.user}:${this.password}`).toString('base64');
      
      // Cari ID user berdasarkan nama
      const findRes = await fetch(`http://${this.host}:${this.port}/rest/ip/hotspot/user?name=${username}`, {
        headers: { 'Authorization': `Basic ${auth}` }
      });
      
      const users = await findRes.json();
      if (!users || users.length === 0) {
        return { success: false, message: 'User tidak ditemukan di MikroTik' };
      }

      const userId = users[0]['.id'];
      
      // Hapus user berdasarkan ID
      const delRes = await fetch(`http://${this.host}:${this.port}/rest/ip/hotspot/user/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Basic ${auth}` }
      });

      if (!delRes.ok) {
        return { success: false, message: 'Gagal menghapus user dari MikroTik' };
      }

      return { success: true, message: 'User berhasil dihapus' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

module.exports = new MikrotikConfig();
