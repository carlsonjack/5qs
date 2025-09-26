# Database Setup & Integration Guide

## 🎉 Database Setup Complete!

Your Supabase database is now fully configured with a comprehensive schema designed for scalability and performance. Here's what has been implemented:

## 📊 Database Schema Overview

### Core Tables

- **`users`** - User profiles and session management
- **`conversations`** - Chat session tracking and context
- **`messages`** - Individual chat messages with metadata
- **`business_plans`** - Generated business plans with delivery tracking
- **`leads`** - Lead management with scoring and qualification
- **`file_uploads`** - Document upload tracking and analysis
- **`website_analyses`** - Website analysis results
- **`email_events`** - Email delivery and engagement tracking
- **`analytics_events`** - User behavior and system analytics
- **`system_health`** - API performance and error monitoring

### Key Features

- ✅ **Comprehensive indexing** for optimal query performance
- ✅ **Foreign key relationships** for data integrity
- ✅ **JSONB fields** for flexible metadata storage
- ✅ **Audit trails** with created_at/updated_at timestamps
- ✅ **Lead scoring** and qualification tracking
- ✅ **Email engagement** monitoring
- ✅ **System health** monitoring
- ✅ **Analytics** event tracking

## 🚀 Getting Started

### 1. Environment Variables

Your environment variables are already configured in your `.env` file:

```bash
POSTGRES_URL="postgres://postgres.rxhytncozedxyardnssr:PxwVMh5RLDetHcAt@aws-1-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require&supa=base-pooler.x"
NEXT_PUBLIC_SUPABASE_URL="https://rxhytncozedxyardnssr.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### 2. Database Connection Test

Test your database connection:

```bash
npm run test:db
```

### 3. Database Management Commands

```bash
# Generate new migrations
npm run db:generate

# Push changes to database
npm run db:push

# Open database studio (visual interface)
npm run db:studio
```

## 🔧 Integration with Existing API Routes

### Option 1: Wrapper Function (Recommended)

Use the `withDatabase` wrapper to add database functionality to existing routes:

```typescript
import { withDatabase } from "@/lib/db/api-wrapper";

export const POST = withDatabase(async (req, db) => {
  // Your existing logic here
  // db is automatically initialized and ready to use

  // Save messages
  await saveChatMessages(db, messages);

  // Update context
  await updateConversationContext(db, { contextSummary });

  // Save business plan
  await saveBusinessPlan(db, { content: planContent });

  // Track analytics
  await db.trackEvent("user_action", "button_click");

  return NextResponse.json({ success: true });
});
```

### Option 2: Direct Integration

Use the DatabaseIntegration class directly:

```typescript
import { createDatabaseIntegration } from "@/lib/db/integration";

export async function POST(req: NextRequest) {
  const db = createDatabaseIntegration(req);
  await db.initialize();

  // Use db methods...
  await db.saveMessage("user", "Hello");
  await db.trackEvent("chat", "message_sent");

  return NextResponse.json({ success: true });
}
```

## 📈 Analytics & Monitoring

### Track User Events

```typescript
await db.trackEvent("user_action", "button_click", {
  buttonId: "generate_plan",
  timestamp: new Date().toISOString(),
});
```

### Monitor System Health

```typescript
await db.logSystemHealth({
  service: "nvidia_api",
  endpoint: "/v1/chat/completions",
  statusCode: 200,
  responseTime: 1500,
  success: true,
  tokensUsed: 150,
  costEstimate: 0.002,
});
```

### Lead Management

```typescript
// Create/update lead
const lead = await db.saveLead({
  email: "user@example.com",
  firstName: "John",
  lastName: "Doe",
  businessType: "SaaS",
  score: 85,
  leadSignals: { urgency: "high", budget: "medium" },
});

// Get high-value leads
const hotLeads = await db.getHighValueLeads(80, 20);
```

## 🎯 Key Benefits

### 1. **Complete Data Persistence**

- All chat conversations are saved
- Business plans are stored with metadata
- Lead information is captured and scored
- File uploads are tracked and analyzed

### 2. **Advanced Analytics**

- User behavior tracking
- Conversion funnel analysis
- System performance monitoring
- Lead scoring and qualification

### 3. **Scalable Architecture**

- Optimized database schema
- Proper indexing for performance
- Foreign key relationships
- JSONB for flexible metadata

### 4. **Lead Management**

- Automatic lead capture
- Lead scoring algorithm
- Contact attempt tracking
- Conversion tracking

### 5. **System Monitoring**

- API performance tracking
- Error rate monitoring
- Cost estimation
- Health dashboards

## 🔍 Database Queries Examples

### Get Recent Conversations

```sql
SELECT c.*, u.email, COUNT(m.id) as message_count
FROM conversations c
LEFT JOIN users u ON c.user_id = u.id
LEFT JOIN messages m ON c.id = m.conversation_id
WHERE c.created_at > NOW() - INTERVAL '7 days'
GROUP BY c.id, u.email
ORDER BY c.created_at DESC;
```

### Get High-Value Leads

```sql
SELECT l.*, u.email, bp.title as plan_title
FROM leads l
LEFT JOIN users u ON l.user_id = u.id
LEFT JOIN business_plans bp ON l.business_plan_id = bp.id
WHERE l.score >= 70
ORDER BY l.score DESC, l.created_at DESC;
```

### System Health Dashboard

```sql
SELECT
  service,
  COUNT(*) as total_requests,
  AVG(response_time) as avg_response_time,
  SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful_requests,
  (SUM(CASE WHEN success THEN 1 ELSE 0 END)::float / COUNT(*)) * 100 as success_rate
FROM system_health
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY service
ORDER BY success_rate DESC;
```

## 🚨 Important Notes

### 1. **Session Management**

- Anonymous users get temporary email addresses
- Sessions are tracked via cookies
- User data is linked when they provide email

### 2. **Data Privacy**

- All data is stored in your Supabase instance
- GDPR compliance features included
- User preferences for data handling

### 3. **Performance**

- Database is optimized for read-heavy workloads
- Proper indexing on frequently queried fields
- Connection pooling configured

### 4. **Monitoring**

- All API calls are logged
- Error rates are tracked
- Performance metrics are collected

## 🎉 Next Steps

1. **Integrate with existing routes** using the wrapper functions
2. **Set up monitoring dashboards** in Supabase
3. **Configure email notifications** for new leads
4. **Implement lead scoring** based on your criteria
5. **Add analytics tracking** to frontend components

Your database is now ready for production use! 🚀
