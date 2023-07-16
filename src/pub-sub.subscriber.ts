import { RedisClientType, createClient } from "redis";
import { hostname } from 'os';


const REDIS_CONNECT_URL = process.env.REDIS_CONNECT_URL
  || 'redis://host.docker.internal:6379';

let rClient: RedisClientType;

let channel = process.argv[2] || 'global';

const commands: any = {
  'DATE': () => console.log(new Date()),
  'PING': () => console.log('PONG'),
  'HOSTNAME': () => console.log(hostname())
}

function listener(cmd: string) {
  const cmdfunc = commands[cmd.toUpperCase()];
  if (cmdfunc) {
    cmdfunc();
  } else {
    console.log(`Invalid command: ${cmd}`)
  }
}

async function init() {
  rClient = createClient({
    url: REDIS_CONNECT_URL
  });

  await rClient.connect();
  rClient.subscribe(['global', channel], (msg: string) => {
    listener(msg);
  });
}

async function cleanUp() {
  return rClient.disconnect();
}

(async () => {
  try {
    await init();
    console.log('========== subscribed =============\n')
  } catch (err) {
    console.error(err);
  } finally {
    await cleanUp();
  }
})();