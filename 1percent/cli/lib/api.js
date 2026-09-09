/* ============================================================
   API Client — HTTP requests to 1% Learn backend
   ============================================================ */

const fetch = require('node-fetch');
const config = require('./config');

class ApiClient {
  constructor() {
    this.baseUrl = config.getApiUrl();
  }

  /**
   * Make an authenticated request
   */
  async request(method, path, body = null) {
    const url = `${this.baseUrl}${path}`;
    const token = config.getToken();

    const headers = {
      'Content-Type': 'application/json'
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const options = { method, headers };
    if (body && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data.error || data.message || `Request failed (${response.status})`);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  // ---- Auth ----

  async login(email, password) {
    const data = await this.request('POST', '/api/auth/login', { email, password });
    const token = data.session?.access_token || data.token || data.access_token;
    if (token) {
      config.setToken(token);
      config.setUser(data.user || { email });
    }
    return data;
  }

  async signup(email, password, fullName) {
    return this.request('POST', '/api/auth/signup', { email, password, full_name: fullName });
  }

  // ---- Files (Lab) ----

  async getFiles() {
    return this.request('GET', '/api/files');
  }

  async getFile(fileId) {
    return this.request('GET', `/api/files/${fileId}`);
  }

  async saveFile(fileName, content, language) {
    return this.request('POST', '/api/files', { file_name: fileName, content, language });
  }

  async updateFile(fileId, content) {
    return this.request('PUT', `/api/files/${fileId}`, { content });
  }

  async deleteFile(fileId) {
    return this.request('DELETE', `/api/files/${fileId}`);
  }

  async getUsage() {
    return this.request('GET', '/api/files/usage');
  }

  // ---- Premium ----

  async getPremiumStatus() {
    return this.request('GET', '/api/premium/status');
  }

  async getTiers() {
    return this.request('GET', '/api/premium/tiers');
  }

  // ---- Courses / Lessons ----

  async getCourses() {
    return this.request('GET', '/api/courses');
  }

  async getCourse(slug) {
    return this.request('GET', `/api/courses/${slug}`);
  }

  async getLesson(courseId, lessonId) {
    return this.request('GET', `/api/courses/${courseId}/lessons/${lessonId}`);
  }

  // ---- Challenges ----

  async getChallenges() {
    return this.request('GET', '/api/challenges');
  }

  async submitChallenge(challengeId, code) {
    return this.request('POST', `/api/challenges/${challengeId}/submit`, { code });
  }

  // ---- Coins ----

  async getCoins() {
    return this.request('GET', '/api/coins/balance');
  }
}

module.exports = new ApiClient();
