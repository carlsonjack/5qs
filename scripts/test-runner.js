#!/usr/bin/env node

const { spawn } = require("child_process");
const path = require("path");

// Test configuration
const testConfig = {
  api: {
    command: "npm",
    args: ["run", "test:api"],
    timeout: 60000,
    description: "API Tests",
  },
  e2e: {
    command: "npm",
    args: ["run", "test:e2e"],
    timeout: 300000, // 5 minutes for E2E tests
    description: "E2E Tests",
  },
};

// Run a single test suite
function runTest(testName, config) {
  return new Promise((resolve, reject) => {
    console.log(`\n🚀 Running ${config.description}...`);

    const child = spawn(config.command, config.args, {
      stdio: "inherit",
      cwd: process.cwd(),
    });

    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(
        new Error(`${config.description} timed out after ${config.timeout}ms`)
      );
    }, config.timeout);

    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        console.log(`✅ ${config.description} passed`);
        resolve(true);
      } else {
        console.log(`❌ ${config.description} failed with code ${code}`);
        reject(new Error(`${config.description} failed`));
      }
    });

    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

// Main test runner
async function runAllTests() {
  const testSuites = process.argv.slice(2);
  const suitesToRun = testSuites.length > 0 ? testSuites : ["api", "e2e"];

  console.log("🎯 Test Runner Starting...");
  console.log(`Running test suites: ${suitesToRun.join(", ")}`);

  const results = {};
  let totalPassed = 0;
  let totalFailed = 0;

  for (const suite of suitesToRun) {
    if (!testConfig[suite]) {
      console.log(`⚠️  Unknown test suite: ${suite}`);
      continue;
    }

    try {
      await runTest(suite, testConfig[suite]);
      results[suite] = "PASSED";
      totalPassed++;
    } catch (error) {
      results[suite] = "FAILED";
      totalFailed++;
      console.error(`❌ ${error.message}`);
    }
  }

  // Summary
  console.log("\n📊 Test Summary:");
  console.log("==================");
  for (const [suite, result] of Object.entries(results)) {
    const icon = result === "PASSED" ? "✅" : "❌";
    console.log(`${icon} ${testConfig[suite].description}: ${result}`);
  }

  console.log(`\nTotal: ${totalPassed} passed, ${totalFailed} failed`);

  if (totalFailed > 0) {
    console.log("\n💡 Tips for fixing failed tests:");
    console.log("- Check if the dev server is running (npm run dev)");
    console.log("- Verify environment variables are set");
    console.log("- Check browser compatibility for E2E tests");
    console.log("- Review test logs above for specific errors");
    process.exit(1);
  } else {
    console.log("\n🎉 All tests passed!");
    process.exit(0);
  }
}

// Handle script arguments
if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(`
Test Runner Usage:
  node scripts/test-runner.js [test-suites...]

Available test suites:
  api     - Run API integration tests
  e2e     - Run end-to-end browser tests

Examples:
  node scripts/test-runner.js          # Run all tests
  node scripts/test-runner.js api      # Run only API tests
  node scripts/test-runner.js e2e      # Run only E2E tests
  node scripts/test-runner.js api e2e  # Run specific suites
`);
  process.exit(0);
}

// Run the tests
runAllTests().catch((error) => {
  console.error("💥 Test runner failed:", error);
  process.exit(1);
});

