import * as vscode from 'vscode';
export declare class TerminalReader {
    private context;
    private terminal;
    private ptyTerminal;
    private outputChannel;
    private lastOutput;
    private _onOutput;
    readonly onOutput: vscode.Event<string>;
    constructor(context: vscode.ExtensionContext);
    /** Open (or reuse) the 1% Learn terminal */
    openTerminal(): vscode.Terminal;
    /**
     * Run a command and capture its output using a temp file + sentinel.
     * Uses a custom PTY so we can read stdout without shell restrictions.
     */
    runAndCapture(command: string): Promise<string>;
    showOutput(): void;
    getLastOutput(): string;
    sendToTerminal(text: string): void;
}
//# sourceMappingURL=terminalReader.d.ts.map