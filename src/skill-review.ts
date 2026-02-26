import { Glob } from 'bun';

export interface SkillReviewOptions {
  tilePath: string;
  threshold: number;
  optimize: boolean;
  maxIterations: number;
}

export interface SkillReviewResult {
  passed: boolean;
  score: number;
  output: string;
}

export async function hasSkills(tilePath: string): Promise<boolean> {
  const glob = new Glob('**/SKILL.md');
  for await (const _ of glob.scan({
    cwd: tilePath,
    dot: false,
    followSymlinks: false,
    onlyFiles: true,
  })) {
    return true;
  }
  return false;
}

export async function runSkillReview(
  opts: SkillReviewOptions,
): Promise<SkillReviewResult> {
  const args = ['tessl', 'skill', 'review', '--json'];

  if (opts.optimize) {
    args.push(
      '--yes',
      '--optimize',
      '--max-iterations',
      String(opts.maxIterations),
    );
  }

  args.push(opts.tilePath);

  const proc = Bun.spawn(args, {
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);

  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    throw new Error(
      `tessl skill review failed (exit code ${exitCode}): ${stderr}`,
    );
  }

  let parsed: { score?: number };
  try {
    parsed = JSON.parse(stdout) as { score?: number };
  } catch {
    throw new Error(`Failed to parse skill review output: ${stdout}`);
  }

  const score = parsed.score ?? 0;

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
