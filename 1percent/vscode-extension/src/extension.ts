/* ============================================================
   1% Learn VS Code Extension — Entry Point
   ============================================================ */

import * as vscode from 'vscode';
import { ApiClient } from './api';
import { ChallengeProvider } from './challengeProvider';
import { CourseProvider } from './courseProvider';
import { FileTracker } from './fileTracker';
import { TerminalReader } from './terminalReader';
import { CodeAnalyzer } from './codeAnalyzer';
import { Challenge } from './types';

let api: ApiClient;
let challengeProvider: ChallengeProvider;
let courseProvider: CourseProvider;
let fileTracker: FileTracker;
let terminalReader: TerminalReader;
let codeAnalyzer: CodeAnalyzer;

export async function activate(context: vscode.ExtensionContext) {
  console.log('1% Learn extension is now active!');

  api = new ApiClient(context);
  await api.ready;

  challengeProvider = new ChallengeProvider(api);
  courseProvider = new CourseProvider(api);
  fileTracker = new FileTracker(api, context);
  terminalReader = new TerminalReader(context);
  codeAnalyzer = new CodeAnalyzer(context);

  vscode.window.registerTreeDataProvider('onepercent-challenges', challengeProvider);
  vscode.window.registerTreeDataProvider('onepercent-courses', courseProvider);
  fileTracker.start();

  // Analyze code on editor change (debounced)
  let analyzeTimeout: NodeJS.Timeout | undefined;
  const scheduleAnalysis = (editor: vscode.TextEditor) => {
    if (analyzeTimeout) clearTimeout(analyzeTimeout);
    analyzeTimeout = setTimeout(() => codeAnalyzer.analyze(editor), 600);
  };

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(editor => {
      if (editor) scheduleAnalysis(editor);
      else codeAnalyzer.clearDecorations(vscode.window.activeTextEditor!);
    }),
    vscode.workspace.onDidChangeTextDocument(e => {
      const editor = vscode.window.activeTextEditor;
      if (editor && e.document === editor.document) scheduleAnalysis(editor);
    })
  );

  // Analyze current file on startup
  if (vscode.window.activeTextEditor) {
    codeAnalyzer.analyze(vscode.window.activeTextEditor);
  }

  // ---- Analyze Current File ----
  context.subscriptions.push(
    vscode.commands.registerCommand('1percent.analyzeFile', () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      const snapshot = codeAnalyzer.analyze(editor);
      const out = vscode.window.createOutputChannel('1% Learn');
      out.clear();
      out.appendLine(`📄 File: ${snapshot.fileName} (${snapshot.language})`);
      out.appendLine(`📏 Lines: ${snapshot.lineCount}`);
      out.appendLine(`🔣 Symbols: ${snapshot.symbols.map(s => `${s.kind}:${s.name}`).join(', ') || 'none'}`);
      out.appendLine(`⚠  Issues: ${snapshot.issues.length}`);
      snapshot.issues.forEach(i => out.appendLine(`   L${i.line + 1}: ${i.message}`));
      if (snapshot.matchScore > 0) {
        out.appendLine(`🎯 Challenge match: ${snapshot.matchScore}%`);
      }
      out.show();
    })
  );

  // ---- Set Active Challenge (for code matching) ----
  context.subscriptions.push(
    vscode.commands.registerCommand('1percent.setChallenge', async () => {
      const challenges = await api.getChallenges();
      const selected = await vscode.window.showQuickPick(
        challenges.map((c: Challenge) => ({ label: c.title, description: `${c.difficulty} • ${c.challenge_type}`, challenge: c })),
        { placeHolder: 'Set active challenge for code matching' }
      );
      if (!selected) return;
      codeAnalyzer.setActiveChallenge(selected.challenge);
      const editor = vscode.window.activeTextEditor;
      if (editor) codeAnalyzer.analyze(editor);
      vscode.window.showInformationMessage(`🎯 Active challenge: ${selected.label}`);
    })
  );

  // ---- Login ----
  context.subscriptions.push(
    vscode.commands.registerCommand('1percent.login', async () => {
      try {
        const email = await vscode.window.showInputBox({
          prompt: 'Enter your 1% Learn email',
          placeHolder: 'you@example.com',
          validateInput: v => v.includes('@') ? null : 'Please enter a valid email'
        });
        if (!email) return;

        const password = await vscode.window.showInputBox({
          prompt: 'Enter your password',
          password: true,
          validateInput: v => v.length >= 6 ? null : 'Password must be at least 6 characters'
        });
        if (!password) return;

        await vscode.window.withProgress({
          location: vscode.ProgressLocation.Notification,
          title: 'Logging in...'
        }, () => api.login(email, password));

        vscode.window.showInformationMessage('1% Learn: Login successful!');
        challengeProvider.refresh();
        courseProvider.refresh();
        fileTracker.updateStatusBar();
      } catch (err: any) {
        vscode.window.showErrorMessage(`Login failed: ${err.message}`);
      }
    })
  );

  // ---- Challenges ----
  context.subscriptions.push(
    vscode.commands.registerCommand('1percent.challenges', async () => {
      challengeProvider.refresh();
    })
  );

  // ---- Submit Solution ----
  context.subscriptions.push(
    vscode.commands.registerCommand('1percent.submit', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage('No active editor. Open a file first.');
        return;
      }
      if (!api.isAuthenticated()) {
        vscode.window.showWarningMessage('Please login first.');
        return;
      }

      const challenges = await api.getChallenges();
      if (!challenges.length) {
        vscode.window.showWarningMessage('No challenges available.');
        return;
      }

      const selected = await vscode.window.showQuickPick(
        challenges.map((c: Challenge) => ({
          label: c.title,
          description: `${c.difficulty} • ${c.challenge_type}`,
          challenge: c
        })),
        { placeHolder: 'Select a challenge to submit to' }
      );
      if (!selected) return;

      let result: any;
      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `Submitting: ${selected.label}...`
      }, async () => {
        result = await api.submitChallenge(selected.challenge.id, editor.document.getText());
      });

      if (result.passed) {
        vscode.window.showInformationMessage(`✅ Passed! +${selected.challenge.coins_reward} coins`);
      } else {
        const out = vscode.window.createOutputChannel('1% Learn');
        out.clear();
        out.appendLine('=== Submission Result ===');
        out.appendLine(`Status: FAILED`);
        if (result.output) out.appendLine(`Output:   ${result.output}`);
        if (result.expected) out.appendLine(`Expected: ${result.expected}`);
        if (result.error) out.appendLine(`Error:    ${result.error}`);
        out.show();
        vscode.window.showWarningMessage('❌ Solution did not pass. See output for details.');
      }
    })
  );

  // ---- Run in Terminal ----
  context.subscriptions.push(
    vscode.commands.registerCommand('1percent.runInTerminal', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage('No active file to run.');
        return;
      }

      const filePath = editor.document.fileName;
      const lang = editor.document.languageId;

      const runCmd: Record<string, string> = {
        python: `python3 "${filePath}"`,
        javascript: `node "${filePath}"`,
        typescript: `npx ts-node "${filePath}"`,
        ruby: `ruby "${filePath}"`,
        go: `go run "${filePath}"`,
        rust: `rustc "${filePath}" -o /tmp/rs_out && /tmp/rs_out`,
        shellscript: `bash "${filePath}"`,
        shell: `bash "${filePath}"`,
        sh: `bash "${filePath}"`
      };

      // If file extension is .sh or content looks like shell, force bash
      const ext = filePath.split('.').pop()?.toLowerCase();
      const content = editor.document.getText();
      const looksLikeShell = ext === 'sh' || /^(ls|cd|echo|cat|grep|mkdir|rm|chmod|export|source|#!\/bin)/.test(content.trim());

      const cmd = looksLikeShell ? `bash "${filePath}"` : runCmd[lang];
      if (!cmd) {
        vscode.window.showWarningMessage(`No runner configured for language: ${lang}`);
        return;
      }

      const output = await terminalReader.runAndCapture(cmd);
      terminalReader.showOutput();

      // If a challenge is active, offer to submit with this output
      if (api.isAuthenticated() && output) {
        const action = await vscode.window.showInformationMessage(
          'Run complete. Submit this solution to a challenge?',
          'Submit', 'Dismiss'
        );
        if (action === 'Submit') {
          vscode.commands.executeCommand('1percent.submit');
        }
      }
    })
  );

  // ---- Open Terminal ----
  context.subscriptions.push(
    vscode.commands.registerCommand('1percent.openTerminal', () => {
      terminalReader.openTerminal();
    })
  );

  // ---- Sync Files ----
  context.subscriptions.push(
    vscode.commands.registerCommand('1percent.sync', async () => {
      if (!api.isAuthenticated()) {
        vscode.window.showWarningMessage('Please login first.');
        return;
      }
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage('No active file to sync.');
        return;
      }
      try {
        await vscode.window.withProgress({
          location: vscode.ProgressLocation.Notification,
          title: 'Syncing to 1% Learn lab...'
        }, async () => {
          await api.syncFile(
            editor.document.fileName.split('/').pop() || 'untitled',
            editor.document.getText(),
            editor.document.languageId
          );
        });
        vscode.window.showInformationMessage('✅ File synced to 1% Learn lab.');
        fileTracker.updateStatusBar();
      } catch (err: any) {
        vscode.window.showErrorMessage(`Sync failed: ${err.message}`);
      }
    })
  );

  // ---- Logout ----
  context.subscriptions.push(
    vscode.commands.registerCommand('1percent.logout', () => {
      api.logout();
      challengeProvider.refresh();
      courseProvider.refresh();
      fileTracker.updateStatusBar();
      vscode.window.showInformationMessage('Logged out of 1% Learn.');
    })
  );

  // ---- Open Course ----
  context.subscriptions.push(
    vscode.commands.registerCommand('1percent.openCourse', (course: any, module?: any) => {
      const base = api.getApiUrl();
      const url = module
        ? `${base}/learn/course/${course.slug}#${module.id}`
        : `${base}/learn/course/${course.slug}`;
      vscode.env.openExternal(vscode.Uri.parse(url));
    })
  );

  // ---- Open Challenge in Lab (now: pick file, set active challenge) ----
  context.subscriptions.push(
    vscode.commands.registerCommand('1percent.openChallenge', async (challenge: Challenge) => {
      // Option 1 — use currently open file
      // Option 2 — pick an existing file from workspace
      // Option 3 — create a new starter file
      const choices: vscode.QuickPickItem[] = [
        { label: '$(file-code) Use current file', description: vscode.window.activeTextEditor?.document.fileName.split('/').pop() || 'no file open' },
        { label: '$(folder-opened) Pick a file from workspace' },
        { label: '$(new-file) Create starter file', description: `${challenge.title.replace(/\s+/g, '_')}.${langExt(challenge.challenge_type)}` },
        { label: '$(globe) Open in web lab' }
      ];

      const pick = await vscode.window.showQuickPick(choices, {
        placeHolder: `Challenge: ${challenge.title} — how do you want to solve it?`
      });
      if (!pick) return;

      let doc: vscode.TextDocument | undefined;

      if (pick.label.includes('Use current file')) {
        doc = vscode.window.activeTextEditor?.document;
        if (!doc) {
          vscode.window.showWarningMessage('No file is currently open.');
          return;
        }

      } else if (pick.label.includes('Pick a file')) {
        const uris = await vscode.window.showOpenDialog({
          canSelectMany: false,
          openLabel: 'Use this file',
          filters: { 'Code files': ['js','ts','py','rb','go','rs','c','cpp','java','sh'] }
        });
        if (!uris?.length) return;
        doc = await vscode.workspace.openTextDocument(uris[0]);
        await vscode.window.showTextDocument(doc);

      } else if (pick.label.includes('Create starter')) {
        const ext = langExt(challenge.challenge_type);
        const fileName = `${challenge.title.replace(/[^a-zA-Z0-9]/g, '_')}.${ext}`;
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri;
        const uri = workspaceFolder
          ? vscode.Uri.joinPath(workspaceFolder, fileName)
          : vscode.Uri.file(`${require('os').homedir()}/${fileName}`);

        const starter = challenge.starter_code || defaultStarter(challenge.challenge_type, challenge.title);
        await vscode.workspace.fs.writeFile(uri, Buffer.from(starter, 'utf8'));
        doc = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(doc);

      } else {
        // Open in web lab
        vscode.env.openExternal(vscode.Uri.parse(`${api.getApiUrl()}/learn/lab?challenge=${challenge.id}`));
        return;
      }

      // Set as active challenge for analysis + marking
      codeAnalyzer.setActiveChallenge(challenge);
      const editor = vscode.window.activeTextEditor;
      if (editor && doc && editor.document === doc) {
        codeAnalyzer.analyze(editor);
      }

      vscode.window.showInformationMessage(
        `🎯 Active: "${challenge.title}" — code is being tracked. Press Ctrl+Shift+Enter to submit.`
      );
    })
  );
}

