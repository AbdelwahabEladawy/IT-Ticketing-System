const baseUrl = process.env.API_URL || 'http://localhost:5000/api';
const token = process.env.TEST_TOKEN;
const users = Number(process.env.LOAD_USERS || 20);
const rounds = Number(process.env.LOAD_ROUNDS || 10);

if (!token) {
  console.error('TEST_TOKEN is required');
  process.exit(1);
}

const heartbeat = async (tabId) => {
  await fetch(`${baseUrl}/presence/heartbeat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ tabId })
  });
};

const run = async () => {
  const jobs = [];
  for (let i = 0; i < users; i += 1) {
    jobs.push((async () => {
      for (let r = 0; r < rounds; r += 1) {
        await heartbeat(`load-${i}-${r}`);
      }
    })());
  }
  await Promise.all(jobs);
  console.log(`Completed ${users * rounds} heartbeat requests`);
};

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

