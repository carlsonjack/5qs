# AI Provider Setup Guide

## Current Status

- **Fixed NVIDIA JSON parsing issues** - The system now handles responses that are missing curly braces
- **Enhanced context integration** - Website and financial analysis data is now properly passed to the AI
- **Added OpenAI support** - Alternative implementation available

## Issues Fixed

### 1. JSON Parsing Problem

**Problem**: NVIDIA API was returning valid JSON content but missing the `{}` wrapper, causing parsing failures.

**Solution**: Added intelligent JSON parsing that:

- First tries to find JSON with curly braces
- If not found, checks if the response looks like JSON object content
- Automatically wraps the response in `{}` if needed
- Falls back gracefully if parsing still fails

### 2. Business Context Not Being Used

**Problem**: Website analysis and financial analysis data wasn't being incorporated into the AI conversation.

**Solution**:

- Enhanced `generateContextSummary` to accept analysis data
- Updated system prompts to explicitly use analysis data for personalization
- Added debugging logs to track context flow

## Switching to OpenAI

### Option 1: Use the New OpenAI Route

1. Set your OpenAI API key in environment variables:

   ```bash
   OPENAI_API_KEY=your_openai_api_key_here
   OPENAI_MODEL=gpt-4o
   ```

2. Update the frontend to call `/api/chat-openai` instead of `/api/chat`

### Option 2: Modify Existing Route

Replace the NVIDIA calls in `/api/chat/route.ts` with OpenAI calls using the `callOpenAIAPIWithRetry` function from `/lib/openai-client.ts`.

## Environment Variables

### NVIDIA (Current)

```bash
NVIDIA_API_KEY=your_nvidia_api_key_here
NVIDIA_API_URL=https://integrate.api.nvidia.com/v1/chat/completions
NVIDIA_MODEL=microsoft/phi-3-medium-128k-instruct
```

### OpenAI (Alternative)

```bash
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_API_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o
OPENAI_MAX_RPM=500
OPENAI_MAX_TPM=30000
OPENAI_MAX_TPD=1000000
OPENAI_COOLDOWN_SECONDS=15
```

## Testing the Fix

1. **Test with NVIDIA**: The existing `/api/chat` route should now work better with improved JSON parsing
2. **Test with OpenAI**: Use `/api/chat-openai` route with your OpenAI API key
3. **Check logs**: Look for "Successfully parsed wrapped JSON response" messages

## Files Modified

- `app/api/chat/route.ts` - Enhanced context integration and JSON parsing
- `app/api/analyze/website/route.ts` - Improved JSON parsing
- `app/api/analyze/financials/route.ts` - Improved JSON parsing
- `lib/openai-client.ts` - New OpenAI client (created)
- `app/api/chat-openai/route.ts` - New OpenAI implementation (created)

## Next Steps

1. Test the current NVIDIA implementation to see if the JSON parsing fixes work
2. If issues persist, switch to OpenAI using the provided implementation
3. Monitor the logs to ensure context data is being properly passed and used
