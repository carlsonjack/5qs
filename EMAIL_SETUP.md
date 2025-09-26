# Email Setup with Resend

## 🚫 **Issue Fixed: 401 API Key Invalid Error**

The email sending was failing because of an invalid `from` domain. Here's what was fixed:

### **Problem:**

- Using `noreply@yourdomain.com` (placeholder domain)
- Resend API returned 401 "API key is invalid" error
- This happens when using unverified domains

### **Solution:**

- Changed `from` field to use verified custom domain: `jack@5qstrategy.com`
- Added better error logging and debugging information
- Improved API key validation

## 🔧 **Setup Instructions**

### 1. **Get Resend API Key**

1. Go to [resend.com](https://resend.com)
2. Sign up for a free account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key (starts with `re_`)

### 2. **Configure Environment Variable**

Add to your `.env.local` file:

```bash
RESEND_API_KEY=re_your_actual_api_key_here
```

### 3. **Email Domain Configuration**

#### **✅ Custom Domain (Currently Active)**

- **From:** `jack@5qstrategy.com` ✅ (Configured & Verified)
- **Benefits:** Professional appearance, no "via resend.dev" message
- **Status:** Production-ready with verified DNS records

#### **Alternative: Sandbox Domain (For Testing)**

If you want to switch back to sandbox for testing:

```typescript
from: "AI Business Plan <onboarding@resend.dev>",
```

## 🧪 **Testing**

### **Development Mode**

If `RESEND_API_KEY` is not set, the system will:

- Log what would be sent (for debugging)
- Return mock success response
- Not actually send emails

### **Production Mode**

With proper API key configured:

- Sends real emails via Resend
- Logs success/failure details
- Provides proper error messages

## 📧 **What Gets Sent**

### **To User:**

- Subject: "🚀 Your AI Business Plan is Ready!"
- Contains: Complete business plan in HTML + plain text
- From: "AI Business Plan <jack@5qstrategy.com>"

### **To Admin (Lead Notification):**

- Subject: "🎯 New Lead: {email} - AI Business Plan"
- Contains: User info + business context summary
- To: `carlsonjack455@gmail.com`

## 🔍 **Debugging**

Check the server logs for:

- `🔄 Sending email via Resend API...` - Email attempt
- `✅ Email sent successfully` - Success
- `❌ Resend API error` - Detailed error info

## 🚀 **Next Steps**

1. Add your Resend API key to environment variables
2. Test email sending functionality
3. Consider upgrading to custom domain for production use
4. Monitor email delivery rates in Resend dashboard

---

**Fixed Issues:**

- ✅ 401 "API key is invalid" error
- ✅ Invalid domain configuration
- ✅ Better error logging
- ✅ Improved debugging information
