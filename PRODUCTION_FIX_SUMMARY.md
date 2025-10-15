# Production Fix: NVIDIA NIM Guided JSON Response Handling

## Issue Description

In production, the application was experiencing JSON parsing errors when using NVIDIA NIM API. The errors manifested in two places:

### Primary Issue: Context Summary Generation

```
JSON parse error: SyntaxError: Unexpected end of JSON input
```

### Secondary Issue: Website Analysis Quality Regression

- Website analysis falling back to generic results
- Missing specific business context (e.g., "Online auction platform for vintage and classic cars" → "Product-based business")
- Same underlying JSON extraction problem

### Root Causes

1. **Response Field Mismatch**: NVIDIA NIM API returns JSON responses in the `reasoning_content` field instead of the standard `content` field when using guided JSON mode
2. **Content Extraction Logic**: The NIM client was explicitly skipping `reasoning_content` to prevent internal thinking from appearing in responses
3. **Truncated Responses**: JSON responses were being truncated due to insufficient `max_tokens`, causing incomplete JSON structures
4. **Missing Guided JSON in Website Analysis**: Website analysis wasn't using guided JSON mode at all, causing it to also miss `reasoning_content` responses
5. **Worked Locally, Failed in Production**: Different model behavior or API endpoints between development and production environments

## Changes Made

### 1. Added Website Analysis Schema (`lib/schemas.ts`)

Created a new guided JSON schema specifically for website analysis:

```typescript
export const WebsiteAnalysisSchemaForNIM = {
  type: "object",
  properties: {
    productsServices: { type: "string" },
    customerSegment: { type: "string" },
    techStack: { type: "string" },
    marketingStrengths: { type: "string" },
    marketingWeaknesses: { type: "string" },
  },
  required: [...],
  additionalProperties: false,
} as const;
```

### 2. Enhanced NIM Client (`lib/nim/client.ts`)

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

### 3. Fixed Website Analysis (`app/api/analyze/website/route.ts`)

#### Enabled Guided JSON Mode

Added guided JSON to website analysis endpoint:

```typescript
import { WebsiteAnalysisSchemaForNIM } from "@/lib/schemas";

const res = await chatCompletion({
  // ... other params
  max_tokens: 600, // Increased from 400
  nvext: { guided_json: WebsiteAnalysisSchemaForNIM as any },
});
```

#### Added JSON Repair Strategies

Implemented the same three-tier repair mechanism for website analysis responses to handle incomplete or malformed JSON. This ensures specific business context (like "Online auction platform for vintage and classic cars") is properly extracted instead of falling back to generic descriptions.

### 4. Improved Context Summary Generation (`app/api/chat/route.ts`)

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
pnpm dev  # or npm run dev

# Test website analysis:
1. Enter a website URL (e.g., https://bringatrailer.com/)
2. Verify specific business details are extracted (not generic fallbacks)
3. Check logs for "✓ Extracted guided JSON response from reasoning_content field"

# Test context summary generation:
1. Start a new conversation
2. Provide business information through all 5 questions
3. Verify context summary is generated without errors
4. Confirm specific details are preserved throughout the conversation
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
2. **Website analysis will extract specific business details** instead of falling back to generic descriptions
   - Example: "Online auction platform for vintage and classic cars" instead of "Product-based business"
3. **Truncated JSON will be repaired** using intelligent repair strategies
4. **Clear logging** will indicate which extraction/repair strategy succeeded
5. **Fallback context summaries** will still work if all strategies fail (graceful degradation)
6. **Context summary generation success rate** should approach 100% in production

## Deployment Notes

- No environment variable changes required
- No database migrations needed
- Changes are backward compatible
- Existing error handling and fallback mechanisms remain intact

## Related Files Modified

- `/lib/nim/client.ts` - Core NIM client response extraction
- `/lib/schemas.ts` - Added WebsiteAnalysisSchemaForNIM
- `/app/api/analyze/website/route.ts` - Website analysis with guided JSON
- `/app/api/chat/route.ts` - Context summary generation and JSON repair

## Monitoring Points

After deployment, monitor:

1. Website analysis quality (check for specific vs. generic business descriptions)
2. Website analysis fallback rate (should decrease significantly)
3. Context summary generation success rate (should be near 100%)
4. JSON repair strategy usage frequency
5. Overall chat and website analysis API error rates
6. Token usage (slightly higher due to increased max_tokens: 500 for context, 600 for website)
7. Look for log messages:
   - `✓ Extracted guided JSON response from reasoning_content field`
   - `✓ Repaired JSON by [strategy]`
   - Absence of `NVIDIA API failed, using enhanced fallback analysis`

## Rollback Plan

If issues persist:

1. Revert changes to `lib/nim/client.ts` and `app/api/chat/route.ts`
2. Increase `max_tokens` to 1000 temporarily
3. Consider disabling guided JSON and using standard JSON extraction
