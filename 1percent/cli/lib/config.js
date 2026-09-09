/* ============================================================
   Config Manager — Stores auth tokens and API URL
   ============================================================ */

const Conf = require('conf');
const path = require('path');

const DEFAULT_API_URL = 'https://learn.1percent.rw';

const config = new Conf({
  projectName: '1percent-learn-cli',
  defaults: {
    apiUrl: DEFAULT_API_URL,
    token: null,
    user: null
  }
});

module.exports = {
  getApiUrl() {
    return config.get('apiUrl');
  },

  setApiUrl(url) {
    config.set('apiUrl', url);
  },

  getToken() {
    return config.get('token');
  },

  setToken(token) {
    config.set('token', token);
  },

  getUser() {
    return config.get('user');
  },

  setUser(user) {
    config.set('user', user);
  },

  clearAuth() {
    config.delete('token');
    config.delete('user');
  },

  isLoggedIn() {
    return !!config.get('token');
  },

  resetApiUrl() {
    config.set('apiUrl', DEFAULT_API_URL);
  }
};
