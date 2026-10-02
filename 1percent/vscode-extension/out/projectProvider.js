"use strict";
/* ============================================================
   ProjectProvider — Developer workspace tree view
   ============================================================
   Shows the student's current project, its progress, and their
   assigned tasks in the existing 1% Learn sidebar. Uses the same
   ApiClient auth model (secrets-stored Bearer token) as the rest
   of the extension — no new credentials.
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
exports.ProjectProvider = void 0;
const vscode = __importStar(require("vscode"));
const STATUS_ICON = {
    TODO: '○',
    IN_PROGRESS: '◐',
    BLOCKED: '✗',
    IN_REVIEW: '◑',
    TESTING: '◔',
    DONE: '●'
};
class ProjectProvider {
    api;
    _onDidChangeTreeData = new vscode.EventEmitter();
    onDidChangeTreeData = this._onDidChangeTreeData.event;
    constructor(api) {
        this.api = api;
    }
    refresh() {
        this._onDidChangeTreeData.fire(undefined);
    }
    getTreeItem(element) {
        return element;
    }
    async getChildren() {
        if (!this.api.isAuthenticated()) {
            const item = new vscode.TreeItem('Sign in to see your project');
            item.command = { command: '1percent.login', title: 'Login' };
            return [item];
        }
        try {
            const data = await this.api.getDevWorkspace();
            const ws = data;
            const items = [];
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
            }
            else {
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
        }
        catch {
            const errItem = new vscode.TreeItem('Could not load workspace');
            errItem.iconPath = new vscode.ThemeIcon('error');
            return [errItem];
        }
    }
}
exports.ProjectProvider = ProjectProvider;
//# sourceMappingURL=projectProvider.js.map