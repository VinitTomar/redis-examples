import { createInterface, Interface } from 'node:readline/promises';
import { stdin, stdout } from 'process';
import Redis from "ioredis";


const REDIS_CONNECT_URL = process.env.REDIS_CONNECT_URL
  || 'redis://host.docker.internal:6379';

let rClient: Redis;
let rl: Interface;

const boardName = 'leaders';

async function addUser(username: string, score: number) {
  return rClient.zadd(boardName, score, username);
}

async function removeUser(username: string) {
  return rClient.zrem(boardName, username);
}

async function showUserScoreAndRank(username: string) {
  const score = await rClient.zscore(boardName, username);
  const rank = await rClient.zrevrank(boardName, username);

  console.log(`Username: ${username}, Score: ${score}, Rank: ${rank ?? 0 + 1}`);
}

function displayResult(result: string[], start = 0) {
  for (let i = 0, rank = start; i < result.length; i += 2, rank++) {
    console.log(`#${rank} User: ${result[i]} Score: ${result[i+1]}`)
  }
}

async function showTopUsers(quantity: number) {
  const users = await rClient.zrevrange(boardName, 0, quantity - 1, 'WITHSCORES');
  console.log(`----- Top ${quantity} Users -----`);
  displayResult(users);
}

async function showUsersAroundUser(username: string, quantity: number) {
  const userRank = await rClient.zrevrank(boardName, username);
  let start = Math.floor((userRank ?? 0) - (quantity / 2) + 1);
  start = start < 0 ? 0 : start;
  const end = start + quantity - 1;
  const users = await rClient.zrevrange(boardName, start, end, 'WITHSCORES');
  console.log(`---- Users around ${username} ----`);
  displayResult(users, start);
}


async function runner() {
let command = 'END';
  do {
    console.log(`
      Command:
      ADD: Add user to deal.
      REM: Remove user.
      RNK: Show user rank and score.
      TOP: Show top X users.
      UAR: Show X users around a user.
      END: to end the process.
    `);
    
    const input = await rl.question('');
    
    const [cmd, arg1, arg2] = input.split(' ');
    command = cmd.trim();

    switch (command.toUpperCase()) {
      case 'ADD':
        await addUser(arg1, +arg2);
        break;
      case 'REM':
        await removeUser(arg1);
        break;
      case 'RNK':
        await showUserScoreAndRank(arg1);
        break;
      case 'TOP':
        await showTopUsers(+arg1);
        break;
      case 'UAR':
        await showUsersAroundUser(arg1, +arg2);
        break;
    }
  } while (command.toUpperCase() !== 'END');
}

async function init() {
  rClient = new Redis(REDIS_CONNECT_URL)

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