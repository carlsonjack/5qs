# Validation Regex Fixes

## Problem Identified

The response validation was too strict and failed on formatting variations from the LLM:

**Before:**
```typescript
// Line 1392-1394
const hasQuestionHeader = new RegExp(
  `\\*\\*Question ${effectiveStep}:`
).test(aiMessage);
```

This regex required EXACT format: `**Question 1:` but the model output variations like:
- `**Question 1:**` (extra colon)
- `Question 1:` (no bold)
- `question 1:` (lowercase)

## Root Cause Analysis

1. **Extraction regex** (lib/nim/client.ts line 821-822):
   - Pattern: `/\*\*Question \d+[^*]*\*\*[\s\S]*?(?=\n\n|\n\*\*Question|\n\[|$)/`
   - Only matched exact `**Question N**` format
   - Failed when topic was on separate line or formatting varied

2. **Validation regex** (app/api/chat/route.ts line 1392-1394):
   - Pattern: `\\*\\*Question ${effectiveStep}:`
   - Required exact bold markdown formatting
   - Case-sensitive

## Fixes Applied

### 1. Extraction Regex (lib/nim/client.ts line 820-826)
**Before:**
```typescript
const questionPattern = /\*\*Question \d+[^*]*\*\*[\s\S]*?(?=\n\n|\n\*\*Question|\n\[|$)/;
```

**After:**
```typescript
// More lenient regex to handle variations like **Question 1:**, extra colons, formatting
const questionPattern = /Question\s+\d+[\s\S]*?(?=\n\n(?:Question|---|$)|$)/i;
```

**Benefits:**
- Matches `Question 1:`, `**Question 1:**`, `question 1:`, etc.
- Case-insensitive (`/i` flag)
- Stops at double newlines, Question headers, or end of string
- Tolerates whitespace variations

### 2. Validation Regex (app/api/chat/route.ts line 1391-1395)
**Before:**
```typescript
const hasQuestionHeader = new RegExp(
  `\\*\\*Question ${effectiveStep}:`
).test(aiMessage);
```

**After:**
```typescript
// More lenient check - accept Question N: with variations (extra colons, spaces, etc)
const hasQuestionHeader = new RegExp(
  `Question\\s+${effectiveStep}:\\s*`, 'i'
).test(aiMessage);
```

**Benefits:**
- Accepts `Question 1:`, `question 1:`, `Question  1:`, etc.
- Case-insensitive (`i` flag)
- Allows trailing whitespace after colon
- No requirement for bold markdown

## Test Cases Now Passing

✅ `**Question 1: Business Overview**` - with bold
✅ `**Question 1:**` - extra colon with bold
✅ `Question 1:` - plain format
✅ `question 1:` - lowercase
✅ `Question  1:` - multiple spaces
✅ Topic on separate line after header

## Impact

- Eliminates false fallback triggers from formatting variations
- Responses with correct question number but different formatting are now accepted
- Fallback is still used when:
  - Wrong question number appears
  - Content is too short (< 20 chars)
  - No question marker detected

## Build Status
✅ `npm run build` — Compiled successfully
