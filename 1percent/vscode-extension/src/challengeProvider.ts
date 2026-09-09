/* ============================================================
   Challenge Provider — Tree view for the sidebar
   ============================================================ */

import * as vscode from 'vscode';
import { ApiClient } from './api';
import { Challenge } from './types';

const EMOJI: Record<string, string> = {
  easy: '🟢', medium: '🟡', hard: '🔴', expert: '⚫'
};

export class ChallengeProvider implements vscode.TreeDataProvider<ChallengeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<ChallengeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private groups: Record<string, Challenge[]> = {};
  private loaded = false;
  private error = false;

  constructor(private api: ApiClient) {}

  refresh(): void {
    this.loaded = false;
    this.error = false;
    this.groups = {};
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: ChallengeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: ChallengeItem): Promise<ChallengeItem[]> {
    // Children of a group node
    if (element?.challenges) {
      return element.challenges.map(c => new ChallengeItem(
        c.title,
        vscode.TreeItemCollapsibleState.None,
        { command: '1percent.openChallenge', title: 'Open Challenge', arguments: [c] },
        `${c.challenge_type} • ${c.coins_reward} coins`
      ));
    }

    // Root level
    await this.api.ready;

    if (!this.api.isAuthenticated()) {
      return [new ChallengeItem('🔐 Login to view challenges', vscode.TreeItemCollapsibleState.None, {
        command: '1percent.login', title: 'Login'
      })];
    }

    if (!this.loaded) {
      try {
        const challenges = await this.api.getChallenges();
        this.groups = { easy: [], medium: [], hard: [], expert: [] };
        for (const c of challenges) {
          const key = c.difficulty in this.groups ? c.difficulty : 'easy';
          this.groups[key].push(c);
        }
        this.loaded = true;
        this.error = false;
      } catch {
        this.error = true;
      }
    }

    if (this.error) {
      return [new ChallengeItem('⚠ Failed to load — click to retry', vscode.TreeItemCollapsibleState.None, {
        command: '1percent.challenges', title: 'Retry'
      })];
    }

    const total = Object.values(this.groups).reduce((s, a) => s + a.length, 0);
    if (total === 0) {
      return [new ChallengeItem('No challenges available', vscode.TreeItemCollapsibleState.None)];
    }

    return Object.entries(this.groups)
      .filter(([, arr]) => arr.length > 0)
      .map(([difficulty, arr]) => {
        const item = new ChallengeItem(
          `${EMOJI[difficulty] || '⚪'} ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} (${arr.length})`,
          vscode.TreeItemCollapsibleState.Expanded
        );
        item.challenges = arr;
        return item;
      });
  }
}

class ChallengeItem extends vscode.TreeItem {
  challenges?: Challenge[];

  constructor(
    label: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    command?: vscode.Command,
    description?: string
  ) {
    super(label, collapsibleState);
    if (command) this.command = command;
    if (description) this.description = description;
    this.contextValue = command?.command === '1percent.openChallenge' ? 'challenge' : 'group';
  }
}
