
import { createClient, createCluster } from 'redis';

const REDIS_CONNECT_URL = process.env.REDIS_CONNECT_URL;

(async () => {
  console.log("Redis nodejs ts client")
  const client = createClient({
    url: REDIS_CONNECT_URL
  });
  client.on('error', err => console.log('Redis Client Error', err));
  await client.connect();
  await client.set('key6', 'value6');
})();