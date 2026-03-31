import { rebalanceTeam } from '../services/rebalanceService.js';

const specializationId = process.argv[2];
if (!specializationId) {
  console.error('Usage: npm run test:rebalance -- <specializationId>');
  process.exit(1);
}

const run = async () => {
  const result = await rebalanceTeam({
    specializationId,
    trigger: 'MANUAL_TEST'
  });
  console.log('Rebalance result:', result);
};

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

