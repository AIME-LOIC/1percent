import * as vscode from 'vscode';
import { ApiClient } from './api';
export declare class ProjectProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    private api;
    private _onDidChangeTreeData;
    readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined>;
    constructor(api: ApiClient);
    refresh(): void;
    getTreeItem(element: vscode.TreeItem): vscode.TreeItem;
    getChildren(): Promise<vscode.TreeItem[]>;
}
//# sourceMappingURL=projectProvider.d.ts.map