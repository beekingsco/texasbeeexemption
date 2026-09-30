import assert from 'node:assert/strict';
import test from 'node:test';
import {
  contactLeadBlockReason,
  isBareUsState,
  isCountyOnlyAddress,
  isRealStreetAddress,
  shouldDeliverNewLeadAlert,
} from '@/lib/lead-qualification';

const REAL = {
  firstName: 'Chris',
  lastName: 'Miller',
  email: 'chris@example.com',
  address: '123 Main St, Canton, TX 75103',
};

test('entire state names and abbreviations are bare states', () => {
  for (const value of [
    'Indiana',
    'MAINE',
    'pennsylvania',
    '  Texas  ',
    'IN',
    'pa',
    'N.Y.',
    'n.c.',
    'D.C.',
    'DC',
    'District of Columbia',
    'West Virginia',
    'state of Texas',
    'Washington State',
    'Calif',
    'Fla.',
    'Penn',
  ]) {
    assert.equal(isBareUsState(value), true, value);
  }
});

test('a state word inside a longer field is not a bare state', () => {
  for (const value of [
    '123 Pennsylvania Ave',
    'Indiana Jones',
    'Virginia Smith',
    'Al Smith',
    'Washington Street',
    '123 Main St, Canton, TX',
  ]) {
    assert.equal(isBareUsState(value), false, value);
  }
});

test('county-only lines are rejected and streets that mention a county are kept', () => {
  for (const value of [
    'Marion County',
    'Marion County, IN',
    'Orleans Parish',
    'Orleans Parish, Louisiana',
    'Harris Co.',
    'Harris Co, TX',
    'Juneau Borough',
    'County',
  ]) {
    assert.equal(isCountyOnlyAddress(value), true, value);
    assert.equal(isRealStreetAddress(value), false, value);
  }

  for (const value of [
    '123 Main St, Harris County, TX',
    'County Road 12, Marion, IN',
    '123 County Road, Canton, TX',
    'FM 148, Mineola, TX',
    'PO Box 55, Athens, TX 75751',
  ]) {
    assert.equal(isCountyOnlyAddress(value), false, value);
    assert.equal(isRealStreetAddress(value), true, value);
  }
});

test('city lines and zip lines are not street addresses', () => {
  for (const value of ['Canton, TX', 'Bokeelia, FL', '33027 Hollywood, FL', 'Hollywood, FL 33027', 'Indiana 46204']) {
    assert.equal(isRealStreetAddress(value), false, value);
  }
  assert.equal(isRealStreetAddress('33027 Hollywood Blvd, Hollywood, FL'), true);
  assert.equal(isRealStreetAddress('100 Broadway, New York, NY 10005'), true);
});

test('a lead requires a person, a street, and an email', () => {
  assert.equal(contactLeadBlockReason(REAL), null);

  assert.match(
    contactLeadBlockReason({ ...REAL, firstName: 'Indiana', lastName: '' }) ?? '',
    /state name/i,
  );
  assert.match(
    contactLeadBlockReason({ ...REAL, name: 'Pennsylvania' }) ?? '',
    /state name/i,
  );
  assert.match(
    contactLeadBlockReason({ ...REAL, firstName: 'Indiana', lastName: 'Maine' }) ?? '',
    /state name/i,
  );
  assert.equal(
    contactLeadBlockReason({ ...REAL, firstName: 'Virginia', lastName: 'Smith' }),
    null,
  );
  assert.equal(
    contactLeadBlockReason({ ...REAL, firstName: 'Al', lastName: 'Smith' }),
    null,
  );
  assert.match(
    contactLeadBlockReason({ ...REAL, name: 'AL' }) ?? '',
    /state name/i,
  );

  assert.match(
    contactLeadBlockReason({ ...REAL, address: 'Indiana' }) ?? '',
    /street address/i,
  );
  assert.match(
    contactLeadBlockReason({ ...REAL, address: 'PA' }) ?? '',
    /street address/i,
  );
  assert.match(
    contactLeadBlockReason({ ...REAL, address: 'Marion County, Indiana' }) ?? '',
    /street address/i,
  );
  assert.match(
    contactLeadBlockReason({ ...REAL, address: '' }) ?? '',
    /street address/i,
  );
  assert.match(
    contactLeadBlockReason({ ...REAL, email: '' }) ?? '',
    /email/i,
  );
  assert.match(
    contactLeadBlockReason({ ...REAL, email: 'not-an-email' }) ?? '',
    /email/i,
  );
});

test('the mailer drops state-picker junk and still sends a real lead', () => {
  assert.equal(
    shouldDeliverNewLeadAlert({ name: 'Indiana', address: 'Indiana' }),
    false,
  );
  assert.equal(
    shouldDeliverNewLeadAlert({ name: 'Maine', address: 'Maine' }),
    false,
  );
  assert.equal(
    shouldDeliverNewLeadAlert({
      name: 'Chris Miller',
      email: 'chris@example.com',
      address: 'Pennsylvania',
    }),
    false,
  );
  assert.equal(
    shouldDeliverNewLeadAlert({
      name: 'Chris Miller',
      email: 'chris@example.com',
      address: '123 Main St, Canton, TX 75103',
    }),
    true,
  );
  assert.equal(
    shouldDeliverNewLeadAlert({
      name: 'Ada Agent',
      email: 'ada@brokerage.com',
      tier: 'agent_signup',
    }),
    true,
  );
});
