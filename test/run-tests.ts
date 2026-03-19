import { phraseValidationTests } from "./phraseValidation.test.ts";
import { urlTextTests } from "./urlText.test.ts";

type TestCase = {
  name: string;
  run: () => void;
};

const tests: TestCase[] = [...phraseValidationTests, ...urlTextTests];

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
