/* ============================================================
   Code Analyzer — real-time code reading, marking, diagnostics
   ============================================================ */

import * as vscode from 'vscode';
import { Challenge } from './types';

interface CodeSymbol {
  name: string;
  kind: 'function' | 'class' | 'variable' | 'import';
  line: number;
}

interface CodeIssue {
  line: number;
  message: string;
  severity: vscode.DiagnosticSeverity;
}

export interface CodeSnapshot {
  fileName: string;
  language: string;
  content: string;
  lineCount: number;
  symbols: CodeSymbol[];
  issues: CodeIssue[];
  matchScore: number; // 0-100 match against active challenge
}

export class CodeAnalyzer {
  private diagnosticCollection: vscode.DiagnosticCollection;
  private decorationTypes: Map<string, vscode.TextEditorDecorationType> = new Map();
  private activeChallenge: Challenge | undefined;
  private _onSnapshot = new vscode.EventEmitter<CodeSnapshot>();
  readonly onSnapshot = this._onSnapshot.event;

  // Decoration styles
  private readonly funcDecoration = vscode.window.createTextEditorDecorationType({
    backgroundColor: 'rgba(13,110,63,0.08)',
    borderRadius: '3px',
    overviewRulerColor: '#0d6e3f',
    overviewRulerLane: vscode.OverviewRulerLane.Left
  });

  private readonly issueDecoration = vscode.window.createTextEditorDecorationType({
    backgroundColor: 'rgba(255,180,0,0.1)',
    borderRadius: '3px',
    after: {
      contentText: ' ⚠',
      color: '#ffb400',
      margin: '0 0 0 4px'
    }
  });

  private readonly todoDecoration = vscode.window.createTextEditorDecorationType({
    backgroundColor: 'rgba(0,120,255,0.08)',
    borderRadius: '3px',
    after: {
      contentText: ' 📌',
      margin: '0 0 0 4px'
    }
  });

  private readonly matchDecoration = vscode.window.createTextEditorDecorationType({
    border: '1px solid rgba(13,110,63,0.4)',
    borderRadius: '3px'
  });

  constructor(private context: vscode.ExtensionContext) {
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('1percent');
    context.subscriptions.push(this.diagnosticCollection);
    context.subscriptions.push(this.funcDecoration);
    context.subscriptions.push(this.issueDecoration);
    context.subscriptions.push(this.todoDecoration);
    context.subscriptions.push(this.matchDecoration);
  }

  setActiveChallenge(challenge: Challenge): void {
    this.activeChallenge = challenge;
    const editor = vscode.window.activeTextEditor;
    if (editor) this.analyze(editor);
  }

  clearChallenge(): void {
    this.activeChallenge = undefined;
  }

  analyze(editor: vscode.TextEditor): CodeSnapshot {
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

    const snapshot: CodeSnapshot = {
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

  private extractSymbols(lines: string[], lang: string): CodeSymbol[] {
    const symbols: CodeSymbol[] = [];

    const patterns: Record<string, RegExp[]> = {
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
          let kind: CodeSymbol['kind'] = 'variable';
          if (/function|def\s/.test(line) || /=\s*(?:async\s*)?\(/.test(line)) kind = 'function';
          else if (/class\s/.test(line)) kind = 'class';
          else if (/import/.test(line)) kind = 'import';

          symbols.push({ name: match[1] || line.trim().substring(0, 20), kind, line: i });
          break;
        }
      }
    });

    return symbols;
  }

  private detectIssues(lines: string[], lang: string): CodeIssue[] {
    const issues: CodeIssue[] = [];

    lines.forEach((line, i) => {
      const trimmed = line.trim();

      // TODO / FIXME
      if (/\b(TODO|FIXME|HACK|XXX)\b/i.test(trimmed)) {
        issues.push({ line: i, message: `${trimmed.match(/\b(TODO|FIXME|HACK|XXX)\b/i)![0]}: ${trimmed}`, severity: vscode.DiagnosticSeverity.Information });
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

  private scoreAgainstChallenge(content: string): number {
    if (!this.activeChallenge?.starter_code) return 0;

    const starter = this.activeChallenge.starter_code;
    // Extract function/class names from starter code
    const starterTokens = starter.match(/\b\w{3,}\b/g) || [];
    const contentTokens = new Set(content.match(/\b\w{3,}\b/g) || []);

    if (!starterTokens.length) return 0;

    const matched = starterTokens.filter(t => contentTokens.has(t)).length;
    return Math.round((matched / starterTokens.length) * 100);
  }

  private applyDecorations(
    editor: vscode.TextEditor,
    lines: string[],
    symbols: CodeSymbol[],
    issues: CodeIssue[]
  ): void {
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
    } else {
      editor.setDecorations(this.matchDecoration, []);
    }
  }

  private applyDiagnostics(doc: vscode.TextDocument, issues: CodeIssue[]): void {
    const diagnostics = issues.map(issue => {
      const line = doc.lineAt(issue.line);
      const range = new vscode.Range(issue.line, 0, issue.line, line.text.length);
      return new vscode.Diagnostic(range, `1% Learn: ${issue.message}`, issue.severity);
    });
    this.diagnosticCollection.set(doc.uri, diagnostics);
  }

  clearDecorations(editor: vscode.TextEditor): void {
    editor.setDecorations(this.funcDecoration, []);
    editor.setDecorations(this.issueDecoration, []);
    editor.setDecorations(this.todoDecoration, []);
    editor.setDecorations(this.matchDecoration, []);
  }

  dispose(): void {
    this.diagnosticCollection.dispose();
  }
}
