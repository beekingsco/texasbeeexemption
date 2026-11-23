import assert from 'node:assert/strict';
import test from 'node:test';
import { eligibilityHeadline, savingsRangeLabel, splitPersonName } from '@/lib/results-unlock';

test('a full name splits into first and last', () => {
  assert.deepEqual(splitPersonName('  Chris   Miller  '), { firstName: 'Chris', lastName: 'Miller' });
  assert.deepEqual(splitPersonName('Chris'), { firstName: 'Chris', lastName: '' });
  assert.deepEqual(splitPersonName(''), { firstName: '', lastName: '' });
  assert.deepEqual(splitPersonName('Ada Lovelace King'), { firstName: 'Ada', lastName: 'Lovelace King' });
});

test('the savings teaser is a band, not the exact estimate', () => {
  assert.equal(savingsRangeLabel(3240), '$3,000–$3,500');
  assert.equal(savingsRangeLabel(800), '$750–$1,000');
  assert.equal(savingsRangeLabel(12000), '$12,000–$13,000');
  assert.equal(savingsRangeLabel(0), null);
  assert.equal(savingsRangeLabel(null), null);
});

test('eligibility headline names the county and stays short of the dollar amount', () => {
  const eligible = eligibilityHeadline({
    county: 'Henderson',
    stateName: 'Texas',
    qualifies: true,
    acresKnown: true,
  });
  assert.match(eligible, /Henderson County/);
  assert.match(eligible, /eligible/i);
  assert.doesNotMatch(eligible, /\$/);

  const short = eligibilityHeadline({
    county: 'Marion',
    stateName: 'Florida',
    qualifies: false,
    acresKnown: true,
  });
  assert.match(short, /short of the acreage/);

  const unknown = eligibilityHeadline({
    county: 'Leon',
    stateName: 'Florida',
    qualifies: null,
    acresKnown: false,
  });
  assert.match(unknown, /Leon County, Florida/);
});
