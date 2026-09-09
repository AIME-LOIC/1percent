# 1% Learn — VS Code Extension

View and solve coding challenges from 1% Learn directly in VS Code.

## Features

- 🔐 **Login** — Authenticate with your 1% Learn account
- 📋 **Challenge Browser** — View challenges in the sidebar, grouped by difficulty
- ✍️ **Submit Solutions** — Submit your code directly from VS Code
- 📁 **File Sync** — Sync files with your 1% Learn lab
- 🏆 **Track Progress** — Earn coins for passing challenges

## Installation

### From VSIX

```bash
cd 1percent/vscode-extension
npm install
npm run compile
npx vsce package
code --install-extension 1percent-learn-1.0.0.vsix
```

### From Source

1. Clone the repository
2. Open `1percent/vscode-extension` in VS Code
3. Press `F5` to launch the Extension Development Host

## Usage

### Login

1. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Type "1% Learn: Login"
3. Enter your email and password

### View Challenges

1. Open the Explorer sidebar
2. Expand "1% Learn Challenges" section
3. Click a challenge to open it in the web lab

### Submit Solution

1. Open your solution file
2. Press `Ctrl+Shift+Enter` (or `Cmd+Shift+Enter` on Mac)
3. Select the challenge to submit to
4. View results in the Output panel

### Commands

| Command | Description |
|---------|-------------|
| `1percent.login` | Login to your account |
| `1percent.challenges` | Refresh and view challenges |
| `1percent.submit` | Submit current file as solution |
| `1percent.sync` | Sync files with your lab |
| `1percent.logout` | Logout |

## Configuration

Open Settings (`Ctrl+,`) and search for "1% Learn":

- `onepercent.apiUrl` — API server URL (default: `https://learn.1percent.rw`)

## Requirements

- VS Code 1.85 or later
- Node.js 18+ (for building from source)

## License

UNLICENSED — 1% Digital Solutions
