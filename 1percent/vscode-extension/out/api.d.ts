import * as vscode from 'vscode';
import { Challenge, FileItem, PremiumStatus } from './types';
export declare class ApiClient {
    private context;
    private token;
    private apiUrl;
    readonly ready: Promise<void>;
    constructor(context: vscode.ExtensionContext);
    private loadToken;
    getApiUrl(): string;
    isAuthenticated(): boolean;
    login(email: string, password: string): Promise<void>;
    logout(): void;
    getChallenges(): Promise<Challenge[]>;
    getCourses(): Promise<any[]>;
    submitChallenge(challengeId: string, code: string): Promise<any>;
    getFiles(): Promise<FileItem[]>;
    syncFile(fileName: string, content: string, language: string): Promise<void>;
    getPremiumStatus(): Promise<PremiumStatus>;
    private request;
}
//# sourceMappingURL=api.d.ts.map