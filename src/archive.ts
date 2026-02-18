import { Glob } from 'bun';
import { join } from 'node:path';

export async function createArchive(path: string): Promise<Uint8Array> {
  const files: Record<string, Uint8Array> = {};
  const glob = new Glob('**/*.{md,js,py,sh,txt,json,ps1}');

  for await (const filePath of glob.scan({
    cwd: path,
    dot: false,
    followSymlinks: false,
    onlyFiles: true,
  })) {
    const file = Bun.file(join(path, filePath));
    files[filePath] = await file.bytes();
  }

  if (Object.keys(files).length === 0) {
    throw new Error(`No files found in path: ${path}`);
  }

  const archive = new Bun.Archive(files, { compress: 'gzip' });
  return archive.bytes();
}
