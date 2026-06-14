import { phraseValidationTests } from "./phraseValidation.test.ts";
import { keepaliveTests } from "./keepalive.test.ts";
import { qrPairingTests } from "./qrPairing.test.ts";
import { urlTextTests } from "./urlText.test.ts";

type TestCase = {
  name: string;
  run: () => void;
};

const tests: TestCase[] = [
  ...phraseValidationTests,
  ...keepaliveTests,
  ...qrPairingTests,
  ...urlTextTests,
];

let passed = 0;

for (const testCase of tests) {
  try {
    testCase.run();
    passed += 1;
    console.log(`PASS ${testCase.name}`);
  } catch (error) {
    console.error(`FAIL ${testCase.name}`);
    throw error;
  }
}

console.log(`\n${passed}/${tests.length} tests passed`);
