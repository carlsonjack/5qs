# Testing Suite

This directory contains comprehensive tests for the 5Q for SMBs application, ensuring the business plan generation flow works reliably.

## Test Structure

```
tests/
├── api/                    # API integration tests
│   ├── chat-flow.test.ts  # Chat API flow validation
│   └── plan-generation.test.ts  # Plan generation logic
├── e2e/                   # End-to-end browser tests
│   ├── business-plan-generation.spec.ts  # Full user journey
│   └── plan-validation.spec.ts          # Plan content validation
└── README.md              # This file
```

## Running Tests

### Quick Start

```bash
# Run all tests
npm run test:all

# Run only API tests
npm run test:api

# Run only E2E tests
npm run test:e2e

# Run E2E tests with UI (interactive mode)
npm run test:e2e:ui
```

### Individual Test Suites

**API Tests (Vitest)**

```bash
npm run test:api
npm run test:watch  # Watch mode for development
```

**E2E Tests (Playwright)**

```bash
npm run test:e2e          # Headless mode
npm run test:e2e:headed   # With browser UI
npm run test:e2e:ui       # Interactive test runner
```

### Custom Test Runner

```bash
# Run all tests with detailed output
node scripts/test-runner.js

# Run specific test suites
node scripts/test-runner.js api
node scripts/test-runner.js e2e
node scripts/test-runner.js api e2e
```

## Test Coverage

### API Tests (`tests/api/`)

**chat-flow.test.ts**

- ✅ Step-by-step chat progression (1-6)
- ✅ Context summary generation
- ✅ Website analysis integration
- ✅ Financial analysis integration
- ✅ Error handling and fallbacks
- ✅ Business plan trigger logic

**plan-generation.test.ts**

- ✅ Plan generation timing (only after 6 user messages)
- ✅ Plan content validation (required sections)
- ✅ Context integration (website/financial data)
- ✅ Fallback plan generation
- ✅ Step progression validation

### E2E Tests (`tests/e2e/`)

**business-plan-generation.spec.ts**

- ✅ Complete 5-question user journey
- ✅ Context gathering flow
- ✅ Step progression UI
- ✅ Chat reset functionality
- ✅ Markdown formatting
- ✅ Error state handling
- ✅ Chat persistence across reloads
- ✅ Mobile viewport compatibility
- ✅ Business profile updates

**plan-validation.spec.ts**

- ✅ Comprehensive plan generation with detailed answers
- ✅ Industry-specific recommendations (car auctions)
- ✅ Realistic ROI estimates
- ✅ Actionable 90-day plans
- ✅ Plan download/sharing functionality
- ✅ Quality with minimal inputs

## Test Scenarios

### Critical User Journeys

1. **Happy Path**: Complete 5-question flow → Summary → Plan generation
2. **Context Enhanced**: Upload website/financials → Enhanced questions → Tailored plan
3. **Minimal Input**: Basic answers → Still get comprehensive plan
4. **Error Recovery**: Network issues → Fallback responses → Graceful degradation

### Business Logic Validation

1. **Step Progression**: Ensures exactly 5 questions are asked
2. **Plan Timing**: Plan only generates after summary confirmation
3. **Content Quality**: Plans contain required sections and realistic data
4. **Context Integration**: Website/financial data enhances recommendations

## Development Workflow

### Before Committing

```bash
# Run quick API tests
npm run test:api

# Run full test suite (takes ~5 minutes)
npm run test:all
```

### Debugging Tests

**API Tests**

```bash
# Run specific test file
npx vitest tests/api/chat-flow.test.ts

# Debug mode
npx vitest --inspect tests/api/
```

**E2E Tests**

```bash
# Run with browser visible
npm run test:e2e:headed

# Debug specific test
npx playwright test tests/e2e/business-plan-generation.spec.ts --debug

# Generate test report
npx playwright show-report
```

### Adding New Tests

1. **API Tests**: Add to `tests/api/` for backend logic
2. **E2E Tests**: Add to `tests/e2e/` for user interactions
3. **Test Data**: Use realistic business scenarios
4. **Assertions**: Verify both functionality and content quality

## CI/CD Integration

The test suite is designed for CI/CD environments:

- **Fast Feedback**: API tests run in ~30 seconds
- **Comprehensive Coverage**: E2E tests validate full user experience
- **Parallel Execution**: Tests run efficiently across multiple browsers
- **Detailed Reporting**: HTML reports for failed tests

### Environment Requirements

**Local Development**

- Node.js 18+
- npm or pnpm
- Next.js dev server running on port 3001

**CI/CD**

- Playwright browsers installed
- Environment variables configured
- Database/external services mocked

## Troubleshooting

### Common Issues

**"Test server not responding"**

- Ensure `npm run dev` is running on port 3001
- Check if port is available
- Verify environment variables

**"Business plan generation timeout"**

- Check NVIDIA API key is configured
- Verify network connectivity
- Increase timeout for slow environments

**"E2E tests failing on CI"**

- Install Playwright browsers: `npx playwright install`
- Use headless mode in CI environments
- Check browser compatibility

### Performance Tips

- Run API tests during development (faster feedback)
- Use E2E tests for critical path validation
- Run full test suite before releases
- Use `--headed` mode only for debugging

## Contributing

When adding new features:

1. Write API tests for backend logic
2. Add E2E tests for user-facing features
3. Update this README if adding new test categories
4. Ensure tests pass in both local and CI environments

The test suite should evolve with the application to maintain confidence in business plan generation quality and user experience.

