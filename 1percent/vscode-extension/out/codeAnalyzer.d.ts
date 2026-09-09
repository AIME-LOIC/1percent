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
    matchScore: number;
}
export declare class CodeAnalyzer {
    private context;
    private diagnosticCollection;
    private decorationTypes;
    private activeChallenge;
    private _onSnapshot;
    readonly onSnapshot: vscode.Event<CodeSnapshot>;
    private readonly funcDecoration;
    private readonly issueDecoration;
    private readonly todoDecoration;
    private readonly matchDecoration;
    constructor(context: vscode.ExtensionContext);
    setActiveChallenge(challenge: Challenge): void;
    clearChallenge(): void;
    analyze(editor: vscode.TextEditor): CodeSnapshot;
    private extractSymbols;
    private detectIssues;
    private scoreAgainstChallenge;
    private applyDecorations;
    private applyDiagnostics;
    clearDecorations(editor: vscode.TextEditor): void;
    dispose(): void;
}
export {};
//# sourceMappingURL=codeAnalyzer.d.ts.map