import { createInterface, Interface } from 'node:readline/promises';
import { stdin, stdout } from 'process';
import { RedisClientType, createClient } from "redis";


const REDIS_CONNECT_URL = process.env.REDIS_CONNECT_URL
  || 'redis://host.docker.internal:6379';

let rClient: RedisClientType;
let rl: Interface;

function getId(id: string) {
  return `link:${id}`;
}

async function add([id, author, title, link]: string[]) {
  return rClient.hSet(getId(id), ['author', author, 'title', title, 'link', link, 'score', 0]);
}

async function upVote(id: string) {
  return rClient.hIncrBy(getId(id), 'score', 1);
}

async function downVote(id: string) {
  return rClient.hIncrBy(getId(id), 'score', -1);
}

async function showDetails(id: string) {
  const details = await rClient.hGetAll(getId(id));
  console.log('--------------- details --------------');
  console.log(JSON.stringify(details, null, 2));
  console.log('--------------------------------------')
}

async function runner() {
let command = 'Q';
  do {
    console.log('\nCommand: [ADD, UP, DW, SHOW, Q]');
    const input = await rl.question('');
    const [cmd, args, ...othr] = input.split(' ');
    command = cmd.trim();

    switch (command.toUpperCase()) {
      case 'ADD':
        await add([args, ...othr]);
        break;
      case 'UP':
        upVote(args);
        break;
      case 'DW':
        await downVote(args);
        break;
      case 'SHOW':
        await showDetails(args);
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