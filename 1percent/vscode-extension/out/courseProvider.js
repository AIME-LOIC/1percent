"use strict";
/* ============================================================
   Course Provider — Tree view for sidebar
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
exports.CourseProvider = void 0;
const vscode = __importStar(require("vscode"));
class CourseProvider {
    api;
    _onDidChangeTreeData = new vscode.EventEmitter();
    onDidChangeTreeData = this._onDidChangeTreeData.event;
    loaded = false;
    error = false;
    courses = [];
    constructor(api) {
        this.api = api;
    }
    refresh() {
        this.loaded = false;
        this.error = false;
        this._onDidChangeTreeData.fire(undefined);
    }
    getTreeItem(e) { return e; }
    async getChildren(element) {
        // Modules under a course
        if (element?.modules) {
            return element.modules.map((m) => {
                const item = new CourseItem(`📄 ${m.title}`, vscode.TreeItemCollapsibleState.None, { command: '1percent.openCourse', title: 'Open', arguments: [element.course, m] }, m.duration_minutes ? `${m.duration_minutes} min` : undefined);
                return item;
            });
        }
        // Root — list courses (public, no auth needed)
        if (!this.loaded) {
            try {
                this.courses = await this.api.getCourses();
                this.loaded = true;
                this.error = false;
            }
            catch {
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
            const item = new CourseItem(`📚 ${c.title}`, vscode.TreeItemCollapsibleState.Collapsed, { command: '1percent.openCourse', title: 'Open Course', arguments: [c] }, c.difficulty || undefined);
            item.course = c;
            item.modules = c.modules || [];
            item.tooltip = c.description || c.title;
            return item;
        });
    }
}
exports.CourseProvider = CourseProvider;
class CourseItem extends vscode.TreeItem {
    course;
    modules;
    constructor(label, collapsibleState, command, description) {
        super(label, collapsibleState);
        if (command)
            this.command = command;
        if (description)
            this.description = description;
        this.contextValue = 'course';
    }
}
//# sourceMappingURL=courseProvider.js.map