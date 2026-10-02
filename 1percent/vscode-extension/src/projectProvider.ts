/* ============================================================
   ProjectProvider — Developer workspace tree view
   ============================================================
   Shows the student's current project, its progress, and their
   assigned tasks in the existing 1% Learn sidebar. Uses the same
   ApiClient auth model (secrets-stored Bearer token) as the rest
   of the extension — no new credentials.
   ============================================================ */

import * as vscode from 'vscode';
import { ApiClient } from './api';

interface WorkspaceTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date?: string | null;
}

interface WorkspaceProject {
  id: string;
  name: string;
  status: string;
  my_role: string;
  progress?: { overall_percent?: number } | null;
}

interface WorkspaceResponse {
  current_project: WorkspaceProject | null;
  tasks: WorkspaceTask[];
  github_connected: boolean;
}

const STATUS_ICON: Record<string, string> = {
  TODO: '○',
  IN_PROGRESS: '◐',
  BLOCKED: '✗',
  IN_REVIEW: '◑',
  TESTING: '◔',
  DONE: '●'
};

export class ProjectProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private api: ApiClient) {}

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(): Promise<vscode.TreeItem[]> {
    if (!this.api.isAuthenticated()) {
      const item = new vscode.TreeItem('Sign in to see your project');
      item.command = { command: '1percent.login', title: 'Login' };
      return [item];
    }

    try {
      const data = await this.api.getDevWorkspace();
      const ws: WorkspaceResponse = data;
      const items: vscode.TreeItem[] = [];

      if (!ws.current_project) {
        const empty = new vscode.TreeItem('No active project yet');
        empty.tooltip = 'You are not on a project team. Ask your mentor or an admin.';
        return [empty];
      }

      const p = ws.current_project;

      // Project header
      const header = new vscode.TreeItem(p.name);
      header.description = `${p.status.replace(/_/g, ' ')} · ${p.my_role}`;
      header.iconPath = new vscode.ThemeIcon('project');
      header.contextValue = 'project';
      items.push(header);

      // Progress
      const pct = p.progress?.overall_percent ?? 0;
      const progress = new vscode.TreeItem(`Progress: ${pct}%`);
      progress.description = '';
      progress.iconPath = new vscode.ThemeIcon('graph');
      items.push(progress);

      // GitHub connection
      const gh = new vscode.TreeItem(`GitHub: ${ws.github_connected ? 'connected' : 'not connected'}`);
      gh.iconPath = new vscode.ThemeIcon(ws.github_connected ? 'check' : 'circle-slash');
      items.push(gh);

      // Tasks
      const taskItems = ws.tasks || [];
      if (taskItems.length === 0) {
        const none = new vscode.TreeItem('No tasks assigned');
        none.iconPath = new vscode.ThemeIcon('circle-slash');
        items.push(none);
      } else {
        for (const t of taskItems.slice(0, 15)) {
          const icon = STATUS_ICON[t.status] || '○';
          const item = new vscode.TreeItem(`${icon} ${t.title}`);
          item.description = `${t.status.toLowerCase()} · ${t.priority.toLowerCase()}`;
          item.tooltip = `${t.title}\nStatus: ${t.status}\nPriority: ${t.priority}${t.due_date ? `\nDue: ${t.due_date}` : ''}`;
          item.contextValue = 'task';
          items.push(item);
        }
      }

      return items;
    } catch {
      const errItem = new vscode.TreeItem('Could not load workspace');
      errItem.iconPath = new vscode.ThemeIcon('error');
      return [errItem];
    }
  }
}
