import { createInterface, Interface } from 'node:readline/promises';
import { stdin, stdout } from 'process';
import Redis from "ioredis";


const REDIS_CONNECT_URL = process.env.REDIS_CONNECT_URL
  || 'redis://host.docker.internal:6379';

let rClient: Redis;
let rl: Interface;

function getKey(num: number) {
  return `visits:daily:${num}`;
}

async function storeDailyVisit(day: number, userId: number) {
  return await rClient.setbit(getKey(day), userId, 1);
}

async function countDayVisit(day: number) {
  const count = await rClient.bitcount(getKey(day));
  console.log(`Total visits for day ${day} is/are ${count}`);
}

async function showUsersVisitForDay(day: number) {
  const buff = (await rClient.getBuffer(getKey(day)) as Buffer);
  const data = buff.toJSON().data;

  const users: number[] = [];

  for (let byteIndex = 0; byteIndex < data.length; byteIndex++) {
    for (let bitIndex = 7; bitIndex >= 0; bitIndex--) {
      const byte = data[byteIndex]
      const visited = byte >> bitIndex & 1;

      if (visited === 1) {
        const userId = byteIndex * 8 + (7 - bitIndex);
        users.push(userId);
      }
    }
  }

  console.log(`Users who visited ${day} day are`);
  console.log(users);
}

async function runner() {
let command = 'END';
  do {
    console.log(`
      Command:
      STR: STR 1 3, store user 3 visited for day 1.
      CNT: CNT 1, count total visites for day 1.
      TOT: TOT 1, show all users visited for day1.
      END: to end the process.
    `);
    
    const input = await rl.question('');
    
    const [cmd, arg1, arg2] = input.split(' ');
    command = cmd.trim();

    switch (command.toUpperCase()) {
      case 'STR':
        await storeDailyVisit(+arg1, +arg2);
        break;
      case 'CNT':
        await countDayVisit(+arg1);
        break;
      case 'TOT':
        await showUsersVisitForDay(+arg1);
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
  rClient.disconnect();
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