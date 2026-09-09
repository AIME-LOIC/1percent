"use strict";
/* ============================================================
   Code Analyzer — real-time code reading, marking, diagnostics
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
exports.CodeAnalyzer = void 0;
const vscode = __importStar(require("vscode"));
class CodeAnalyzer {
    context;
    diagnosticCollection;
    decorationTypes = new Map();
    activeChallenge;
    _onSnapshot = new vscode.EventEmitter();
    onSnapshot = this._onSnapshot.event;
    // Decoration styles
    funcDecoration = vscode.window.createTextEditorDecorationType({
        backgroundColor: 'rgba(13,110,63,0.08)',
        borderRadius: '3px',
        overviewRulerColor: '#0d6e3f',
        overviewRulerLane: vscode.OverviewRulerLane.Left
    });
    issueDecoration = vscode.window.createTextEditorDecorationType({
        backgroundColor: 'rgba(255,180,0,0.1)',
        borderRadius: '3px',
        after: {
            contentText: ' ⚠',
            color: '#ffb400',
            margin: '0 0 0 4px'
        }
    });
    todoDecoration = vscode.window.createTextEditorDecorationType({
        backgroundColor: 'rgba(0,120,255,0.08)',
        borderRadius: '3px',
        after: {
            contentText: ' 📌',
            margin: '0 0 0 4px'
        }
    });
    matchDecoration = vscode.window.createTextEditorDecorationType({
        border: '1px solid rgba(13,110,63,0.4)',
        borderRadius: '3px'
    });
    constructor(context) {
        this.context = context;
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection('1percent');
        context.subscriptions.push(this.diagnosticCollection);
        context.subscriptions.push(this.funcDecoration);
        context.subscriptions.push(this.issueDecoration);
        context.subscriptions.push(this.todoDecoration);
        context.subscriptions.push(this.matchDecoration);
    }
    setActiveChallenge(challenge) {
        this.activeChallenge = challenge;
        const editor = vscode.window.activeTextEditor;
        if (editor)
            this.analyze(editor);
    }
    clearChallenge() {
        this.activeChallenge = undefined;
    }
    analyze(editor) {
        const doc = editor.document;
        const content = doc.getText();
        const lines = content.split('\n');
        const language = doc.languageId;
        const symbols = this.extractSymbols(lines, language);
        const issues = this.detectIssues(lines, language);
        const matchScore = this.scoreAgainstChallenge(content);
        // Apply decorations
        this.applyDecorations(editor, lines, symbols, issues);
        // Apply diagnostics
        this.applyDiagnostics(doc, issues);
        const snapshot = {
            fileName: doc.fileName.split('/').pop() || doc.fileName,
            language,
            content,
            lineCount: lines.length,
            symbols,
            issues,
            matchScore
        };
        this._onSnapshot.fire(snapshot);
        return snapshot;
    }
    extractSymbols(lines, lang) {
        const symbols = [];
        const patterns = {
            javascript: [
                /^\s*(?:export\s+)?(?:async\s+)?function\s+(\w+)/,
                /^\s*(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(/,
                /^\s*(?:export\s+)?class\s+(\w+)/,
                /^\s*(?:import|const|let|var)\s+(\w+)/
            ],
            typescript: [
                /^\s*(?:export\s+)?(?:async\s+)?function\s+(\w+)/,
                /^\s*(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(/,
                /^\s*(?:export\s+)?class\s+(\w+)/,
                /^\s*(?:export\s+)?(?:interface|type)\s+(\w+)/,
                /^\s*import\s+.*from/
            ],
            python: [
                /^\s*def\s+(\w+)\s*\(/,
                /^\s*class\s+(\w+)/,
                /^\s*(\w+)\s*=/,
                /^\s*import\s+(\w+)/,
                /^\s*from\s+\w+\s+import/
            ]
        };
        const langPatterns = patterns[lang] || patterns.javascript;
        lines.forEach((line, i) => {
            for (const pattern of langPatterns) {
                const match = line.match(pattern);
                if (match) {
                    let kind = 'variable';
                    if (/function|def\s/.test(line) || /=\s*(?:async\s*)?\(/.test(line))
                        kind = 'function';
                    else if (/class\s/.test(line))
                        kind = 'class';
                    else if (/import/.test(line))
                        kind = 'import';
                    symbols.push({ name: match[1] || line.trim().substring(0, 20), kind, line: i });
                    break;
                }
            }
        });
        return symbols;
    }
    detectIssues(lines, lang) {
        const issues = [];
        lines.forEach((line, i) => {
            const trimmed = line.trim();
            // TODO / FIXME
            if (/\b(TODO|FIXME|HACK|XXX)\b/i.test(trimmed)) {
                issues.push({ line: i, message: `${trimmed.match(/\b(TODO|FIXME|HACK|XXX)\b/i)[0]}: ${trimmed}`, severity: vscode.DiagnosticSeverity.Information });
            }
            // console.log left in code
            if (/console\.(log|warn|error|debug)\(/.test(trimmed) && lang !== 'python') {
                issues.push({ line: i, message: 'Debug statement left in code', severity: vscode.DiagnosticSeverity.Warning });
            }
            // Python print left in
            if (lang === 'python' && /^\s*print\(/.test(line)) {
                issues.push({ line: i, message: 'print() statement', severity: vscode.DiagnosticSeverity.Information });
            }
            // Empty catch blocks
            if (/catch\s*\(.*\)\s*\{\s*\}/.test(trimmed) || /except\s*:\s*pass/.test(trimmed)) {
                issues.push({ line: i, message: 'Empty error handler — consider logging the error', severity: vscode.DiagnosticSeverity.Warning });
            }
            // Hardcoded credentials pattern
            if (/(?:password|secret|api_key|token)\s*=\s*['"][^'"]{4,}['"]/i.test(trimmed)) {
                issues.push({ line: i, message: 'Possible hardcoded credential', severity: vscode.DiagnosticSeverity.Error });
            }
        });
        return issues;
    }
    scoreAgainstChallenge(content) {
        if (!this.activeChallenge?.starter_code)
            return 0;
        const starter = this.activeChallenge.starter_code;
        // Extract function/class names from starter code
        const starterTokens = starter.match(/\b\w{3,}\b/g) || [];
        const contentTokens = new Set(content.match(/\b\w{3,}\b/g) || []);
        if (!starterTokens.length)
            return 0;
        const matched = starterTokens.filter(t => contentTokens.has(t)).length;
        return Math.round((matched / starterTokens.length) * 100);
    }
    applyDecorations(editor, lines, symbols, issues) {
        // Function/class highlights
        const funcRanges = symbols
            .filter(s => s.kind === 'function' || s.kind === 'class')
            .map(s => {
            const line = editor.document.lineAt(s.line);
            return new vscode.Range(s.line, 0, s.line, line.text.length);
        });
        editor.setDecorations(this.funcDecoration, funcRanges);
        // Issue highlights
        const issueRanges = issues
            .filter(i => i.severity === vscode.DiagnosticSeverity.Warning)
            .map(i => {
            const line = editor.document.lineAt(i.line);
            return new vscode.Range(i.line, 0, i.line, line.text.length);
        });
        editor.setDecorations(this.issueDecoration, issueRanges);
        // TODO highlights
        const todoRanges = issues
            .filter(i => i.severity === vscode.DiagnosticSeverity.Information)
            .map(i => {
            const line = editor.document.lineAt(i.line);
            return new vscode.Range(i.line, 0, i.line, line.text.length);
        });
        editor.setDecorations(this.todoDecoration, todoRanges);
        // Challenge match — highlight lines that match starter code tokens
        if (this.activeChallenge?.starter_code) {
            const tokens = new Set(this.activeChallenge.starter_code.match(/\b\w{4,}\b/g) || []);
            const matchRanges = lines
                .map((line, i) => ({ line, i }))
                .filter(({ line }) => [...tokens].some(t => line.includes(t)))
                .map(({ i }) => {
                const l = editor.document.lineAt(i);
                return new vscode.Range(i, 0, i, l.text.length);
            });
            editor.setDecorations(this.matchDecoration, matchRanges);
        }
        else {
            editor.setDecorations(this.matchDecoration, []);
        }
    }
    applyDiagnostics(doc, issues) {
        const diagnostics = issues.map(issue => {
            const line = doc.lineAt(issue.line);
            const range = new vscode.Range(issue.line, 0, issue.line, line.text.length);
            return new vscode.Diagnostic(range, `1% Learn: ${issue.message}`, issue.severity);
        });
        this.diagnosticCollection.set(doc.uri, diagnostics);
    }
    clearDecorations(editor) {
        editor.setDecorations(this.funcDecoration, []);
        editor.setDecorations(this.issueDecoration, []);
        editor.setDecorations(this.todoDecoration, []);
        editor.setDecorations(this.matchDecoration, []);
    }
    dispose() {
        this.diagnosticCollection.dispose();
    }
}
exports.CodeAnalyzer = CodeAnalyzer;
//# sourceMappingURL=codeAnalyzer.js.map