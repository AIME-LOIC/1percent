/* ============================================================
   Terminal Reader — real PTY output capture
   ============================================================ */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export class TerminalReader {
  private terminal: vscode.Terminal | undefined;
  private ptyTerminal: vscode.Terminal | undefined;
  private outputChannel: vscode.OutputChannel;
  private lastOutput = '';
  private _onOutput = new vscode.EventEmitter<string>();
  readonly onOutput = this._onOutput.event;

  constructor(private context: vscode.ExtensionContext) {
    this.outputChannel = vscode.window.createOutputChannel('1% Learn');
    context.subscriptions.push(this.outputChannel);
    context.subscriptions.push(
      vscode.window.onDidCloseTerminal(t => {
        if (t === this.terminal) this.terminal = undefined;
        if (t === this.ptyTerminal) this.ptyTerminal = undefined;
      })
    );
  }

  /** Open (or reuse) the 1% Learn terminal */
  openTerminal(): vscode.Terminal {
    if (!this.terminal || this.terminal.exitStatus !== undefined) {
      this.terminal = vscode.window.createTerminal({ name: '1% Learn' });
    }
    this.terminal.show();
    return this.terminal;
  }

  /**
   * Run a command and capture its output using a temp file + sentinel.
   * Uses a custom PTY so we can read stdout without shell restrictions.
   */
  async runAndCapture(command: string): Promise<string> {
    const tmpFile = path.join(os.tmpdir(), `onepercent_${Date.now()}.txt`);
    const sentinel = `__1PERCENT_DONE_${Date.now()}__`;

    // Build captured output via PTY writeEmitter
    const lines: string[] = [];
    const writeEmitter = new vscode.EventEmitter<string>();

    const pty: vscode.Pseudoterminal = {
      onDidWrite: writeEmitter.event,
      open: () => {
        writeEmitter.fire(`\x1b[32m$ ${command}\x1b[0m\r\n`);

        // Run via shell, capture to file
        const { exec } = require('child_process');
        exec(`(${command}) > ${tmpFile} 2>&1; echo ${sentinel} >> ${tmpFile}`, { shell: '/bin/bash' },
          (err: any) => {
            try {
              const raw = fs.readFileSync(tmpFile, 'utf8');
              const output = raw.replace(sentinel, '').trim();
              this.lastOutput = output;
              this._onOutput.fire(output);

              // Display in PTY
              output.split('\n').forEach(l => writeEmitter.fire(l + '\r\n'));
              writeEmitter.fire('\r\n\x1b[90m— done —\x1b[0m\r\n');

              // Update output channel
              this.outputChannel.clear();
              this.outputChannel.appendLine(`$ ${command}`);
              this.outputChannel.appendLine(output);

              fs.unlinkSync(tmpFile);
            } catch {
              writeEmitter.fire('\x1b[31m(failed to read output)\x1b[0m\r\n');
            }
          }
        );
      },
      close: () => {}
    };

    // Close old PTY terminal if open
    if (this.ptyTerminal && this.ptyTerminal.exitStatus === undefined) {
      this.ptyTerminal.dispose();
    }

    this.ptyTerminal = vscode.window.createTerminal({ name: '1% Run', pty });
    this.ptyTerminal.show();

    // Wait for output (poll lastOutput change)
    return new Promise(resolve => {
      const prev = this.lastOutput;
      const start = Date.now();
      const check = setInterval(() => {
        if (this.lastOutput !== prev || Date.now() - start > 15000) {
          clearInterval(check);
          resolve(this.lastOutput);
        }
      }, 300);
    });
  }

  showOutput(): void {
    this.outputChannel.show(true);
  }

  getLastOutput(): string {
    return this.lastOutput;
  }

  sendToTerminal(text: string): void {
    (vscode.window.activeTerminal || this.openTerminal()).sendText(text);
  }
}
