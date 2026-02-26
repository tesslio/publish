import { test, expect, mock, beforeEach } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  formatReviewResults,
  getSkillPaths,
  parseThreshold,
  runSkillReview,
} from '../src/skill-review.ts';

// --- getSkillPaths ---

test('getSkillPaths returns path for root SKILL.md', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'skill-test-'));
  try {
    await Bun.write(join(dir, 'SKILL.md'), '# My Skill');
    const paths = await getSkillPaths(dir);
    expect(paths).toHaveLength(1);
    expect(paths[0]).toBe(dir);
  } finally {
    await rm(dir, { recursive: true });
  }
});

test('getSkillPaths returns paths for nested SKILL.md files', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'skill-test-'));
  try {
    await Bun.write(join(dir, 'skills', 'a', 'SKILL.md'), '# Skill A');
    await Bun.write(join(dir, 'skills', 'b', 'SKILL.md'), '# Skill B');
    const paths = await getSkillPaths(dir);
    expect(paths).toHaveLength(2);
    expect(paths.toSorted()).toEqual(
      [join(dir, 'skills', 'a'), join(dir, 'skills', 'b')].toSorted(),
    );
  } finally {
    await rm(dir, { recursive: true });
  }
});

test('getSkillPaths returns empty array when no SKILL.md exists', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'skill-test-'));
  try {
    await Bun.write(join(dir, 'README.md'), '# Not a skill');
    expect(await getSkillPaths(dir)).toEqual([]);
  } finally {
    await rm(dir, { recursive: true });
  }
});

// --- runSkillReview ---

const originalSpawn = Bun.spawn;

beforeEach(() => {
  Bun.spawn = originalSpawn;
});

function mockSpawn(stdout: string, stderr: string, exitCode: number) {
  // @ts-expect-error — mocking Bun.spawn
  Bun.spawn = mock((_args: string[], _opts?: unknown) => ({
    stdout: new Response(stdout).body,
    stderr: new Response(stderr).body,
    exited: Promise.resolve(exitCode),
  }));
}

test('runSkillReview passes when score >= threshold', async () => {
  mockSpawn(JSON.stringify({ contentJudge: { normalizedScore: 0.85 } }), '', 0);

  const result = await runSkillReview({
    skillPath: '/tmp/skill',
    threshold: 80,
  });

  expect(result.passed).toBe(true);
  expect(result.score).toBe(85);

  const spawnMock = Bun.spawn as ReturnType<typeof mock>;
  expect(spawnMock).toHaveBeenCalledWith(
    ['tessl', 'skill', 'review', '--json', '/tmp/skill'],
    expect.any(Object),
  );
});

test('runSkillReview fails when score < threshold', async () => {
  mockSpawn(JSON.stringify({ contentJudge: { normalizedScore: 0.6 } }), '', 0);

  const result = await runSkillReview({
    skillPath: '/tmp/skill',
    threshold: 80,
  });

  expect(result.passed).toBe(false);
  expect(result.score).toBe(60);
});

test('runSkillReview handles preamble text before JSON', async () => {
  const preamble =
    'By using Tessl, you agree to our Terms: https://tessl.io/policies/terms\n\n';
  mockSpawn(
    preamble + JSON.stringify({ contentJudge: { normalizedScore: 0.95 } }),
    '',
    0,
  );

  const result = await runSkillReview({
    skillPath: '/tmp/skill',
    threshold: 80,
  });

  expect(result.passed).toBe(true);
  expect(result.score).toBe(95);
});

test('runSkillReview passes on non-zero exit code (graceful)', async () => {
  mockSpawn('', 'something went wrong', 1);

  const result = await runSkillReview({
    skillPath: '/tmp/skill',
    threshold: 80,
  });

  expect(result.passed).toBe(true);
  expect(result.score).toBe(-1);
});

test('runSkillReview passes on invalid JSON output (graceful)', async () => {
  mockSpawn('not json', '', 0);

  const result = await runSkillReview({
    skillPath: '/tmp/skill',
    threshold: 80,
  });

  expect(result.passed).toBe(true);
  expect(result.score).toBe(-1);
});

// --- parseThreshold ---

test('parseThreshold returns default of 80', () => {
  expect(parseThreshold(undefined)).toBe(80);
});

test('parseThreshold parses valid value', () => {
  expect(parseThreshold('90')).toBe(90);
});

test('parseThreshold throws on invalid value', () => {
  expect(() => parseThreshold('abc')).toThrow('Invalid review threshold');
  expect(() => parseThreshold('-1')).toThrow('Invalid review threshold');
  expect(() => parseThreshold('101')).toThrow('Invalid review threshold');
});

// --- formatReviewResults ---

test('formatReviewResults shows PASSED for passing score', () => {
  const output = formatReviewResults(
    { passed: true, score: 85, output: '' },
    80,
  );
  expect(output).toContain('PASSED');
  expect(output).toContain('85/100');
  expect(output).toContain('threshold: 80');
});

test('formatReviewResults shows FAILED for failing score', () => {
  const output = formatReviewResults(
    { passed: false, score: 60, output: '' },
    80,
  );
  expect(output).toContain('FAILED');
  expect(output).toContain('60/100');
  expect(output).toContain('threshold: 80');
  expect(output).toContain('tessl skill review --optimize');
});
