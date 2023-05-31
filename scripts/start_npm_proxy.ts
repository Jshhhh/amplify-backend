import { execa, execaCommand } from 'execa';
import * as fs from 'fs-extra';

const EXPECTED_URL = 'http://localhost:4873';
const LOG_FILE = 'verdaccio-logs.txt';
const STARTUP_TIMEOUT_MS = 1000;

/**
 * Starts [Verdaccio](https://verdaccio.org/) in a background process.
 * This script will exit while the background server continues to run.
 * To stop the Verdaccio server run `npm run npm-proxy:stop`
 *
 * Also points the local npm config to point to the proxy server.
 */
const main = async () => {
  if (await fs.exists(LOG_FILE)) {
    await fs.unlink(LOG_FILE);
  }
  // start the server in a detached process
  await execaCommand(`verdaccio -c verdaccio.config.yaml &>${LOG_FILE} &`, {
    shell: 'bash',
  });

  // give the server a chance to start up
  await new Promise((resolve) => setTimeout(resolve, STARTUP_TIMEOUT_MS));

  const npmProxyLogs = await fs.readFile(LOG_FILE, 'utf-8');

  if (npmProxyLogs.includes('EADDRINUSE')) {
    throw new Error(
      'Failed to start npm proxy. Port is already in use. Do you ned to run `npm run npm-proxy:stop` first?'
    );
  }

  // when the server is ready a line like "http address - http://localhost:4873/ - verdaccio/5.24.1" is printed
  if (!npmProxyLogs.includes('http address')) {
    throw new Error(
      `Failed to start npm proxy within the timeout. Check the logs in ${LOG_FILE}`
    );
  }

  console.log(`Local npm proxy running at ${EXPECTED_URL}.`);

  execa('npm', ['config', 'set', 'registry', EXPECTED_URL, '--global']);
  console.log(`Set npm registry to ${EXPECTED_URL}`);
};

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});