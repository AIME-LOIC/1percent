/* ============================================================
   Course Provider — Tree view for sidebar
   ============================================================ */

import * as vscode from 'vscode';
import { ApiClient } from './api';

export class CourseProvider implements vscode.TreeDataProvider<CourseItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<CourseItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private loaded = false;
  private error = false;
  private courses: any[] = [];

  constructor(private api: ApiClient) {}

  refresh(): void {
    this.loaded = false;
    this.error = false;
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(e: CourseItem): vscode.TreeItem { return e; }

  async getChildren(element?: CourseItem): Promise<CourseItem[]> {
    // Modules under a course
    if (element?.modules) {
      return element.modules.map((m: any) => {
        const item = new CourseItem(
          `📄 ${m.title}`,
          vscode.TreeItemCollapsibleState.None,
          { command: '1percent.openCourse', title: 'Open', arguments: [element.course, m] },
          m.duration_minutes ? `${m.duration_minutes} min` : undefined
        );
        return item;
      });
    }

    // Root — list courses (public, no auth needed)
    if (!this.loaded) {
      try {
        this.courses = await this.api.getCourses();
        this.loaded = true;
        this.error = false;
      } catch {
        this.error = true;
      }
    }

    if (this.error) {
      return [new CourseItem('⚠ Failed to load courses', vscode.TreeItemCollapsibleState.None, {
        command: '1percent.openCourse', title: 'Retry'
      })];
    }

    if (!this.courses.length) {
      return [new CourseItem('No courses available', vscode.TreeItemCollapsibleState.None)];
    }

    return this.courses.map(c => {
      const item = new CourseItem(
        `📚 ${c.title}`,
        vscode.TreeItemCollapsibleState.Collapsed,
        { command: '1percent.openCourse', title: 'Open Course', arguments: [c] },
        c.difficulty || undefined
      );
      item.course = c;
      item.modules = c.modules || [];
      item.tooltip = c.description || c.title;
      return item;
    });
  }
}

class CourseItem extends vscode.TreeItem {
  course?: any;
  modules?: any[];

  constructor(
    label: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    command?: vscode.Command,
    description?: string
  ) {
    super(label, collapsibleState);
    if (command) this.command = command;
    if (description) this.description = description;
    this.contextValue = 'course';
  }
}
