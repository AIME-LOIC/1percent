import * as vscode from 'vscode';
import { ApiClient } from './api';
export declare class CourseProvider implements vscode.TreeDataProvider<CourseItem> {
    private api;
    private _onDidChangeTreeData;
    readonly onDidChangeTreeData: vscode.Event<CourseItem | undefined>;
    private loaded;
    private error;
    private courses;
    constructor(api: ApiClient);
    refresh(): void;
    getTreeItem(e: CourseItem): vscode.TreeItem;
    getChildren(element?: CourseItem): Promise<CourseItem[]>;
}
declare class CourseItem extends vscode.TreeItem {
    course?: any;
    modules?: any[];
    constructor(label: string, collapsibleState: vscode.TreeItemCollapsibleState, command?: vscode.Command, description?: string);
}
export {};
//# sourceMappingURL=courseProvider.d.ts.map