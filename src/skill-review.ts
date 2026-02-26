import { Glob } from 'bun';
import { dirname, join } from 'node:path';

export interface SkillReviewOptions {
  skillPath: string;
  threshold: number;
  optimize: boolean;
  maxIterations: number;
}

export interface SkillReviewResult {
  passed: boolean;
  score: number;
  output: string;
}

export async function getSkillPaths(tilePath: string): Promise<string[]> {
  const glob = new Glob('**/SKILL.md');
  const paths: string[] = [];
  for await (const match of glob.scan({
    cwd: tilePath,
    dot: false,
    followSymlinks: false,
    onlyFiles: true,
  })) {
    paths.push(dirname(join(tilePath, match)));
  }
  return paths;
}

async function spawnTessl(
  args: string[],
  pipe: boolean,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = Bun.spawn(args, {
    stdout: pipe ? 'pipe' : 'inherit',
    stderr: pipe ? 'pipe' : 'inherit',
  });

  const [stdout, stderr] = pipe
    ? await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
      ])
    : ['', ''];

  const exitCode = await proc.exited;
  return { stdout, stderr, exitCode };
}

export async function optimizeSkill(
  skillPath: string,
  maxIterations: number,
): Promise<void> {
  console.log(`Optimizing skill at ${skillPath}...`);
  const { stderr, exitCode } = await spawnTessl(
    [
      'tessl',
      'skill',
      'review',
      '--yes',
      '--optimize',
      '--max-iterations',
      String(maxIterations),
      skillPath,
    ],
    false,
  );
  if (exitCode !== 0) {
    console.warn(
      `tessl skill optimize failed (exit code ${exitCode}): ${stderr}`,
    );
  }
}

export async function runSkillReview(
  opts: SkillReviewOptions,
): Promise<SkillReviewResult> {
  const { stdout, stderr, exitCode } = await spawnTessl(
    ['tessl', 'skill', 'review', '--json', opts.skillPath],
    true,
  );

  if (exitCode !== 0) {
    console.warn(
      `tessl skill review failed (exit code ${exitCode}): ${stderr}`,
    );
    return { passed: true, score: -1, output: stderr };
  }

  const jsonStart = stdout.indexOf('{');
  if (jsonStart === -1) {
    console.warn(`No JSON found in skill review output: ${stdout}`);
    return { passed: true, score: -1, output: stdout };
  }
  const jsonStr = stdout.slice(jsonStart);

  let parsed: { contentJudge?: { normalizedScore?: number } };
  try {
    parsed = JSON.parse(jsonStr) as typeof parsed;
  } catch {
    console.warn(`Failed to parse skill review output: ${jsonStr}`);
    return { passed: true, score: -1, output: jsonStr };
  }

  const normalizedScore = parsed.contentJudge?.normalizedScore ?? 0;
  const score = Math.round(normalizedScore * 100);

  return {
    passed: score >= opts.threshold,
    score,
    output: stdout,
  };
}

export function parseThreshold(value: string | undefined): number {
  const num = Number(value ?? '80');
  if (Number.isNaN(num) || num < 0 || num > 100) {
    throw new Error(`Invalid review threshold: ${value}. Must be 0-100`);
  }
  return num;
}

export function parseMaxIterations(value: string | undefined): number {
  const num = Number(value ?? '3');
  if (Number.isNaN(num) || num < 1 || num > 10) {
    throw new Error(`Invalid max iterations: ${value}. Must be 1-10`);
  }
  return num;
}

export function formatReviewResults(
  result: SkillReviewResult,
  threshold: number,
): string {
  const status = result.passed ? 'PASSED' : 'FAILED';
  const lines = [
    `Skill Review: ${status}`,
    `  Score: ${result.score}/100 (threshold: ${threshold})`,
  ];
  return lines.join('\n');
}
