import { createInterface, Interface } from 'node:readline/promises';
import { stdin, stdout } from 'process';
import { RedisClientType, createClient } from "redis";


const REDIS_CONNECT_URL = process.env.REDIS_CONNECT_URL
  || 'redis://host.docker.internal:6379';

let rClient: RedisClientType;
let rl: Interface;

const queueName = 'simple-queue';

async function size() {
  const elms = await rClient.lLen(queueName);
  console.log("Queue size: ", elms)
}

async function push(data: string) {
  return rClient.lPush(queueName, data);
}

async function pop() {
  return rClient.rPop(queueName);
}

async function show() {
  const currentState = await rClient.lRange(queueName, 0, -1);
  console.log(currentState);
}

async function runner() {
  let command = 'Q';
  do {
    console.log('\nCommand: [PUSH, POP, SHOW, Q]');
    const input = await rl.question('');
    const [cmd, args] = input.split(' ');
    command = cmd.trim();

    switch (command.toUpperCase()) {
      case 'PUSH':
        await push(args);
        break;
      case 'POP':
        console.log(await pop());
        break;
      case 'SHOW':
        await size();
        await show();
        break;
    }
  } while (command.toUpperCase() !== 'Q')

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
  await rClient.disconnect();
  rl.close();
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