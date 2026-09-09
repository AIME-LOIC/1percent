import * as vscode from 'vscode';
import { ApiClient } from './api';
import { Challenge } from './types';
export declare class ChallengeProvider implements vscode.TreeDataProvider<ChallengeItem> {
    private api;
    private _onDidChangeTreeData;
    readonly onDidChangeTreeData: vscode.Event<ChallengeItem | undefined>;
    private groups;
    private loaded;
    private error;
    constructor(api: ApiClient);
    refresh(): void;
    getTreeItem(element: ChallengeItem): vscode.TreeItem;
    getChildren(element?: ChallengeItem): Promise<ChallengeItem[]>;
}
declare class ChallengeItem extends vscode.TreeItem {
    challenges?: Challenge[];
    constructor(label: string, collapsibleState: vscode.TreeItemCollapsibleState, command?: vscode.Command, description?: string);
}
export {};
//# sourceMappingURL=challengeProvider.d.ts.map