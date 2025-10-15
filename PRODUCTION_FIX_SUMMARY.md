# Production Fix: NVIDIA NIM Guided JSON Response Handling

## Issue Description

In production, the application was experiencing JSON parsing errors when using NVIDIA NIM's guided JSON feature for context summary generation. The error manifested as:

```
JSON parse error: SyntaxError: Unexpected end of JSON input
```

### Root Causes

1. **Response Field Mismatch**: NVIDIA NIM API was returning JSON responses in the `reasoning_content` field instead of the standard `content` field when using guided JSON mode
2. **Content Extraction Logic**: The NIM client was explicitly skipping `reasoning_content` to prevent internal thinking from appearing in responses
3. **Truncated Responses**: JSON responses were being truncated due to insufficient `max_tokens` (200 tokens), causing incomplete JSON structures
4. **Worked Locally, Failed in Production**: Different model behavior or API endpoints between development and production environments

## Changes Made

### 1. Enhanced NIM Client (`lib/nim/client.ts`)

#### Added Guided JSON Detection

```typescript
const isGuidedJson = !!params.nvext?.guided_json;
```

#### Updated Content Extraction Logic

- Now checks `reasoning_content` field when in guided JSON mode
- Maintains original behavior (skipping reasoning_content) for non-guided requests
- Added detailed logging for debugging

```typescript
if (message) {
  pushCandidate(message.content);
  // For guided JSON mode, check reasoning_content as NIM may put the response there
  if (isGuidedJson) {
    pushCandidate((message as any).reasoning_content);
  }
}
```

#### Enhanced Logging

- Added `messageReasoningContent` and `isGuidedJson` to debug logs
- Logs success message when extracting from reasoning_content: "✓ Extracted guided JSON response from reasoning_content field"

### 2. Improved Context Summary Generation (`app/api/chat/route.ts`)

#### Increased Token Limit

Changed from 200 to 500 tokens to prevent JSON truncation:

```typescript
max_tokens: 500, // Increased to prevent JSON truncation
```

#### Enhanced JSON Repair Strategies

Implemented three-tier repair mechanism:

1. **Strategy 1**: Extract JSON object from surrounding text
   - Uses regex to find JSON object boundaries
2. **Strategy 2**: Fix incomplete JSON structures

   - Removes trailing incomplete key/value pairs
   - Adds missing closing braces
   - Balances JSON structure

3. **Strategy 3**: Rebuild from partial data
   - Extracts field patterns using regex
   - Constructs valid JSON from matched fields
   - Fallback for severely malformed responses

Each strategy logs its success:

- "✓ Repaired JSON by extracting object"
- "✓ Repaired JSON by fixing incomplete structure"
- "✓ Rebuilt JSON from field matches"

## Testing Recommendations

### Local Testing

```bash
# Run the development server
npm run dev

# Test context summary generation by:
1. Starting a new conversation
2. Providing business information through all 5 questions
3. Verifying context summary is generated without errors
```

### Production Monitoring

Monitor logs for these success indicators:

- `✓ Extracted guided JSON response from reasoning_content field`
- `✓ Repaired JSON by [strategy]` (if repair was needed)
- No more `JSON parse error: SyntaxError: Unexpected end of JSON input`

### Edge Cases to Test

1. Very long business descriptions (test token limit)
2. Special characters in responses
3. Multiple concurrent requests
4. Various model configurations

## Expected Behavior After Fix

1. **Guided JSON responses will be properly extracted** from either `content` or `reasoning_content` fields
2. **Truncated JSON will be repaired** using intelligent repair strategies
3. **Clear logging** will indicate which extraction/repair strategy succeeded
4. **Fallback context summaries** will still work if all strategies fail (graceful degradation)

## Deployment Notes

- No environment variable changes required
- No database migrations needed
- Changes are backward compatible
- Existing error handling and fallback mechanisms remain intact

## Related Files Modified

- `/lib/nim/client.ts` - Core NIM client response extraction
- `/app/api/chat/route.ts` - Context summary generation and JSON repair

## Monitoring Points

After deployment, monitor:

1. Context summary generation success rate
2. JSON repair strategy usage frequency
3. Overall chat API error rate
4. Token usage (should be slightly higher due to 500 max_tokens)

## Rollback Plan

If issues persist:

1. Revert changes to `lib/nim/client.ts` and `app/api/chat/route.ts`
2. Increase `max_tokens` to 1000 temporarily
3. Consider disabling guided JSON and using standard JSON extraction
