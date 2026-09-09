/* ============================================================
   File Tracker — watches active editor, syncs on save
   ============================================================ */

import * as vscode from 'vscode';
import { ApiClient } from './api';

export class FileTracker {
  private statusBar: vscode.StatusBarItem;
  private disposables: vscode.Disposable[] = [];
  private syncTimeout: NodeJS.Timeout | undefined;

  constructor(private api: ApiClient, private context: vscode.ExtensionContext) {
    this.statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.statusBar.command = '1percent.sync';
    context.subscriptions.push(this.statusBar);
    this.updateStatusBar();
  }

  start(): void {
    // Update status bar when active editor changes
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor(() => this.updateStatusBar())
    );

    // Auto-sync on save
    this.disposables.push(
      vscode.workspace.onDidSaveTextDocument((doc) => this.onSave(doc))
    );

    // Track unsaved changes
    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument((e) => {
        if (e.document === vscode.window.activeTextEditor?.document) {
          this.setDirty();
        }
      })
    );

    this.disposables.forEach(d => this.context.subscriptions.push(d));
  }

  private async onSave(doc: vscode.TextDocument): Promise<void> {
    if (!this.api.isAuthenticated()) return;

    const config = vscode.workspace.getConfiguration('onepercent');
    if (!config.get('autoSync', true)) return;

    // Debounce — wait 500ms after last save
    if (this.syncTimeout) clearTimeout(this.syncTimeout);
    this.syncTimeout = setTimeout(async () => {
      try {
        this.statusBar.text = '$(sync~spin) 1% Syncing...';
        this.statusBar.tooltip = `Syncing ${doc.fileName.split('/').pop()}`;

        const fileName = doc.fileName.split('/').pop() || 'untitled';
        const content = doc.getText();
        const language = doc.languageId;

        await this.api.syncFile(fileName, content, language);

        this.statusBar.text = '$(check) 1% Synced';
        this.statusBar.tooltip = `Last synced: ${fileName} at ${new Date().toLocaleTimeString()}`;
        setTimeout(() => this.updateStatusBar(), 3000);
      } catch {
        this.statusBar.text = '$(warning) 1% Sync failed';
        setTimeout(() => this.updateStatusBar(), 3000);
      }
    }, 500);
  }

  private setDirty(): void {
    if (!this.api.isAuthenticated()) return;
    this.statusBar.text = '$(circle-filled) 1% Unsaved';
    this.statusBar.tooltip = 'Unsaved changes — will sync on save';
    this.statusBar.show();
  }

  updateStatusBar(): void {
    const editor = vscode.window.activeTextEditor;
    if (!editor || !this.api.isAuthenticated()) {
      this.statusBar.hide();
      return;
    }
    const fileName = editor.document.fileName.split('/').pop();
    this.statusBar.text = `$(cloud-upload) 1% ${fileName}`;
    this.statusBar.tooltip = 'Click to sync to 1% Learn lab';
    this.statusBar.show();
  }

  dispose(): void {
    this.disposables.forEach(d => d.dispose());
  }
}
