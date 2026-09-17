# 1percent Learn — MCP Server

A Model Context Protocol (MCP) server that lets **claude.ai (web)**, **Claude Desktop**, or **Claude Code** manage your learning platform directly: courses, lessons, challenges, and the real code grader.

No extra dependencies — it uses the same Supabase service-role client your backend already has, loaded from the project's `.env`.

## Two transports, one set of tools

| Transport | Client | Endpoint |
|---|---|---|
| **Streamable HTTP** | claude.ai (web) | `https://<your-domain>/mcp/<MCP_HTTP_TOKEN>` |
| **stdio** | Claude Desktop, Claude Code | `node backend/mcp/server.js` |

All tool logic lives in `backend/mcp/core.js`; `server.js` (stdio) and `../routes/mcpRoutes.js` (HTTP) are thin transports over it.

---

# Student connection — "Connect to Claude"

Students get their own read-only MCP server so Claude can act as a **study
companion** instead of a homework machine. Each student generates a personal
token in **Settings → Connect to Claude**, adds the connector in claude.ai,
and Claude can then see *their* learning data — and nothing else.

| | Admin MCP | Student MCP |
|---|---|---|
| Endpoint | `/mcp/<MCP_HTTP_TOKEN>` | `/mcp/student/<student-token>` |
| Auth | shared `MCP_HTTP_TOKEN` from `.env` | per-student token (hashed at rest) |
| Identity | service-role (full platform) | scoped to the token's `user_id` |
| Writes | full CRUD on courses/lessons/challenges | **none — read-only** |

## Student tools

| Tool | What it does |
|---|---|
| `my_learning_overview` | Enrolled courses with progress %, coins, streak, certificates |
| `my_courses` | Enrolled courses with next lessons + next un-passed challenge |
| `get_lesson` | Full lesson content — explain, summarize, answer questions |
| `get_challenge` | Challenge description + starter code (**never** the hidden expected output/test cases) |
| `check_my_code` | Dry-run the student's draft through the real grader — no coins, no submission, no completion |
| `my_progress_in_course` | Every lesson/challenge in a course, done vs not, plus the next step |
| `my_activity` | Recent completions and challenge attempts |

## Academic-integrity guarantees

- There is **no tool that writes anything**: no submit, no progress, no coins.
- `get_challenge` deliberately withholds `expected_output` and `test_cases`.
- `check_my_code` returns the same reject reason the playground shows, so
  Claude can *explain* a failure — but the tool result tells Claude the
  student must submit their own final solution.
- The server's `instructions` field tells Claude: never do assignments for
  the student.

## Student setup steps (shown in the settings page)

1. Settings → **Connect to Claude** → Generate Token (shown once).
2. claude.ai → Settings → Connectors → **Add custom connector**.
3. Name: `1% Learn`. URL: `https://learn.1percent.rw/mcp/student/<token>`.
4. Start a chat → tools menu → pick **1% Learn**.

### Account-based (OAuth) connection — no token at all

The preferred flow: claude.ai discovers `/.well-known/oauth-authorization-server`, **self-registers a public client** via `POST /mcp/oauth/register` (RFC 7591), then sends the student to `/mcp/oauth/authorize` where they log in and approve. Claude exchanges the code (+ PKCE verifier) at `/mcp/oauth/token` and gets a scoped bearer token for `/mcp/student`.

**Admin accounts get admin tools automatically.** When the account approving consent has `profiles.role = 'admin'`, the server grants an extra `admin` scope (clients can never request it themselves). The consent page shows an explicit "ADMIN ACCESS" disclosure before approval, and the resulting token can call the full platform toolset from `backend/mcp/core.js` — create/update/delete courses, lessons, and challenges, plus `platform_stats` — on the same `/mcp/student` connector URL, alongside the student self tools. The role is re-checked at token issue and the scope rides on the token; a demoted account's next reconnect is student-only. Students cannot obtain the scope, no matter what their client asks for.

If claude.ai ever says *"Automatic client registration isn't supported"*, the deployment is missing `registration_endpoint` in its discovery metadata or `migrations/add_mcp_oauth_clients.sql` has not been run — the register route returns `invalid_client`/400s otherwise and the flow dies before consent.

## Implementation map

| File | Role |
|---|---|
| `backend/mcp/studentCore.js` | Student tool definitions + JSON-RPC dispatch (user-scoped) |
| `backend/services/studentMcpService.js` | Token generate/verify (SHA-256)/revoke/status |
| `backend/services/mcpOAuthService.js` | OAuth account flow: auth codes, PKCE, tokens, RFC 7591 dynamic client registration |
| `backend/routes/mcpOAuthRoutes.js` | `/mcp/oauth/*` — authorize (consent), register, token, discovery, revoke |
| `backend/routes/studentMcpRoutes.js` | `/api/mcp/student/*` token management + `/mcp/student` JSON-RPC |
| `migrations/add_student_mcp_tokens.sql` | `student_mcp_tokens` table (run in Supabase SQL editor) |
| `migrations/add_mcp_oauth_clients.sql` | `mcp_oauth_clients` table for dynamic registration (run in Supabase SQL editor) |
| `frontend/settings.html` | "Connect to Claude" settings tab |

> Rotating a token instantly invalidates the old connector URL (the old hash
> is replaced). Revoking disconnects Claude immediately. Tokens can only be
> generated for one's own account (JWT-authenticated endpoints).

### How to tell you're actually connected

After clicking **Approve** on the consent page you're returned to
Settings, where a toast confirms it — **"Claude is connected to your
account!"** — and the status pill flips to **Connected**. That toast is
not cosmetic: it only appears after Settings exchanged the one-time
code at `/mcp/oauth/token`, which is what creates the server-side
connection (hashed bearer tokens bound to your user). If you reached
Settings and saw **no toast and the pill still says "Not connected"**, the
exchange failed (e.g. the code sat longer than 10 minutes, or the PKCE
verifier was lost by a different-browser round-trip) — just click
**Connect to Claude** again; the old code is single-use and burns itself.

You can also verify independently in claude.ai: open a chat → tools menu
→ **1% Learn** → ask *"What should I work on next?"* — a real answer with
your courses proves the bearer token works end-to-end.

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
