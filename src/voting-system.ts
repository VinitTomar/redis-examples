import { createInterface, Interface } from 'node:readline/promises';
import { stdin, stdout } from 'process';
import { RedisClientType, createClient } from "redis";


const REDIS_CONNECT_URL = process.env.REDIS_CONNECT_URL
  || 'redis://host.docker.internal:6379';

let rClient: RedisClientType;
let rl: Interface;

async function upVote(articleKey: string) {
  return await rClient.incr(`article:${articleKey}:votes`);
}

async function downVote(articleKey: string) {
  return await rClient.decr(`article:${articleKey}:votes`);
}

function format(enteries: string[]) {
  return enteries.reduce((prev, curr, index) => {
    const isHeadline = index % 2;

    if (!isHeadline) {
      return prev + `Headline: ${curr}\n`;
    }

    return prev + `Votes: ${curr}\n\n`;
  }, '');
}

async function getVotes(articleKey: string) {
  const result: string[] = (await rClient.mGet([
    `article:${articleKey}:headline`,
    `article:${articleKey}:votes`
  ])).filter((r): r is string => r !== null);

  return format(result);
}

async function display() {
  const keys = (await rClient.keys('article:*:headline'));
  const articlesId = keys.map(key => key.split(':')[1]);

  const keysToFetch = articlesId
    .reduce<string[]>((prev, curr) => {
      prev.push(`article:${curr}:headline`);
      prev.push(`article:${curr}:votes`);
      return prev;
    }, []);

  const data = (await rClient.mGet(keysToFetch)).map(r => r ? r : '0');
  console.log(format(data));
}

(async () => {
  rClient = createClient({
    url: REDIS_CONNECT_URL
  });
  await rClient.connect();

  rl = createInterface({
    input: stdin,
    output: stdout
  });

  try {

    console.log('Command: [UP, DW, VT, D, Q]');
    console.log('UP => Up vote\nDW => Down vote\nVT => Get votes\nD => Display\nQ => Quit');

    let command = 'Q';

    do {
      const input = await rl.question('Enter command\n');
      const [cmd, args] = input.split(' ');
      command = cmd.trim();

      switch (command.toUpperCase()) {
        case 'UP':
          await upVote(args);
          break;
        case 'DW':
          await downVote(args);
          break;
        case 'VT':
          console.log(await getVotes(args));
          break;
        case 'D':
          await display();
          break;
      }
    } while (command.toUpperCase() !== 'Q')

  } catch (error) {
    console.error(error);
  } finally {
    await rClient.disconnect();
    rl.close();
  }
})();