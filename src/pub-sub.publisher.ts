import { createInterface, Interface } from 'node:readline/promises';
import { stdin, stdout } from 'process';
import { RedisClientType, createClient } from "redis";


const REDIS_CONNECT_URL = process.env.REDIS_CONNECT_URL
  || 'redis://host.docker.internal:6379';

let rClient: RedisClientType;
let rl: Interface;

let channel = process.argv[2] || 'global';

async function publish(command: string) {
  return rClient.publish(channel, command);
}

function setChannle(chnl: string) {
  channel = chnl;
}

async function runner() {
  let command = 'END';
  do {
    console.log(`
      Command:
      STCH: STCH chnl1, set channel chnl1 for publish.
      PUB: PUB my_cmd, publish my_cmd command.
      END: to end the process.
    `);
    
    const input = await rl.question('');
    const [cmd, arg1, ...args] = input.split(' ');
    command = cmd.trim();

    switch (command.toUpperCase()) {
      case 'STCH':
        setChannle(arg1);
        break;
      case 'PUB':
        await publish(arg1)
        break;
    }
  } while (command.toUpperCase() !== 'END')

}

async function init() {
  rClient = createClient({
    url: REDIS_CONNECT_URL
  });

  await rClient.connect();

  rl = createInterface({
    input: stdin,
    output: stdout
  });
}

async function cleanUp() {
  rl.close();
  await rClient.disconnect();
}

(async () => {
  try {
    await init();
    await runner();
  } catch (err) {
    console.error(err);
  } finally {
    await cleanUp();
  }
})();