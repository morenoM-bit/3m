const { RouterOSClient } = require('routeros-client');

class MikrotikConfig {
  constructor() {
    this.host = process.env.MIKROTIK_HOST || process.env.MIKROTIK_IP;
    this.user = process.env.MIKROTIK_USER || process.env.MIKROTIK_API_USER;
    this.password = process.env.MIKROTIK_PASSWORD || process.env.MIKROTIK_API_PASSWORD;
    this.port = parseInt(process.env.MIKROTIK_PORT || process.env.MIKROTIK_API_PORT || '3111', 10);
  }

  async connect() {
    const client = new RouterOSClient({
      host: this.host,
      port: this.port,
      user: this.user,
      password: this.password,
      timeout: 10000
    });
    return await client.connect();
  }

  async addUserToHotspot(username, password, profile = 'default') {
    let api;
    try {
      api = await this.connect();
      await api.menu('/ip/hotspot/user').add({
        name: username,
        password: password,
        profile: profile
      });
      console.log(`Berhasil menambahkan user ${username} via API!`);
      return { success: true, message: 'User added to hotspot' };
    } catch (error) {
      console.error('Error adding user via API:', error);
      return { success: false, message: error.message };
    } finally {
      if (api) api.close();
    }
  }

  async removeUserFromHotspot(username) {
    let api;
    try {
      api = await this.connect();
      const userMenu = api.menu('/ip/hotspot/user');
      const users = await userMenu.where('name', username).get();
      
      if (!users || users.length === 0) {
        return { success: false, message: 'User tidak ditemukan' };
      }

      await userMenu.remove(users[0]['.id']);
      return { success: true, message: 'User berhasil dihapus' };
    } catch (error) {
      console.error('Error removing user via API:', error);
      return { success: false, message: error.message };
    } finally {
      if (api) api.close();
    }
  }
}

module.exports = new MikrotikConfig();
