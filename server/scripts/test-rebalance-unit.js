import assert from 'node:assert';
import { buildTargetMap } from '../services/rebalanceService.js';

const users = [{ id: 'u1' }, { id: 'u2' }, { id: 'u3' }];
const caps = buildTargetMap(users, 10);
const values = [caps.get('u1'), caps.get('u2'), caps.get('u3')];

assert.strictEqual(values.reduce((a, b) => a + b, 0), 10, 'Cap sum must equal ticket count');
assert.ok(Math.max(...values) - Math.min(...values) <= 1, 'Distribution must be balanced');

console.log('rebalance unit checks passed');

