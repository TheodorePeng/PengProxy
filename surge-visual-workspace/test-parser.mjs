import fs from 'node:fs';
import path from 'node:path';
import { parseSurgeProfile } from './src/lib/parser/lossless-parser.ts';
import { serializeSurgeProfile } from './src/lib/parser/lossless-serializer.ts';
import { computeProfileDiff } from './src/lib/parser/diff-engine.ts';

const confPath = '/Users/peng/Documents/GitHub-Peng/Proxy-Peng/ProxyConfig-Peng/Surge-Peng.conf';
const originalConf = fs.readFileSync(confPath, 'utf8');

console.log('--- 1. Testing Parse ---');
const parsed = parseSurgeProfile(originalConf);
console.log(`Parsed total raw lines: ${parsed.rawLines.length}`);
console.log(`Parsed Policy Groups: ${parsed.policyGroups.length}`);
console.log(`Parsed Routing Rules: ${parsed.rules.length}`);

if (parsed.policyGroups.length === 0 || parsed.rules.length === 0) {
  console.error('FAIL: Expected policy groups and rules to be parsed!');
  process.exit(1);
}

console.log('--- 2. Testing Lossless Roundtrip (Zero-Change) ---');
const reserialized = serializeSurgeProfile(parsed, parsed.policyGroups, parsed.rules);
const diffZero = computeProfileDiff(originalConf, reserialized);

if (diffZero.hasChanges) {
  console.error(`FAIL: Roundtrip produced unexpected diff! Added: ${diffZero.summary.addedLines}, Removed: ${diffZero.summary.removedLines}`);
  const firstDiffs = diffZero.diffLines.filter(l => l.type !== 'unchanged').slice(0, 10);
  console.log('Sample differences:', firstDiffs);
  process.exit(1);
} else {
  console.log('PASS: Exact 100% byte-for-byte lossless roundtrip verified!');
}

console.log('--- 3. Testing Single-Rule Mutation ---');
const modifiedRules = [...parsed.rules];
const firstRule = { ...modifiedRules[0], targetPolicy: 'TEST_CUSTOM_POLICY' };
modifiedRules[0] = firstRule;

const modifiedText = serializeSurgeProfile(parsed, parsed.policyGroups, modifiedRules);
const diffOne = computeProfileDiff(originalConf, modifiedText);

if (diffOne.summary.addedLines === 1 && diffOne.summary.removedLines === 1) {
  console.log('PASS: Mutating 1 rule produced exactly 1 line added and 1 line removed!');
} else {
  console.error(`FAIL: Expected 1 add and 1 remove, got: +${diffOne.summary.addedLines} -${diffOne.summary.removedLines}`);
  process.exit(1);
}

console.log('ALL PARSER & SERIALIZER TESTS PASSED!');
