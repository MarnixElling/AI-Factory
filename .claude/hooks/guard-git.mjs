import { execSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const input = JSON.parse(readFileSync(0, 'utf8'));
const command = input.tool_input?.command ?? '';

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(2);
}

function currentBranch() {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

const isCommit = /\bgit\s+commit\b/.test(command);
const isPush = /\bgit\s+push\b/.test(command);
const onProtectedBranch = /^(main|master)$/.test(currentBranch());

if (isCommit && onProtectedBranch) {
  fail('Commits on main are not allowed. Create a branch first.');
}

if (isPush && onProtectedBranch) {
  fail('Pushing from main is not allowed. Switch to a working branch.');
}

if (isPush && /(\s--force\b|\s-f\b|\s--force-with-lease\b)/.test(command)) {
  fail('Force pushes are not allowed.');
}

if (isPush && /\s(main|master)\b/.test(command)) {
  fail('Pushing to main is not allowed. Open a pull request instead.');
}

if (isCommit) {
  const result = spawnSync('yarn', ['check'], { encoding: 'utf8', shell: true });
  if (result.status !== 0) {
    fail(`yarn check failed. Fix the issues before committing.\n${result.stdout}${result.stderr}`);
  }
}
