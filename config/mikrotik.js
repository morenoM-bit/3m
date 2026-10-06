const { RouterOSClient } = require('routeros-client');

class MikrotikConfig {
  constructor() {
    this.host = process.env.MIKROTIK_HOST || process.env.MIKROTIK_IP || 'idn27.tunnel.id';
    this.user = process.env.MIKROTIK_USER || process.env.MIKROTIK_API_USER;
    this.password = process.env.MIKROTIK_PASSWORD || process.env.MIKROTIK_API_PASSWORD;
    // Set default port remote Tunnel.id ke 3111
    this.port = parseInt(process.env.MIKROTIK_PORT || process.env.MIKROTIK_API_PORT || '3111', 10);
  }

  getClient() {
    return new RouterOSClient({
      host: this.host,
      port: this.port,
      user: this.user,
      password: this.password,
      timeout: 10000
    });
  }

  // 1. Tambah User ke Hotspot MikroTik
  async addUserToHotspot(username, password, profile = 'default') {
    const client = this.getClient();
    try {
      const api = await client.connect();
      await api.menu('/ip/hotspot/user').add({
        name: username,
        password: password,
        profile: profile,
        server: 'all'
      });
      console.log(`Berhasil menambahkan user ${username} via API!`);
      return { success: true, message: 'User added to hotspot' };
    } catch (error) {
      console.error('Error adding user via API:', error.message);
      return { success: false, message: error.message };
    } finally {
      try { await client.close(); } catch (e) {}
    }
  }

  // 2. Hapus User dari Hotspot MikroTik
  async removeUserFromHotspot(username) {
    const client = this.getClient();
    try {
      const api = await client.connect();
      const userMenu = api.menu('/ip/hotspot/user');
      const users = await userMenu.where('name', username).get();
      
      if (!users || users.length === 0) {
        return { success: false, message: 'User tidak ditemukan di MikroTik' };
      }

      await userMenu.remove(users[0]['.id']);
      return { success: true, message: 'User berhasil dihapus' };
    } catch (error) {
      console.error('Error removing user via API:', error.message);
      return { success: false, message: error.message };
    } finally {
      try { await client.close(); } catch (e) {}
    }
  }

  // 3. Ambil Statistik User (Uptime & Traffic)
  async getUsersStats() {
    const client = this.getClient();
    try {
      const api = await client.connect();
      const mtUsers = await api.menu('/ip/hotspot/user').get();
      const mtActive = await api.menu('/ip/hotspot/active').get();
      
      return mtUsers.map(u => {
        const active = mtActive.find(act => act.user && act.user.toLowerCase() === u.name.toLowerCase());
        return {
          name: u.name,
          user: u.name,
          'bytes-in': u['bytes-in'] || 0,
          'bytes-out': u['bytes-out'] || 0,
          uptime: active ? `${active.uptime} (Online)` : (u.uptime || 'Off')
        };
      });
    } catch (error) {
      console.error('Error getting user stats via API:', error.message);
      return [];
    } finally {
      try { await client.close(); } catch (e) {}
    }
  }
}

module.exports = new MikrotikConfig();
