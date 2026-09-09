"use strict";
/* ============================================================
   Terminal Reader — real PTY output capture
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
exports.TerminalReader = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
class TerminalReader {
    context;
    terminal;
    ptyTerminal;
    outputChannel;
    lastOutput = '';
    _onOutput = new vscode.EventEmitter();
    onOutput = this._onOutput.event;
    constructor(context) {
        this.context = context;
        this.outputChannel = vscode.window.createOutputChannel('1% Learn');
        context.subscriptions.push(this.outputChannel);
        context.subscriptions.push(vscode.window.onDidCloseTerminal(t => {
            if (t === this.terminal)
                this.terminal = undefined;
            if (t === this.ptyTerminal)
                this.ptyTerminal = undefined;
        }));
    }
    /** Open (or reuse) the 1% Learn terminal */
    openTerminal() {
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
    async runAndCapture(command) {
        const tmpFile = path.join(os.tmpdir(), `onepercent_${Date.now()}.txt`);
        const sentinel = `__1PERCENT_DONE_${Date.now()}__`;
        // Build captured output via PTY writeEmitter
        const lines = [];
        const writeEmitter = new vscode.EventEmitter();
        const pty = {
            onDidWrite: writeEmitter.event,
            open: () => {
                writeEmitter.fire(`\x1b[32m$ ${command}\x1b[0m\r\n`);
                // Run via shell, capture to file
                const { exec } = require('child_process');
                exec(`(${command}) > ${tmpFile} 2>&1; echo ${sentinel} >> ${tmpFile}`, { shell: '/bin/bash' }, (err) => {
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
                    }
                    catch {
                        writeEmitter.fire('\x1b[31m(failed to read output)\x1b[0m\r\n');
                    }
                });
            },
            close: () => { }
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
    showOutput() {
        this.outputChannel.show(true);
    }
    getLastOutput() {
        return this.lastOutput;
    }
    sendToTerminal(text) {
        (vscode.window.activeTerminal || this.openTerminal()).sendText(text);
    }
}
exports.TerminalReader = TerminalReader;
//# sourceMappingURL=terminalReader.js.map