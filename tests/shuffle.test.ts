import test from 'node:test';
import assert from 'node:assert/strict';

import { shuffleBySeed } from '../src/ui/shuffle.ts';

const items = Array.from({ length: 30 }, (_, i) => ({ id: `p${i}` }));
const ids = (list: { id: string }[]) => list.map((x) => x.id);

test('shuffleBySeed: misma semilla da el mismo orden y conserva todos los elementos', () => {
  const a = shuffleBySeed(items, 20261124, (x) => x.id);
  const b = shuffleBySeed(items, 20261124, (x) => x.id);
  assert.deepEqual(ids(a), ids(b));
  assert.deepEqual(ids(a).sort(), ids(items).sort());
});

test('shuffleBySeed: otra semilla cambia el orden y no muta la lista original', () => {
  const before = ids(items);
  const a = shuffleBySeed(items, 20261124, (x) => x.id);
  const b = shuffleBySeed(items, 20261125, (x) => x.id);
  assert.notDeepEqual(ids(a), ids(b));
  assert.notDeepEqual(ids(a), before);
  assert.deepEqual(ids(items), before);
});
