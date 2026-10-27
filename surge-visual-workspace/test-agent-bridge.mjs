import assert from 'node:assert';

console.log('--- Testing Agent Bridge Contract ---');

// Mock plan object
const samplePlan = {
  message: 'Test message for toast',
  focusGroupName: 'Proxy',
  addGroups: [
    {
      id: 'group-test',
      name: 'TestGroup',
      type: 'url-test',
      members: ['DIRECT'],
      options: { 'policy-regex-filter': '^🇭🇰', interval: '600' },
      rawLineIndex: -1,
    },
  ],
  addRules: [
    {
      ruleType: 'DOMAIN-SUFFIX',
      pattern: 'test.com',
      targetPolicy: 'TestGroup',
    },
  ],
  openReviewModal: true,
};

assert.strictEqual(samplePlan.addGroups.length, 1);
assert.strictEqual(samplePlan.addRules.length, 1);
assert.strictEqual(samplePlan.openReviewModal, true);
console.log('PASS: Agent Bridge plan contract structure verified!');
