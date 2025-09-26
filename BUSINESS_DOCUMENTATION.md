# 5Q for SMBs - Business & Technology Documentation

## Table of Contents

1. [Business Overview](#business-overview)
2. [Product Description](#product-description)
3. [User Journey & Flow](#user-journey--flow)
4. [Technology Architecture](#technology-architecture)
5. [API Endpoints](#api-endpoints)
6. [AI Integration](#ai-integration)
7. [Data Processing](#data-processing)
8. [Email & Lead Generation](#email--lead-generation)
9. [Frontend Components](#frontend-components)
10. [Deployment & Infrastructure](#deployment--infrastructure)
11. [Business Model](#business-model)

---

## Business Overview

**5Q for SMBs** is an AI-powered business consultation platform that transforms small and medium businesses through a streamlined 5-question discovery process. We deliver what traditionally costs $10,000+ from consultants - a comprehensive AI implementation plan - in minutes, not weeks.

### Mission Statement

"We turn 5 questions into a full-blown AI plan. You're welcome."

### Value Proposition

- **Speed**: Minutes vs. weeks for business analysis
- **Cost**: Free vs. $10,000+ consultant fees
- **Accessibility**: No technical knowledge required
- **Personalization**: Custom AI roadmaps based on real business data
- **Actionability**: 90-day implementation plans with concrete steps

### Target Market

- Small to Medium Businesses (SMBs)
- Business owners looking to implement AI
- Companies seeking operational efficiency
- Entrepreneurs wanting competitive advantages through technology

---

## Product Description

### Core Offering

5Q for SMBs is a conversational AI platform that conducts intelligent business discovery through exactly 5 strategic questions, then generates a comprehensive AI implementation plan tailored to each business.

### Key Features

#### 1. **Intelligent Context Gathering**

- Optional file upload for financial statements (PDF, CSV, TXT)
- Website analysis for business insights
- Real-time data processing and analysis

#### 2. **5-Question Discovery Process**

- **Question 1**: Business overview and industry
- **Question 2**: Primary pain points and challenges
- **Question 3**: Customer segments and market approach
- **Question 4**: Current operations and data practices
- **Question 5**: Goals and growth vision

#### 3. **AI-Generated Business Plans**

Comprehensive 4-part implementation plans including:

- **Opportunity Summary**: Business situation and improvement opportunities
- **AI Roadmap**: Phased implementation strategy (immediate, mid-term, long-term)
- **ROI & Cost Analysis**: Investment estimates and expected returns
- **90-Day Action Items**: Concrete, actionable next steps

#### 4. **Multi-Modal Delivery**

- Interactive web interface
- Email delivery with HTML formatting
- PDF download capability
- Markdown export for technical users

---

## User Journey & Flow

### Phase 1: Onboarding

1. **Landing Page**: User sees value proposition and begins discovery
2. **Context Gathering** (Optional):
   - Upload financial documents
   - Provide website URL for analysis
   - Skip option available

### Phase 2: Discovery Conversation

1. **Step 1-5**: AI asks personalized questions based on:
   - Previous answers
   - Uploaded financial data insights
   - Website analysis results
   - Industry-specific context

### Phase 3: Plan Generation

1. **Processing**: AI synthesizes all data points
2. **Plan Creation**: Generates customized 4-part business plan
3. **Preview**: User sees limited preview of plan

### Phase 4: Lead Conversion

1. **Email Gate**: User provides email to unlock full plan
2. **Delivery**: Full plan sent via email + downloadable formats
3. **Follow-up**: Lead notification sent to business team

---

## Technology Architecture

### Frontend Stack

- **Framework**: Next.js 15.2.4 (React 19)
- **Styling**: Tailwind CSS with custom design system
- **UI Components**: Radix UI primitives with custom styling
- **State Management**: React hooks and context
- **Theme**: Dark/light mode support via next-themes

### Backend Stack

- **Runtime**: Node.js with Next.js API routes
- **AI Services**:
  - Primary: NVIDIA NIM with model routing (Nemotron/Llama family)
  - Fallback: OpenAI (legacy compatibility)
- **RAG**: Lightweight in-memory retrieval (embeddings + rerank), per-domain cache
- **File Processing**: Custom PDF, CSV, TXT parsers with OCR stub for PDFs/images
- **Web Scraping**: Microlink API with direct fetch fallback
- **Email**: Resend API for transactional emails

### Database & Storage

- **Session Storage**: Client-side state management
- **File Uploads**: Temporary processing (no permanent storage)
- **Lead Data**: Email forwarding system

### Deployment

- **Platform**: Vercel (optimized for Next.js)
- **Domain**: Custom domain support
- **Analytics**: Vercel Analytics integration
- **Environment**: Production, staging, and development environments

---

## API Endpoints

### 1. `/api/chat` - Main Conversation Engine

**Purpose**: Handles the 5-question discovery process and business plan generation with NVIDIA NIM model routing

**Features**:

- Context-aware conversation flow
- Step tracking (1-5)
- Integration with analysis data
- Business plan generation trigger
- Fallback question system

**Flow**:

```
POST /api/chat
{
  "messages": [...],
  "currentStep": 1-5,
  "initialContext": {...},
  "websiteAnalysis": {...},
  "financialAnalysis": {...}
}

Response:
{
  "message": "AI response",
  "contextSummary": {...},
  "businessPlanMarkdown": "...", // Only on step 5
  "researchBrief": "...",       // When research mode triggers
  "citations": [{"sourceId":"..."}],
  "isBusinessPlan": true|false,
  "fallback": boolean
}
```

### 2. `/api/analyze/website` - Website Intelligence

**Purpose**: Extracts business insights from website URLs

**Process**:

1. URL validation and normalization
2. Content extraction via Microlink API
3. Fallback to direct HTTP scraping
4. AI analysis via OpenAI/NVIDIA
5. Structured data extraction

**Output**:

```json
{
  "productsServices": "Business description",
  "customerSegment": "Target audience",
  "techStack": "Technology assessment",
  "marketingStrengths": "Competitive advantages",
  "marketingWeaknesses": "Areas for improvement"
}
```

### 3. `/api/analyze/financials` - Financial Document Analysis

**Purpose**: Processes uploaded financial documents for business insights

**Supported Formats**:

- PDF (custom text extraction)
- CSV (direct parsing)
- TXT (plain text)

**Analysis Output**:

```json
{
  "businessType": "Business classification",
  "revenueTrend": "Revenue analysis",
  "largestCostCenters": "Major expenses",
  "profitMargins": "Profitability assessment",
  "seasonality": "Seasonal patterns",
  "cashFlowRisks": "Financial risk factors"
}
```

### 4. `/api/send-plan` - Email Delivery System

**Purpose**: Delivers business plans and captures leads

**Process**:

1. Email validation
2. HTML email generation with business plan
3. Lead notification to business team
4. Delivery confirmation

---

## AI Integration

### Primary AI Provider: NVIDIA NIM

- **Models** (configurable via env):
  - Intake: `LLM_DEFAULT_MODEL` (e.g., nvidia/llama-3.1-nemotron-70b-instruct)
  - Plan: `LLM_PLAN_MODEL` (e.g., nvidia/llama-3.1-nemotron-ultra-253b-v1)
  - Cost mode: `LLM_COST_MODE_MODEL` (smaller instruct model)
- **Use Cases**:
  - Conversation management (steps 1–5) with discovery prompt
  - Plan generation with elevated model
  - Context summarization via guided JSON (deterministic)
  - Website/financials analysis via guided JSON
- **Extensions**: `nvext.guided_json` for schema-enforced JSON

### Fallback AI Provider: OpenAI

- **Purpose**: Redundancy when NIM is unavailable (legacy paths)
- **Integration**: Automatic fallback in website/financial analysis

### AI Prompt Engineering

#### Conversation Prompts

- Context-aware question generation
- Industry-specific personalization
- Progressive information gathering
- Fallback question system

Additional:

- Centralized prompts in `lib/prompts.ts`
- Research planner prompt used only in deep research mode

#### Business Plan Generation

- 4-part structure enforcement
- Industry-specific recommendations
- ROI calculation guidance
- Actionable timeline creation

Routing:

- Model router selects plan model; can downgrade when short outputs suffice

#### Analysis Prompts

- Structured JSON output enforcement
- Financial data interpretation
- Website content analysis
- Risk assessment protocols

Implementation:

- Guided JSON via NIM for deterministic schema adherence (no regex scraping)

#### Research Mode (Conditional)

- Triggered when document volume/complexity is high or conflicts detected
- Planner → retrieve → critique loop (max 2–3 iterations)
- Produces a concise `researchBrief` and `citations` to enrich the plan

---

## Data Processing

### Website Analysis Pipeline

1. **URL Validation**: Protocol and format checking
2. **Content Extraction**:
   - Microlink API (primary)
   - Direct HTTP fetch (fallback)
   - HTML cleaning and text extraction
3. **RAG Ingestion**: Chunk, embed, and cache per domain (24h TTL)
4. **AI Processing**: Business insight extraction via NIM guided JSON
5. **Fallback Analysis**: Heuristic-based analysis if AI fails

### Financial Document Processing

1. **File Validation**: Type, size, and format checks
2. **Text Extraction**:
   - PDF: Custom stream parsing
   - OCR: Optional lightweight OCR stub for PDFs/images
   - CSV: Direct text processing
   - TXT: Plain text handling
3. **Content Analysis**: AI-powered financial insight extraction via guided JSON
4. **Structured Output**: JSON formatting for integration

### Context Synthesis

- **Multi-source Integration**: Combines conversation, file, and web data
- **Progressive Enhancement**: Updates context as new information arrives
- **Conflict Resolution**: Prioritizes user-stated information over inferred data
- **Deep Research**: Optional planner loop enriches final plan when needed

---

## Email & Lead Generation

### Email System Architecture

- **Provider**: Resend API
- **Templates**: HTML and plain text versions
- **Personalization**: Dynamic content based on business profile

### Lead Capture Process

1. **Email Gate**: Required for full plan access
2. **User Email**: Formatted business plan delivery
3. **Lead Notification**: Internal team notification
4. **Data Collection**: Business profile and contact information

### Email Templates

#### User Business Plan Email

- Professional HTML layout
- Business profile summary
- Complete plan content
- PDF download links
- Contact information

#### Lead Notification Email

- Lead information summary
- Business context and needs
- Contact details
- Timestamp and tracking

---

## Frontend Components

### Core Interface Components

#### 1. **ChatInterface** (`components/chat-interface.tsx`)

- Main application container
- State management for entire user journey
- Step progression and conversation flow
- Business plan display integration

#### 2. **ContextGathering** (`components/context-gathering.tsx`)

- File upload interface
- Website input handling
- Progress tracking
- Data validation

#### 3. **BusinessProfile** (`components/business-profile.tsx`)

- Real-time business context display
- Dynamic field updates
- Visual progress indicators

#### 4. **BusinessPlanViewer** (`components/business-plan-viewer.tsx`)

- Email gate integration
- PDF generation
- Copy/download functionality
- Preview and full content modes

### UI Component System

- **Design System**: Custom Tailwind configuration
- **Component Library**: Radix UI primitives
- **Responsive Design**: Mobile-first approach
- **Accessibility**: WCAG compliance focus
- **Theme Support**: Dark/light mode toggle

---

## Deployment & Infrastructure

### Hosting & CDN

- **Platform**: Vercel (Next.js optimized)
- **CDN**: Global edge network
- **SSL**: Automatic certificate management
- **Custom Domains**: Full DNS management

### Environment Configuration

```bash
# NVIDIA NIM
NVIDIA_API_KEY=
NVIDIA_API_URL=https://integrate.api.nvidia.com/v1/chat/completions
NVIDIA_EMBEDDINGS_URL=https://integrate.api.nvidia.com/v1/embeddings
NVIDIA_RERANK_URL=https://integrate.api.nvidia.com/v1/rerank

# Model routing
LLM_DEFAULT_MODEL=nvidia/llama-3.1-nemotron-70b-instruct
LLM_PLAN_MODEL=nvidia/llama-3.1-nemotron-ultra-253b-v1
LLM_COST_MODE_MODEL=nvidia/nemotron-4-340b-mini-instruct
EMBEDDINGS_MODEL=nvidia/llama-3.2-nv-embedqa-1b-v2
RERANK_MODEL=nvidia/nv-rerankqa-mistral-4b-v3

# Feature flags
DEEP_RESEARCH_ENABLED=true
COST_MODE=false
RAG_ENABLED=true
OCR_ENABLED=true

# Email Services
RESEND_API_KEY=re_...

# Analytics
VERCEL_ANALYTICS=true
```

### Performance Optimization

- **Static Generation**: Pre-built pages where possible
- **Image Optimization**: Next.js automatic optimization
- **Code Splitting**: Automatic bundle optimization
- **Edge Functions**: Serverless API routes

### Security Measures

- **API Rate Limiting**: Built-in Vercel protection
- **Input Validation**: Comprehensive data sanitization
- **CORS Configuration**: Restricted cross-origin access
- **Environment Isolation**: Separate staging/production
- **Safety Filtering**: Output redaction for secrets/internal URLs
- **Observability**: Logs include model, latency, token usage, request id

---

## Business Model

### Revenue Streams

#### 1. **Lead Generation** (Primary)

- Email capture for business plan access
- Qualified leads for AI implementation services
- Partner referral opportunities

#### 2. **Premium Services** (Future)

- Advanced business plan features
- 1-on-1 consultation scheduling
- Custom AI implementation services

#### 3. **API Licensing** (Future)

- White-label platform licensing
- API access for third-party integrations
- Custom deployment services

### Cost Structure

- **AI API Costs**: OpenAI and NVIDIA usage
- **Infrastructure**: Vercel hosting and bandwidth
- **Email Services**: Resend transactional emails
- **Third-party APIs**: Microlink for website analysis

### Competitive Advantages

1. **Speed**: Instant vs. weeks for traditional consulting
2. **Cost**: Free vs. $10,000+ consultant fees
3. **Quality**: AI-powered insights vs. generic templates
4. **Accessibility**: No technical expertise required
5. **Scalability**: Automated vs. manual consultation process

### Growth Strategy

1. **Content Marketing**: SEO-optimized business content
2. **Partner Network**: Integration with business service providers
3. **Product Expansion**: Additional AI tools and services
4. **Geographic Expansion**: Multi-language support
5. **Industry Specialization**: Vertical-specific solutions

---

## Technical Specifications

### Performance Metrics

- **Page Load**: <2s initial load
- **API Response**: <5s for plan generation
- **Uptime**: 99.9% availability target
- **Scalability**: Serverless auto-scaling

### Browser Support

- **Modern Browsers**: Chrome, Firefox, Safari, Edge
- **Mobile**: iOS Safari, Android Chrome
- **Accessibility**: Screen reader compatible
- **Progressive Enhancement**: Graceful degradation

### Data Privacy & Compliance

- **Data Retention**: No permanent storage of user data
- **Privacy**: No tracking beyond analytics
- **GDPR**: European privacy compliance ready
- **Security**: TLS encryption for all communications

---

_This documentation serves as the comprehensive guide to 5Q for SMBs' business model, technical architecture, and operational procedures. For technical questions, refer to the codebase. For business inquiries, contact the founding team._

**Last Updated**: September 2025  
**Version**: 1.0  
**Maintainer**: Development Team
