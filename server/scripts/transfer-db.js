import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverRoot = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(serverRoot, '.env'), override: true });

const args = new Set(process.argv.slice(2));
const showHelp = args.has('--help') || args.has('-h');
const dumpOnly = args.has('--dump-only');
const restoreOnly = args.has('--restore-only');

if (showHelp) {
  console.log(`
Usage:
  node scripts/transfer-db.js [--dump-only] [--restore-only]

Environment variables:
  SOURCE_DATABASE_URL   Required for dump step (usually Neon URL)
  SERVER_DATABASE_URL   Required for restore step (local PostgreSQL URL)
  PG_BIN_DIR            Optional explicit path for pg_dump/pg_restore binaries

Behavior:
  - default: dump from SOURCE_DATABASE_URL then restore into SERVER_DATABASE_URL
  - --dump-only: only create backup dump file
  - --restore-only: restore latest dump file in server/backups
`);
  process.exit(0);
}

if (dumpOnly && restoreOnly) {
  console.error('Use either --dump-only or --restore-only, not both.');
  process.exit(1);
}

function isWindows() {
  return process.platform === 'win32';
}

function maskDbUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    if (url.password) {
      url.password = '***';
    }
    return url.toString();
  } catch {
    return '<invalid database url>';
  }
}

function getLatestPgBinDir() {
  if (!isWindows()) return null;

  const root = 'C:/Program Files/PostgreSQL';
  if (!fs.existsSync(root)) return null;

  const versions = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^\d+$/.test(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => Number(b) - Number(a));

  for (const version of versions) {
    const binDir = path.join(root, version, 'bin');
    if (fs.existsSync(path.join(binDir, 'pg_dump.exe')) && fs.existsSync(path.join(binDir, 'pg_restore.exe'))) {
      return binDir;
    }
  }

  return null;
}

function resolvePgBinary(binaryName) {
  const configuredBinDir = process.env.PG_BIN_DIR;
  if (configuredBinDir) {
    const configuredPath = path.join(configuredBinDir, isWindows() ? `${binaryName}.exe` : binaryName);
    if (fs.existsSync(configuredPath)) return configuredPath;
  }

  if (isWindows()) {
    const autoDir = getLatestPgBinDir();
    if (autoDir) return path.join(autoDir, `${binaryName}.exe`);
  }

  return binaryName;
}

function runCommand(command, commandArgs, description) {
  return new Promise((resolve, reject) => {
    console.log(`\n${description}`);
    console.log(`> ${command}`);

    const child = spawn(command, commandArgs, {
      stdio: 'inherit',
      shell: false,
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${description} failed with exit code ${code}`));
      }
    });
  });
}

async function main() {
  const sourceUrl = process.env.SOURCE_DATABASE_URL;
  const targetUrl = process.env.SERVER_DATABASE_URL;

  const backupsDir = path.join(serverRoot, 'backups');
  fs.mkdirSync(backupsDir, { recursive: true });

  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    '-',
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0'),
  ].join('');
  const dumpPath = path.join(backupsDir, `db-transfer-${stamp}.dump`);

  const pgDump = resolvePgBinary('pg_dump');
  const pgRestore = resolvePgBinary('pg_restore');

  if (!restoreOnly) {
    if (!sourceUrl) {
      throw new Error('SOURCE_DATABASE_URL is required for dump step.');
    }
    console.log(`Source: ${maskDbUrl(sourceUrl)}`);
    console.log(`Dump file: ${dumpPath}`);
    await runCommand(pgDump, [sourceUrl, '-Fc', '-f', dumpPath], 'Creating source database dump');
  }

  if (!dumpOnly) {
    if (!targetUrl) {
      throw new Error('SERVER_DATABASE_URL is required for restore step.');
    }

    let restoreDumpPath = dumpPath;
    if (restoreOnly) {
      const candidates = fs
        .readdirSync(backupsDir)
        .filter((name) => name.endsWith('.dump'))
        .sort()
        .reverse();
      if (candidates.length === 0) {
        throw new Error(`No dump files found in ${backupsDir}`);
      }
      restoreDumpPath = path.join(backupsDir, candidates[0]);
      console.log(`Latest dump selected: ${restoreDumpPath}`);
    }

    console.log(`Target: ${maskDbUrl(targetUrl)}`);
    await runCommand(
      pgRestore,
      ['--clean', '--if-exists', '--no-owner', '--no-privileges', '-d', targetUrl, restoreDumpPath],
      'Restoring dump into target database'
    );
  }

  console.log('\nDatabase transfer completed successfully.');
}

main().catch((error) => {
  console.error('\nDatabase transfer failed.');
  console.error(error.message);
  process.exit(1);
});
