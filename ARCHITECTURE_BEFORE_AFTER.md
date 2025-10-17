# Architecture: Before vs After

## Before (Complex, Duplicates)

```
Per Step Flow:
  ├─ Loop attempt 0-2:
  │  ├─ Make LLM call (potentially with guardrail note)
  │  ├─ Extract content
  │  ├─ Check for violations (200+ line logic)
  │  └─ If violation, append guardrailNote and retry
  ├─ After loop:
  │  └─ If still invalid, use fallback
  └─ Save to DB

Issues:
  - 3 LLM calls per step (wasteful)
  - Duplicate questions from retry rewrites
  - 100+ lines of retry/violation detection
  - Broad regex filters (aggressive, missed edge cases)
  - Mixed provider paths (reliableChatCompletion vs chatCompletion)
```

## After (Simple, One Shot)

```
Per Step Flow:
  ├─ Single reliableChatCompletion call
  ├─ Local sanitizeQuestion (remove reasoning, dedupe headers)
  ├─ Validate format (header + min content)
  ├─ If invalid → use deterministic fallback
  └─ Save to DB

Benefits:
  - 1 LLM call per step (efficient)
  - No duplicate questions (single response extracted)
  - 50 lines of clean, focused logic
  - Targeted sanitization (handles all test cases)
  - Single provider path (predictable)
```

## Key Architectural Improvements

### Complexity Reduction
- **Before**: 100+ lines in retry loop
- **After**: 50 lines of clear validation + fallback

### Response Handling
- **Before**: Multi-attempt rewrite with guardrails
- **After**: Extract → Sanitize → Validate → Fallback

### Error Resilience
- **Before**: "No response from NVIDIA API" errors possible
- **After**: Guaranteed valid response (fallback always works)

### Testability
- **Before**: Hard to test due to complex retry logic
- **After**: Easy to unit test sanitizeQuestion function (8/8 pass)

### Maintainability
- **Before**: Multiple code paths, hard to trace
- **After**: Linear flow, clear separation of concerns

## Proof of Correctness

All 8 sanitization tests pass:
```
✓ Remove <think> tags
✓ Remove Note for Assistant lines
✓ Remove duplicate headers (keep first)
✓ Normalize header to current step
✓ Remove Follow-Up markers
✓ Produce valid format for steps 1-5
✓ No empty output for valid questions
✓ Handle mixed reasoning and formats
```
