"use strict";
/* ============================================================
   Challenge Provider — Tree view for the sidebar
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
exports.ChallengeProvider = void 0;
const vscode = __importStar(require("vscode"));
const EMOJI = {
    easy: '🟢', medium: '🟡', hard: '🔴', expert: '⚫'
};
class ChallengeProvider {
    api;
    _onDidChangeTreeData = new vscode.EventEmitter();
    onDidChangeTreeData = this._onDidChangeTreeData.event;
    groups = {};
    loaded = false;
    error = false;
    constructor(api) {
        this.api = api;
    }
    refresh() {
        this.loaded = false;
        this.error = false;
        this.groups = {};
        this._onDidChangeTreeData.fire(undefined);
    }
    getTreeItem(element) {
        return element;
    }
    async getChildren(element) {
        // Children of a group node
        if (element?.challenges) {
            return element.challenges.map(c => new ChallengeItem(c.title, vscode.TreeItemCollapsibleState.None, { command: '1percent.openChallenge', title: 'Open Challenge', arguments: [c] }, `${c.challenge_type} • ${c.coins_reward} coins`));
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
            }
            catch {
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
            const item = new ChallengeItem(`${EMOJI[difficulty] || '⚪'} ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} (${arr.length})`, vscode.TreeItemCollapsibleState.Expanded);
            item.challenges = arr;
            return item;
        });
    }
}
exports.ChallengeProvider = ChallengeProvider;
class ChallengeItem extends vscode.TreeItem {
    challenges;
    constructor(label, collapsibleState, command, description) {
        super(label, collapsibleState);
        if (command)
            this.command = command;
        if (description)
            this.description = description;
        this.contextValue = command?.command === '1percent.openChallenge' ? 'challenge' : 'group';
    }
}
//# sourceMappingURL=challengeProvider.js.map