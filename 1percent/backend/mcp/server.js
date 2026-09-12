#!/usr/bin/env node
/* ============================================================
   1percent Learn — MCP Server (stdio transport)
   ============================================================
   Lets Claude Desktop / Claude Code manage the learning
   platform directly. Talks newline-delimited JSON-RPC 2.0 on
   stdio; all tool logic lives in backend/mcp/core.js.

   Run    : npm run mcp
   Config : claude_desktop_config.json →
              { "command": "node", "args": ["<abs path>/backend/mcp/server.js"] }
   ============================================================ */

const { handleRpcMessage } = require('./core');

/* ── stdio loop — line-delimited JSON-RPC ── */
let buffer = '';
let inFlight = 0;
let stdinEnded = false;

// Exit only once stdin has closed AND pending async work (e.g. Supabase
// calls) has drained — exiting on 'end' alone kills in-flight responses.
function maybeExit() {
  if (stdinEnded && inFlight === 0) process.exit(0);
}

async function handleLine(line) {
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    return; // Malformed JSON — can't associate with an id; ignore.
  }

  const result = await handleRpcMessage(msg);
  if (result.notification) return;
  process.stdout.write(JSON.stringify(result.response) + '\n');
}

process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buffer += chunk;
  let idx;
  while ((idx = buffer.indexOf('\n')) !== -1) {
    const line = buffer.slice(0, idx).trim();
    buffer = buffer.slice(idx + 1);
    if (!line) continue;
    inFlight++;
    handleLine(line)
      .catch(() => { /* already reported via rpc error when possible */ })
      .finally(() => {
        inFlight--;
        maybeExit();
      });
  }
});
process.stdin.on('end', () => {
  stdinEnded = true;
  maybeExit();
  // Safety net: if something hangs, still exit after 10s so the host
  // process is never left waiting forever.
  setTimeout(() => process.exit(0), 10000).unref();
});
process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

// Never let anything write to stdout except protocol messages.
console.log = console.warn = console.error = (...a) => process.stderr.write(a.join(' ') + '\n');
