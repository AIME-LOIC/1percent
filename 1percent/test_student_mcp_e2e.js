/* End-to-end HTTP test for the student MCP endpoint */
require('dotenv').config();
const svc = require('./backend/services/studentMcpService');

const BASE = 'http://localhost:3000';
const TOKEN = require('fs').readFileSync('/tmp/testtoken.txt', 'utf8').trim();

async function rpc(body, path) {
  const res = await fetch(`${BASE}${path || '/mcp/student/' + TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res;
}

(async () => {
  let failures = 0;
  const check = (name, cond, extra) => {
    console.log((cond ? '✓' : '✗ FAIL'), name, extra || '');
    if (!cond) failures++;
  };

  // 1. initialize
  let res = await rpc({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} });
  let j = await res.json();
  check('initialize', j.result?.serverInfo?.name === 'onepercent-learn-student', JSON.stringify(j.result?.serverInfo || j.error || ''));

  // 2. tools/list
  res = await rpc({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
  j = await res.json();
  const names = (j.result?.tools || []).map(t => t.name);
  check('tools/list has 7 tools', names.length === 7, names.join(', '));
  check('no write tools', !names.some(n => /create|update|delete|submit|award/i.test(n)));

  // 3. my_learning_overview with real student data
  res = await rpc({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'my_learning_overview', arguments: {} } });
  j = await res.json();
  const text = j.result?.content?.[0]?.text || '';
  check('my_learning_overview ok', !j.result?.isError && text.includes('enrolled_courses'), text.slice(0, 200));

  // 4. my_courses
  res = await rpc({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'my_courses', arguments: {} } });
  j = await res.json();
  check('my_courses ok', j.result && !j.result.isError, (j.result?.content?.[0]?.text || '').slice(0, 150));

  // 5. my_activity
  res = await rpc({ jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'my_activity', arguments: { limit: 5 } } });
  j = await res.json();
  check('my_activity ok', j.result && !j.result.isError, (j.result?.content?.[0]?.text || '').slice(0, 150));

  // 6. get_challenge with hidden fields check
  res = await rpc({ jsonrpc: '2.0', id: 6, method: 'tools/call', params: { name: 'my_progress_in_course', arguments: { course_slug: 'programming-fundamentals' } } });
  j = await res.json();
  const progText = j.result?.content?.[0]?.text || '';
  check('my_progress_in_course ok', j.result && !j.result.isError, progText.slice(0, 150));

  // 7. invalid token → 401
  res = await rpc({ jsonrpc: '2.0', id: 9, method: 'tools/list' }, '/mcp/student/sk-mcp-' + 'f'.repeat(32));
  check('invalid token → 401', res.status === 401, 'status=' + res.status);

  // 8. GET → 405
  const getRes = await fetch(BASE + '/mcp/student/' + TOKEN);
  check('GET → 405', getRes.status === 405, 'status=' + getRes.status);

  // 9. Bearer auth also works
  res = await fetch(BASE + '/mcp/student', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + TOKEN },
    body: JSON.stringify({ jsonrpc: '2.0', id: 10, method: 'ping' })
  });
  j = await res.json();
  check('Bearer auth ping', j.result !== undefined, JSON.stringify(j));

  // 10. admin MCP still reachable at /mcp/<admin-token>
  const adminToken = process.env.MCP_HTTP_TOKEN;
  res = await fetch(BASE + '/mcp/' + adminToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 11, method: 'tools/list' })
  });
  j = await res.json();
  check('admin MCP unaffected', Array.isArray(j.result?.tools) && j.result.tools.length > 0, (j.result?.tools || []).length + ' tools');

  console.log(failures === 0 ? '\nALL E2E TESTS PASSED' : `\n${failures} TEST(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
})().catch(e => { console.error('E2E FAIL', e); process.exit(1); });
