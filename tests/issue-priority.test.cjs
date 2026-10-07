const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const YAML = require('yaml');

const workflow = YAML.parse(fs.readFileSync(path.join(__dirname, '../.github/workflows/issue-priority.yml'), 'utf8'));
const caller = YAML.parse(fs.readFileSync(path.join(__dirname, '../templates/issue-priority-caller.yml'), 'utf8'));
const source = workflow.jobs.priority.steps[0].with.script;
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const executeScript = new AsyncFunction('github', 'context', 'core', source);
const body = (priority) => `### Opis\n\nTask text.\n\n### Prioriteta\n\n${priority}\n\n### Rok\n\n_No response_`;
const apiError = (status) => Object.assign(new Error(`HTTP ${status}`), { status });

function mock(options = {}) {
  const calls = [];
  const messages = [];
  const issueBodies = [...(options.bodies || [body('2P')])];
  let currentBody = issueBodies[0];
  let labels = options.labels || [{ name: 'bug' }, { name: '4P' }, { name: 'posel' }];
  let readLabelCount = 0;
  const issues = {
    async get(params) {
      calls.push(['get', params]);
      if (issueBodies.length) currentBody = issueBodies.shift();
      return { data: { number: 42, body: currentBody } };
    },
    async getLabel(params) {
      calls.push(['getLabel', params]);
      const error = options.labelReadErrors?.[readLabelCount++];
      if (error) throw error;
      return { data: { name: params.name } };
    },
    async createLabel(params) {
      calls.push(['createLabel', params]);
      if (options.createError) throw options.createError;
      return { data: { name: params.name } };
    },
    listLabelsOnIssue() {
      throw new Error('Use github.paginate so no issue labels are silently omitted.');
    },
    async setLabels(params) {
      calls.push(['setLabels', params]);
      if (options.setError) throw options.setError;
      labels = params.labels.map((name) => ({ name }));
      return { data: labels };
    },
  };
  const github = {
    rest: { issues },
    async paginate(endpoint, params) {
      calls.push(['paginate', params]);
      assert.equal(endpoint, issues.listLabelsOnIssue);
      assert.equal(params.per_page, 100);
      return labels;
    },
  };
  const context = {
    repo: { owner: 'Orka-Informatika', repo: 'fixture' },
    payload: { action: 'edited', issue: { number: 42, body: options.payloadBody ?? body('4P'), labels: [] } },
  };
  const core = { info(message) { messages.push(message); } };
  return {
    calls, messages, context,
    run: () => executeScript(github, context, core),
    writes: () => calls.filter(([name]) => ['createLabel', 'setLabels'].includes(name)),
    labels: () => labels.map((label) => label.name),
  };
}

