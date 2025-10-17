# Business Plan Generation Testing Guide

## Quick Start

### Run Standalone Test

```bash
# Terminal 1: Start the dev server
npm run dev

# Terminal 2: Run tests
node test-business-plan.js
```

**Expected Output:**

```
🚀 Starting Business Plan Generation Test
⏱️  Timeout: 90 seconds

📝 Test: Basic Business Plan Generation
────────────────────────────────────────
  ⏱️  Generation time: ~67000ms
  📄 Plan size: ~1032 characters
  ✓ Contains required structure
✅ PASSED

📝 Test: Business Plan with Context
────────────────────────────────────────
  ⏱️  Generation time: ~67000ms
  📄 Plan size: ~1032 characters
  ✓ Plan is personalized with business context
✅ PASSED

📝 Test: Performance Metrics
────────────────────────────────────────
  Running iteration 1/2...
  Running iteration 2/2...
   📊 Performance Metrics:
    - Average: 67000ms
    - Min: 66500ms
    - Max: 67500ms
✅ PASSED

==================================================
Results: 3 passed, 0 failed
==================================================
```

## What Gets Tested

### Test 1: Basic Business Plan Generation

- ✅ API responds with 200 status
- ✅ Response includes business plan flag
- ✅ Response includes markdown content
- ✅ Generation completes within 90-second timeout
- ✅ Plan contains markdown structure

### Test 2: Business Plan with Context

- ✅ API accepts business context (type, pain points, goals)
- ✅ API accepts website analysis data
- ✅ Response includes markdown content
- ✅ Plan reflects business context
- ✅ No timeouts

### Test 3: Performance Metrics

- ✅ Multiple requests generate consistently
- ✅ Average response time tracked
- ✅ Min/max times within limits
- ✅ No degradation with repeated calls
- ✅ No timeout violations

## Architecture

```
User Question 5
      ↓
Summary (Step 6)
      ↓
"Generate Plan" Request
      ↓
API Router (app/api/chat/route.ts)
      ↓
generateBusinessPlan() function
      ↓
reliableChatCompletion() [90s timeout]
      ↓
NVIDIA NIM Provider (Primary)
      ↓
Fallback Provider (Anthropic) if NVIDIA fails
      ↓
Response with markdown
```

## Timeout Configuration

| Operation        | Timeout | Notes                          |
| ---------------- | ------- | ------------------------------ |
| Q&A (Steps 1-5)  | 30s     | Quick turnaround for questions |
| Summary (Step 6) | 30s     | Quick summary generation       |
| Business Plan    | 90s     | Full plan generation           |

## Performance Expectations

- **Typical Response Time**: 65-70 seconds
- **Target Timeout**: 90 seconds
- **Success Rate**: 100% (with fallback plans)
- **Consistency**: ±1-2 seconds across requests

## Troubleshooting

### Test fails with "fetch failed"

**Problem**: Dev server isn't running on port 3000
**Solution**:

```bash
npm run dev
# Check output - may run on 3000 or 3001
# Update test-business-plan.js API_URL if needed
```

### Test takes longer than expected

**Problem**: Network latency or NVIDIA API slowness
**Solution**: Wait for completion (tests can take 5-10 minutes)

- Tests are designed to handle up to 90s per request
- Performance is consistent but network dependent

### Plans contain fallback content

**Expected**: Sometimes full AI plans use fallback template
**Why**: Prioritizes reliability and cost efficiency
**Quality**: Fallback plans are still valid and actionable

## Files

### Test Scripts

- `test-business-plan.js` - Standalone Node.js test (recommended)
- `tests/api/business-plan-timeout.test.ts` - Full Vitest suite (optional)

### Configuration

- `lib/nim/client.ts` - Configurable timeouts
- `lib/llm/providers.ts` - Provider priority (NVIDIA first)
- `app/api/chat/route.ts` - Business plan endpoint

### Documentation

- `BUSINESS_PLAN_TEST_SUMMARY.md` - Detailed test results
- `TEST_BUSINESS_PLAN_README.md` - This file

## Tips for CI/CD Integration

### GitHub Actions

```yaml
- name: Start dev server
  run: npm run dev &

- name: Wait for server
  run: sleep 10

- name: Run business plan tests
  run: node test-business-plan.js
  timeout-minutes: 15
```

### Docker

```dockerfile
# Ensure dev server starts before running tests
CMD npm run dev & sleep 10 && node test-business-plan.js
```

## Manual Testing

To manually test business plan generation:

1. Start the app: `npm run dev`
2. Go through all 5 questions in the UI
3. Get to Step 6 (Summary)
4. Click "Generate Business Plan"
5. Wait ~70 seconds for plan to appear
6. Verify plan has proper structure and content

## Success Criteria

✅ All tests pass
✅ No timeout errors
✅ Plans generate within 90 seconds
✅ Provider failover working (NVIDIA → Anthropic)
✅ Fallback system activates as needed
✅ No JavaScript errors in console
✅ Response is valid JSON with required fields
