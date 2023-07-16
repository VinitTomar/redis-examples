import { createInterface, Interface } from 'node:readline/promises';
import { stdin, stdout } from 'process';
import { RedisClientType, createClient } from "redis";


const REDIS_CONNECT_URL = process.env.REDIS_CONNECT_URL
  || 'redis://host.docker.internal:6379';

let rClient: RedisClientType;
let rl: Interface;

function getDealId(id: string) {
  return `deal:${id}`;
}

async function sendDealToUser(dealId: string, userId: string) {
  await rClient.sAdd(getDealId(dealId), userId);
}

async function showUserWhoReceivedAtleastOneDeal(dealIds: string[]) {
  const users = await rClient.sUnion(dealIds.map(id => getDealId(id)));
  console.log("users: ", users);
}

async function showUserWhoReceivedAllDeals(dealIds: string[]) {
  const users = await rClient.sInter(dealIds.map(id => getDealId(id)));
  console.log("users: ", users);
}

async function sendDealToUserIfNotSend(dealId: string, userId: string) {
  const isAlreadySent = await rClient.sIsMember(getDealId(dealId), userId);
  if (isAlreadySent) {
    console.log('Deal already sent.');
  } else {
    console.log('Sendind deal');
    await sendDealToUser(dealId, userId);
  }
}

async function showAllUserForADeal(dealId: string) {
  const users = await rClient.sMembers(getDealId(dealId));
  console.log("users: ", users);
}

async function runner() {
let command = 'END';
  do {
    console.log(`
      Command:
      ADD: Add user to deal.
      SND: Send deal to user if not added.
      UWO: User with atleast one deal.
      UWA: User with all deals.
      SHOW: Show all user of a deal.
      END: to end the process.
    `);
    const input = await rl.question('');
    const [cmd, arg1, arg2, ...args] = input.split(' ');
    command = cmd.trim();

    switch (command.toUpperCase()) {
      case 'ADD':
        await sendDealToUser(arg1, arg2);
        break;
      case 'SND':
        sendDealToUserIfNotSend(arg1, arg2);
        break;
      case 'UWO':
        await showUserWhoReceivedAtleastOneDeal([arg1, arg2, ...args]);
        break;
      case 'UWA':
        await showUserWhoReceivedAllDeals([arg1, arg2, ...args]);
      case 'SHOW': 
        await showAllUserForADeal(arg1);
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