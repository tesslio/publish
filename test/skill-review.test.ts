import { test, expect, mock, beforeEach } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  formatReviewResults,
  hasSkills,
  parseMaxIterations,
  parseThreshold,
  runSkillReview,
} from '../src/skill-review.ts';

// --- hasSkills ---

test('hasSkills returns true when SKILL.md exists', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'skill-test-'));
  try {
    await Bun.write(join(dir, 'SKILL.md'), '# My Skill');
    expect(await hasSkills(dir)).toBe(true);
  } finally {
    await rm(dir, { recursive: true });
  }
});

test('hasSkills returns true for nested SKILL.md', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'skill-test-'));
  try {
    const nested = join(dir, 'skills', 'my-skill');
    await Bun.write(join(nested, 'SKILL.md'), '# Nested Skill');
    expect(await hasSkills(dir)).toBe(true);
  } finally {
    await rm(dir, { recursive: true });
  }
});

test('hasSkills returns false when no SKILL.md exists', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'skill-test-'));
  try {
    await Bun.write(join(dir, 'README.md'), '# Not a skill');
    expect(await hasSkills(dir)).toBe(false);
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
  mockSpawn(JSON.stringify({ score: 85 }), '', 0);

  const result = await runSkillReview({
    tilePath: '/tmp/tile',
    threshold: 80,
    optimize: false,
    maxIterations: 3,
  });

  expect(result.passed).toBe(true);
  expect(result.score).toBe(85);

  const spawnMock = Bun.spawn as ReturnType<typeof mock>;
  expect(spawnMock).toHaveBeenCalledWith(
    ['tessl', 'skill', 'review', '--json', '--yes', '/tmp/tile'],
    expect.any(Object),
  );
});

test('runSkillReview fails when score < threshold', async () => {
  mockSpawn(JSON.stringify({ score: 60 }), '', 0);

  const result = await runSkillReview({
    tilePath: '/tmp/tile',
    threshold: 80,
    optimize: false,
    maxIterations: 3,
  });

  expect(result.passed).toBe(false);
  expect(result.score).toBe(60);
});

test('runSkillReview passes --optimize and --max-iterations flags', async () => {
  mockSpawn(JSON.stringify({ score: 90 }), '', 0);

  await runSkillReview({
    tilePath: '/tmp/tile',
    threshold: 80,
    optimize: true,
    maxIterations: 5,
  });

  const spawnMock = Bun.spawn as ReturnType<typeof mock>;
  expect(spawnMock).toHaveBeenCalledWith(
    [
      'tessl',
      'skill',
      'review',
      '--json',
      '--yes',
      '--optimize',
      '--max-iterations',
      '5',
      '/tmp/tile',
    ],
    expect.any(Object),
  );
});

test('runSkillReview throws on non-zero exit code', async () => {
  mockSpawn('', 'something went wrong', 1);

  await expect(
    runSkillReview({
      tilePath: '/tmp/tile',
      threshold: 80,
      optimize: false,
      maxIterations: 3,
    }),
  ).rejects.toThrow('tessl skill review failed (exit code 1)');
});

test('runSkillReview throws on invalid JSON output', async () => {
  mockSpawn('not json', '', 0);

  await expect(
    runSkillReview({
      tilePath: '/tmp/tile',
      threshold: 80,
      optimize: false,
      maxIterations: 3,
    }),
  ).rejects.toThrow('Failed to parse skill review output');
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

// --- parseMaxIterations ---

test('parseMaxIterations returns default of 3', () => {
  expect(parseMaxIterations(undefined)).toBe(3);
});

test('parseMaxIterations parses valid value', () => {
  expect(parseMaxIterations('5')).toBe(5);
});

test('parseMaxIterations throws on invalid value', () => {
  expect(() => parseMaxIterations('abc')).toThrow('Invalid max iterations');
  expect(() => parseMaxIterations('0')).toThrow('Invalid max iterations');
  expect(() => parseMaxIterations('11')).toThrow('Invalid max iterations');
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
});
