import * as vscode from 'vscode';
import { ApiClient } from './api';
export declare class FileTracker {
    private api;
    private context;
    private statusBar;
    private disposables;
    private syncTimeout;
    constructor(api: ApiClient, context: vscode.ExtensionContext);
    start(): void;
    private onSave;
    private setDirty;
    updateStatusBar(): void;
    dispose(): void;
}
//# sourceMappingURL=fileTracker.d.ts.map