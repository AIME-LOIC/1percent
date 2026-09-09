"use strict";
/* ============================================================
   API Client — HTTP requests to 1% Learn backend
   ============================================================ */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiClient = void 0;
const vscode = __importStar(require("vscode"));
const https = __importStar(require("https"));
const http = __importStar(require("http"));
class ApiClient {
    context;
    token;
    apiUrl;
    ready;
    constructor(context) {
        this.context = context;
        this.token = undefined;
        this.apiUrl = vscode.workspace.getConfiguration('onepercent').get('apiUrl', 'https://learn.1percent.rw');
        this.ready = this.loadToken();
    }
    async loadToken() {
        try {
            const stored = await this.context.secrets.get('onepercent-token');
            this.token = stored || undefined;
        }
        catch {
            this.token = undefined;
        }
    }
    getApiUrl() {
        return this.apiUrl;
    }
    isAuthenticated() {
        return !!this.token;
    }
    async login(email, password) {
        const data = await this.request('POST', '/api/auth/login', { email, password });
        // Backend returns: { session: { access_token, refresh_token, expires_at }, user: {...} }
        const accessToken = data.session?.access_token || data.token || data.access_token;
        if (accessToken) {
            this.token = accessToken;
            await this.context.secrets.store('onepercent-token', accessToken);
        }
        else {
            throw new Error('No token received from server');
        }
    }
    logout() {
        this.token = undefined;
        this.context.secrets.delete('onepercent-token');
    }
    async getChallenges() {
        const data = await this.request('GET', '/api/challenges');
        return data.challenges || data || [];
    }
    async getCourses() {
        const data = await this.request('GET', '/api/courses');
        return data.courses || [];
    }
    async submitChallenge(challengeId, code) {
        return this.request('POST', `/api/challenges/${challengeId}/submit`, { code });
    }
    async getFiles() {
        const data = await this.request('GET', '/api/files');
        return data.files || [];
    }
    async syncFile(fileName, content, language) {
        // Try to find existing file by name, then update or create
        const data = await this.request('GET', '/api/files');
        const files = data.files || [];
        const existing = files.find(f => f.file_name === fileName);
        if (existing) {
            await this.request('PUT', `/api/files/${existing.id}`, { content });
        }
        else {
            await this.request('POST', '/api/files', { file_name: fileName, content, language });
        }
    }
    async getPremiumStatus() {
        return this.request('GET', '/api/premium/status');
    }
    request(method, path, body) {
        return new Promise((resolve, reject) => {
            try {
                const url = new URL(`${this.apiUrl}${path}`);
                const isHttps = url.protocol === 'https:';
                const client = isHttps ? https : http;
                const headers = {
                    'Content-Type': 'application/json'
                };
                if (this.token) {
                    headers['Authorization'] = `Bearer ${this.token}`;
                }
                const options = {
                    hostname: url.hostname,
                    port: url.port || (isHttps ? 443 : 80),
                    path: url.pathname + url.search,
                    method,
                    headers,
                    timeout: 15000
                };
                const req = client.request(options, (res) => {
                    let data = '';
                    res.on('data', (chunk) => { data += chunk.toString(); });
                    res.on('end', () => {
                        try {
                            const json = JSON.parse(data);
                            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                                resolve(json);
                            }
                            else {
                                reject(new Error(json.error || json.message || `Request failed (${res.statusCode})`));
                            }
                        }
                        catch {
                            reject(new Error(`Invalid response: ${data.substring(0, 200)}`));
                        }
                    });
                });
                req.on('error', (err) => reject(err));
                req.on('timeout', () => {
                    req.destroy();
                    reject(new Error('Request timed out'));
                });
                if (body) {
                    req.write(JSON.stringify(body));
                }
                req.end();
            }
            catch (err) {
                reject(err);
            }
        });
    }
}
exports.ApiClient = ApiClient;
//# sourceMappingURL=api.js.map