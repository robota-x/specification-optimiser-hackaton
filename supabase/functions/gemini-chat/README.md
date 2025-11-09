# Gemini Chat Edge Function

A secure Supabase Edge Function that provides authenticated and rate-limited access to Google's Gemini API.

## Features

- **Authentication**: Validates Supabase user identity via JWT tokens
- **Rate Limiting**:
  - 10 requests per minute per user
  - 100 requests per hour per user
  - Only successful requests count toward limits
- **Request Logging**: Tracks all requests in the `gemini_requests` table (metadata only, no content)
- **Error Handling**: Proper error responses and logging
- **CORS Support**: Configured for cross-origin requests

## Setup

### 1. Environment Variables

Add the following environment variable to your Supabase project:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

To get a Gemini API key:
1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key and add it to your Supabase project secrets

To add the secret to Supabase:
```bash
supabase secrets set GEMINI_API_KEY=your_api_key_here
```

### 2. Database Migration

The edge function requires the `gemini_requests` table. Run the migration:

```bash
supabase db push
```

Or apply the migration file: `20251109022200_create_gemini_requests_table.sql`

### 3. Deploy the Function

```bash
supabase functions deploy gemini-chat
```

## Usage

### Endpoint

```
POST https://your-project.supabase.co/functions/v1/gemini-chat
```

### Headers

```
Authorization: Bearer <user-jwt-token>
Content-Type: application/json
```

### Request Body

Currently accepts any JSON payload (validation is TODO):

```json
{
  "message": "Your message here"
}
```

### Response

#### Success (200)
```json
{
  "success": true,
  "data": {
    "text": "Hello! I'm Gemini...",
    "requestId": "uuid-of-request-log"
  }
}
```

#### Rate Limit Exceeded (429)
```json
{
  "error": "Rate limit exceeded",
  "details": {
    "minuteCount": 10,
    "hourCount": 95,
    "limits": {
      "perMinute": 10,
      "perHour": 100
    }
  }
}
```

#### Unauthorized (401)
```json
{
  "error": "Unauthorized"
}
```

#### Error (500)
```json
{
  "error": "Failed to call Gemini API",
  "details": "Error message here"
}
```

## Frontend Integration Example

```typescript
import { supabase } from './supabase-client';

async function callGemini() {
  // Get the user's session token
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(
    'https://your-project.supabase.co/functions/v1/gemini-chat',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Hello Gemini!'
      })
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  const data = await response.json();
  return data.data.text;
}
```

## Database Schema

The `gemini_requests` table tracks all API requests:

```sql
CREATE TABLE gemini_requests (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE,
  status TEXT CHECK (status IN ('pending', 'success', 'failed')),
  error_message TEXT,
  updated_at TIMESTAMP WITH TIME ZONE
);
```

## Security Considerations

- The Gemini API key is stored as a Supabase secret and never exposed to the frontend
- User authentication is required for all requests
- Rate limiting prevents abuse
- Row Level Security (RLS) ensures users can only view their own request logs
- Request content is never logged to the database

## TODO

- [ ] Implement request payload validation
- [ ] Add support for different Gemini models
- [ ] Add support for conversation history
- [ ] Add monitoring and alerting for rate limit violations
- [ ] Add request payload to the function (currently hardcoded)

## Troubleshooting

### "Gemini API key not configured"
- Ensure you've set the `GEMINI_API_KEY` secret in Supabase
- Redeploy the function after setting the secret

### "Rate limit exceeded"
- Wait for the rate limit window to expire (1 minute or 1 hour)
- Failed requests don't count toward the limit

### "Unauthorized"
- Ensure you're sending a valid JWT token in the Authorization header
- Check that the user is authenticated in your Supabase project
