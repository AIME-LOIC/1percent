/* ============================================================
   API Client — HTTP requests to 1% Learn backend
   ============================================================ */

import * as vscode from 'vscode';
import * as https from 'https';
import * as http from 'http';
import { Challenge, FileItem, PremiumStatus } from './types';

export class ApiClient {
  private context: vscode.ExtensionContext;
  private token: string | undefined;
  private apiUrl: string;

  readonly ready: Promise<void>;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.token = undefined;
    this.apiUrl = vscode.workspace.getConfiguration('onepercent').get('apiUrl', 'https://learn.1percent.rw');
    this.ready = this.loadToken();
  }

  private async loadToken(): Promise<void> {
    try {
      const stored = await this.context.secrets.get('onepercent-token');
      this.token = stored || undefined;
    } catch {
      this.token = undefined;
    }
  }

  getApiUrl(): string {
    return this.apiUrl;
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  async login(email: string, password: string): Promise<void> {
    const data = await this.request('POST', '/api/auth/login', { email, password });

    // Backend returns: { session: { access_token, refresh_token, expires_at }, user: {...} }
    const accessToken = data.session?.access_token || data.token || data.access_token;

    if (accessToken) {
      this.token = accessToken;
      await this.context.secrets.store('onepercent-token', accessToken);
    } else {
      throw new Error('No token received from server');
    }
  }

  logout(): void {
    this.token = undefined;
    this.context.secrets.delete('onepercent-token');
  }

  async getChallenges(): Promise<Challenge[]> {
    const data = await this.request('GET', '/api/challenges');
    return data.challenges || data || [];
  }

  async getCourses(): Promise<any[]> {
    const data = await this.request('GET', '/api/courses');
    return data.courses || [];
  }

  async submitChallenge(challengeId: string, code: string): Promise<any> {
    return this.request('POST', `/api/challenges/${challengeId}/submit`, { code });
  }

  async getFiles(): Promise<FileItem[]> {
    const data = await this.request('GET', '/api/files');
    return data.files || [];
  }

  async syncFile(fileName: string, content: string, language: string): Promise<void> {
    // Try to find existing file by name, then update or create
    const data = await this.request('GET', '/api/files');
    const files: FileItem[] = data.files || [];
    const existing = files.find(f => f.file_name === fileName);
    if (existing) {
      await this.request('PUT', `/api/files/${existing.id}`, { content });
    } else {
      await this.request('POST', '/api/files', { file_name: fileName, content, language });
    }
  }

  async getPremiumStatus(): Promise<PremiumStatus> {
    return this.request('GET', '/api/premium/status');
  }

  private request(method: string, path: string, body?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        const url = new URL(`${this.apiUrl}${path}`);
        const isHttps = url.protocol === 'https:';
        const client = isHttps ? https : http;

        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };

        if (this.token) {
          headers['Authorization'] = `Bearer ${this.token}`;
        }

        const options: https.RequestOptions = {
          hostname: url.hostname,
          port: url.port || (isHttps ? 443 : 80),
          path: url.pathname + url.search,
          method,
          headers,
          timeout: 15000
        };

        const req = client.request(options, (res) => {
          let data = '';
          res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
          res.on('end', () => {
            try {
              const json = JSON.parse(data);
              if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                resolve(json);
              } else {
                reject(new Error(json.error || json.message || `Request failed (${res.statusCode})`));
              }
            } catch {
              reject(new Error(`Invalid response: ${data.substring(0, 200)}`));
            }
          });
        });

        req.on('error', (err: Error) => reject(err));
        req.on('timeout', () => {
          req.destroy();
          reject(new Error('Request timed out'));
        });

        if (body) {
          req.write(JSON.stringify(body));
        }

        req.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