export function deactivate() {
  fileTracker?.dispose();
  codeAnalyzer?.dispose();
}

function langExt(challengeType: string): string {
  const map: Record<string, string> = {
    javascript: 'js', typescript: 'ts', python: 'py',
    ruby: 'rb', go: 'go', rust: 'rs', html: 'html',
    css: 'css', sql: 'sql', bash: 'sh', shell: 'sh',
    linux: 'sh', git: 'sh', docker: 'sh', nginx: 'sh'
  };
  return map[challengeType] || 'js';
}

function defaultStarter(type: string, title: string): string {
  const starters: Record<string, string> = {
    javascript: `// ${title}\n// Write your solution below\n\nfunction solution() {\n  // your code here\n}\n`,
    typescript: `// ${title}\n// Write your solution below\n\nfunction solution(): void {\n  // your code here\n}\n`,
    python: `# ${title}\n# Write your solution below\n\ndef solution():\n    # your code here\n    pass\n`,
    html: `<!-- ${title} -->\n<!DOCTYPE html>\n<html>\n<head><title>${title}</title></head>\n<body>\n  <!-- your code here -->\n</body>\n</html>\n`,
    css: `/* ${title} */\n/* Write your solution below */\n`,
    linux: `#!/bin/bash\n# ${title}\n# Write your solution below\n\n`,
    shell: `#!/bin/bash\n# ${title}\n# Write your solution below\n\n`,
    bash: `#!/bin/bash\n# ${title}\n# Write your solution below\n\n`,
    git: `#!/bin/bash\n# ${title}\n# Write your git commands below\n\n`,
    sql: `-- ${title}\n-- Write your SQL below\n\n`
  };
  return starters[type] || starters.javascript;
}
