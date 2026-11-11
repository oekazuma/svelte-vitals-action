import { writeFileSync } from 'node:fs';

const env = process.env;
if (env.FAKE_ARGS_FILE) writeFileSync(env.FAKE_ARGS_FILE, JSON.stringify(process.argv.slice(2)));
if (env.FAKE_ENV_FILE) writeFileSync(env.FAKE_ENV_FILE, JSON.stringify(env));
if (env.FAKE_SIGNAL) process.kill(process.pid, env.FAKE_SIGNAL);
if (env.FAKE_STDOUT_BYTES) process.stdout.write('x'.repeat(Number(env.FAKE_STDOUT_BYTES)));
else if (env.FAKE_STDOUT) process.stdout.write(env.FAKE_STDOUT);
if (env.FAKE_STDERR) process.stderr.write(env.FAKE_STDERR);
// exitCode rather than process.exit(), so buffered pipe writes flush before exit.
process.exitCode = Number(env.FAKE_EXIT ?? 0);
