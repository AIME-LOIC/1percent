# 1percent Learn — MCP Server

A Model Context Protocol (MCP) server that lets **claude.ai (web)**, **Claude Desktop**, or **Claude Code** manage your learning platform directly: courses, lessons, challenges, and the real code grader.

No extra dependencies — it uses the same Supabase service-role client your backend already has, loaded from the project's `.env`.

## Two transports, one set of tools

| Transport | Client | Endpoint |
|---|---|---|
| **Streamable HTTP** | claude.ai (web) | `https://<your-domain>/mcp/<MCP_HTTP_TOKEN>` |
| **stdio** | Claude Desktop, Claude Code | `node backend/mcp/server.js` |

All tool logic lives in `backend/mcp/core.js`; `server.js` (stdio) and `../routes/mcpRoutes.js` (HTTP) are thin transports over it.

## Tools

| Tool | What it does |
|---|---|
| `list_courses` | All courses + lesson/challenge counts (`published_only` filter) |
| `get_course` | Full course: every lesson and challenge incl. content, starter code, expected outputs |
| `create_course` / `update_course` / `delete_course` | Manage courses by slug |
| `create_lesson` / `update_lesson` / `delete_lesson` | Manage lessons (markdown content) |
| `create_challenge` / `update_challenge` / `delete_challenge` | Manage challenges (`expected_output` = execution-graded, `test_cases` = DOM-graded) |
| `test_grader` | Run code through the **real grader** against any challenge — shows passed/failed + the exact reject reason a student would see. Never awards coins or saves submissions |
| `platform_stats` | Counts, pass rates, recent coin transactions |

## Connect claude.ai (web) — remote connector

1. Make sure `MCP_HTTP_TOKEN` is set in `.env` (a strong random string is pre-generated) and the backend is deployed with the `/mcp` route.
2. In claude.ai: **Settings → Connectors → Add custom connector**.
3. Name: `1percent Learn`. URL: `https://learn.1percent.rw/mcp/<MCP_HTTP_TOKEN>` (use your real token from `.env`).
4. Claude.ai sends JSON-RPC over POST — no SSE/session management needed (stateless mode).
5. Start a new chat → click the tools/context menu → **1percent Learn** tools are available.

> The token is in the URL, so treat the URL like a password. If it leaks: change `MCP_HTTP_TOKEN` in `.env`, redeploy — old URLs stop working instantly.

## Connect Claude Desktop

Add to `claude_desktop_config.json` (Settings → Developer → Edit Config):

```json
{
  "mcpServers": {
    "onepercent-learn": {
      "command": "node",
      "args": ["/absolute/path/to/this/project/backend/mcp/server.js"]
    }
  }
}
```

Replace the path with your project's absolute path. Restart Claude Desktop — a tools icon (hammer) appears in the chat box.

## Connect Claude Code

From the project root:

```bash
claude mcp add onepercent-learn -- node backend/mcp/server.js
```

Or add to `.mcp.json` in the project root:

```json
{
  "mcpServers": {
    "onepercent-learn": {
      "command": "node",
      "args": ["backend/mcp/server.js"]
    }
  }
}
```

## Example prompts once connected

- "List my courses and which ones are still drafts"
- "Show me the Python course with all lessons and challenges"
- "Create a course called 'Git Essentials' with 5 lessons, publish it"
- "Add a python challenge 'Sum two numbers' that expects 8 — starter code has `a = 3, b = 5`"
- "Grade `print(2 + 2)` against the 'Countdown' challenge and tell me why it fails"
- "What's the platform pass rate?"

## Security notes

- The server uses the **service-role key** (bypasses RLS) — it must only run on your machine or the server, never in a browser or shared environment.
- `delete_course` is soft by default (challenges are kept); pass `delete_challenges: true` to remove them.
- All writes are immediate in Supabase — Claude will typically confirm before destructive actions, but review before approving.