test('workflow only handles body edits, serializes per issue, and needs no Projects secret or checkout', () => {
  assert.deepEqual(workflow.on, { workflow_call: null });
  assert.deepEqual(workflow.permissions, { issues: 'write' });
  assert.deepEqual(caller.on.issues.types, ['opened', 'edited']);
  assert.deepEqual(caller.permissions, { issues: 'write' });
  assert.equal(workflow.jobs.priority.concurrency['cancel-in-progress'], false);
  assert.match(workflow.jobs.priority.concurrency.group, /github\.repository/);
  assert.match(workflow.jobs.priority.concurrency.group, /github\.event\.issue\.number/);
  assert.equal(workflow.jobs.priority.steps.length, 1);
  assert.equal(workflow.jobs.priority.steps[0].uses, 'actions/github-script@3a2844b7e9c422d3c10d287c895573f7108da1b3');
  assert.doesNotMatch(source, /\$\{\{|PROJECT_TOKEN|graphql|process\.env/);
});

test('actual inline script preserves the explicit priority-only policy', async () => {
  const run = mock();
  await run.run();
  assert.deepEqual(run.labels(), ['2P']);
  assert.deepEqual(run.writes(), [['setLabels', { owner: 'Orka-Informatika', repo: 'fixture', issue_number: 42, labels: ['2P'] }]]);
});

test('reads current issue body rather than stale event body and stale event labels', async () => {
  const run = mock({ payloadBody: body('1P'), bodies: [body('3P')], labels: [{ name: '1P' }] });
  await run.run();
  assert.deepEqual(run.labels(), ['3P']);
  assert.equal(run.calls[0][0], 'get');
});

test('does not mutate when priority is absent, malformed, duplicated, or only inside fenced code', async (t) => {
  const cases = [
    null,
    '',
    '### Opis\n\nNothing here.',
    body('_No response_'),
    body('2P\nadditional text'),
    body('1P, 2P'),
    body('2P') + '\n### Prioriteta\n\n1P',
    '```markdown\n### Prioriteta\n\n2P\n```',
    '~~~markdown\n### Prioriteta\n\n2P\n~~~',
    body('```\n2P\n```'),
    '### Prioriteta dodatno\n\n2P',
    body('__proto__'),
  ];
  for (const [index, value] of cases.entries()) {
    await t.test(`malformed fixture ${index + 1}`, async () => {
      const run = mock({ bodies: [value] });
      await run.run();
      assert.deepEqual(run.writes(), []);
      assert.deepEqual(run.calls.map(([name]) => name), ['get']);
    });
  }
});

test('parses CRLF form, ignoring incidental priority headings in a code block elsewhere', async () => {
  const current = '### Opis\n\n```markdown\n### Prioriteta\n\n1P\n```\n\n### Prioriteta\n\n4P\n\n### Rok\n\n_No response_';
  const run = mock({ bodies: [current.replace(/\n/g, '\r\n')] });
  await run.run();
  assert.deepEqual(run.labels(), ['4P']);
});

test('unchanged correct labels cause no writes', async () => {
  const run = mock({ labels: [{ name: '2P' }] });
  await run.run();
  assert.deepEqual(run.writes(), []);
});

test('all current labels are considered, including ones beyond the first API page', async () => {
  const labels = Array.from({ length: 205 }, (_, index) => ({ name: `legacy-${index}` }));
  labels.unshift({ name: '2P' });
  const run = mock({ labels });
  await run.run();
  assert.ok(run.calls.some(([name]) => name === 'paginate'));
  assert.deepEqual(run.labels(), ['2P']);
});

test('creates a missing priority label with the original color and description', async () => {
  const run = mock({ labelReadErrors: [apiError(404)] });
  await run.run();
  assert.deepEqual(run.writes()[0], ['createLabel', { owner: 'Orka-Informatika', repo: 'fixture', name: '2P', color: 'f9a86d', description: 'Visoka prioriteta' }]);
  assert.deepEqual(run.labels(), ['2P']);
});

test('concurrent label creation 422 is accepted only after successful label readback', async () => {
  const run = mock({ labelReadErrors: [apiError(404), null], createError: apiError(422) });
  await run.run();
  assert.deepEqual(run.calls.slice(0, 4).map(([name]) => name), ['get', 'getLabel', 'createLabel', 'getLabel']);
  assert.deepEqual(run.labels(), ['2P']);
});

test('422 without a successful readback fails and does not change issue labels', async () => {
  const run = mock({ labelReadErrors: [apiError(404), apiError(404)], createError: apiError(422) });
  await assert.rejects(run.run(), { status: 404 });
  assert.equal(run.calls.some(([name]) => name === 'setLabels'), false);
});

test('unknown API errors are not swallowed', async (t) => {
  for (const [name, options, status] of [
    ['label lookup', { labelReadErrors: [apiError(403)] }, 403],
    ['label creation', { labelReadErrors: [apiError(404)], createError: apiError(500) }, 500],
    ['label race readback', { labelReadErrors: [apiError(404), apiError(403)], createError: apiError(422) }, 403],
    ['label replacement', { setError: apiError(500) }, 500],
  ]) {
    await t.test(name, async () => {
      const run = mock(options);
      await assert.rejects(run.run(), { status });
    });
  }
});

test('superseded priority is re-read before changing issue labels', async () => {
  const run = mock({ bodies: [body('4P'), body('1P'), body('1P'), body('1P')] });
  await run.run();
  assert.deepEqual(run.writes(), [['setLabels', { owner: 'Orka-Informatika', repo: 'fixture', issue_number: 42, labels: ['1P'] }]]);
});

test('a priority removed during the run leaves issue labels unchanged', async () => {
  const run = mock({ bodies: [body('2P'), '### Opis\n\nNo priority', '### Opis\n\nNo priority'] });
  await run.run();
  assert.deepEqual(run.writes(), []);
});

test('continuous edits fail visibly after bounded retries instead of applying stale priority', async () => {
  const run = mock({ bodies: [body('1P'), body('2P'), body('1P'), body('2P'), body('1P'), body('2P')] });
  await assert.rejects(run.run(), /kept changing/);
  assert.deepEqual(run.writes(), []);
});

test('untrusted form text is data, never executable script', async () => {
  const run = mock({ bodies: [body('2P; throw new Error("executed")')] });
  await run.run();
  assert.deepEqual(run.writes(), []);
});
