# Gemini Integration Setup Guide

This document provides instructions for setting up the Gemini API integration in this project.

## Overview

The project includes a secure Supabase Edge Function (`gemini-chat`) that provides authenticated and rate-limited access to Google's Gemini API. This setup ensures:

- **Security**: API keys are never exposed to the frontend
- **Authentication**: Only authenticated users can make requests
- **Rate Limiting**: Prevents abuse with per-user limits
- **Logging**: Tracks requests for monitoring and debugging

## Architecture

```
Frontend (React)
    ↓ (authenticated request)
Supabase Edge Function (gemini-chat)
    ↓ (validates auth)
    ↓ (checks rate limits)
    ↓ (calls Gemini API)
Google Gemini API
```

## Setup Instructions

### 1. Get a Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key" or "Get API Key"
4. Copy the generated API key (starts with `AIza...`)

**Important**: This should be an API key from Google AI Studio, NOT a Vertex AI key.

### 2. Configure Supabase

#### Local Development

Add the API key to your local `.env` file or Supabase local secrets:

```bash
# Using Supabase CLI
supabase secrets set GEMINI_API_KEY=your_api_key_here --env-file .env.local
```

Or create/update `.env.local`:
```
GEMINI_API_KEY=your_api_key_here
```

#### Production

Set the secret in your Supabase project dashboard:

1. Go to your project in the [Supabase Dashboard](https://app.supabase.com)
2. Navigate to Settings > Edge Functions
3. Add a new secret:
   - Name: `GEMINI_API_KEY`
   - Value: Your Gemini API key

Or use the CLI:
```bash
supabase secrets set GEMINI_API_KEY=your_api_key_here --project-ref your-project-ref
```

### 3. Run Database Migrations

Apply the migration that creates the `gemini_requests` table:

```bash
# For local development
supabase db reset

# For production
supabase db push --project-ref your-project-ref
```

### 4. Deploy the Edge Function

#### Local Development

Start the edge function locally:
```bash
supabase functions serve gemini-chat
```

#### Production

Deploy to Supabase:
```bash
supabase functions deploy gemini-chat --project-ref your-project-ref
```

## Frontend Integration

### Basic Example

```typescript
import { supabase } from './lib/supabase';

async function chatWithGemini(message: string) {
  // Get the current session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    throw new Error('Please sign in to use this feature');
  }

  // Call the edge function
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-chat`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message })
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to chat with Gemini');
  }

  const data = await response.json();
  return data.data.text;
}

// Usage
try {
  const response = await chatWithGemini('Hello!');
  console.log(response);
} catch (error) {
  console.error('Error:', error.message);
}
```

### With React Query

```typescript
import { useMutation } from '@tanstack/react-query';
import { supabase } from './lib/supabase';

function useChatWithGemini() {
  return useMutation({
    mutationFn: async (message: string) => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-chat`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      const data = await response.json();
      return data.data.text;
    }
  });
}

// In your component
function ChatComponent() {
  const { mutate: sendMessage, isPending, error } = useChatWithGemini();

  const handleSendMessage = () => {
    sendMessage('Hello Gemini!', {
      onSuccess: (response) => {
        console.log('Gemini says:', response);
      }
    });
  };

  return (
    <button onClick={handleSendMessage} disabled={isPending}>
      {isPending ? 'Sending...' : 'Send Message'}
    </button>
  );
}
```

## Rate Limits

The edge function enforces the following rate limits per user:

- **10 requests per minute**
- **100 requests per hour**

When a rate limit is exceeded, the API returns a `429 Too Many Requests` response with details:

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

**Note**: Failed requests (including rate-limited ones) do not count toward your rate limit.

## Database Schema

The `gemini_requests` table logs all API requests:

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | References auth.users |
| created_at | TIMESTAMP | When request was created |
| status | TEXT | 'pending', 'success', or 'failed' |
| error_message | TEXT | Error message if failed |
| updated_at | TIMESTAMP | Last update time |

**Privacy**: Only request metadata is logged. The actual message content is never stored.

## Testing

### Using curl

```bash
# Get your access token from Supabase
TOKEN="your-jwt-token"

# Call the edge function
curl -X POST \
  https://your-project.supabase.co/functions/v1/gemini-chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello!"}'
```

### Using Supabase Studio

1. Go to your Supabase project
2. Navigate to Edge Functions
3. Select `gemini-chat`
4. Use the "Test Function" feature

## Troubleshooting

### "Gemini API key not configured"

**Solution**: Ensure the `GEMINI_API_KEY` secret is set in your Supabase project and redeploy the function.

### "Unauthorized"

**Possible causes**:
- User is not signed in
- JWT token is invalid or expired
- Authorization header is missing

**Solution**: Ensure you're passing a valid JWT token in the `Authorization` header.

### "Rate limit exceeded"

**Solution**: Wait for the rate limit window to expire (1 minute or 1 hour depending on which limit was hit).

### Edge function not deploying

**Solution**:
1. Ensure you have the latest Supabase CLI: `supabase --version`
2. Check that the `import_map.json` is in the `supabase/functions/` directory
3. Try deploying with `--debug` flag for more details

## Security Best Practices

1. **Never** expose your Gemini API key in frontend code
2. **Always** validate user authentication before making requests
3. **Monitor** the `gemini_requests` table for unusual activity
4. **Rotate** your API key periodically
5. **Set up** alerts for rate limit violations

## Next Steps

- [ ] Implement custom prompt handling (currently hardcoded)
- [ ] Add conversation history support
- [ ] Add support for different Gemini models
- [ ] Implement streaming responses
- [ ] Add cost tracking and budgets
- [ ] Add admin dashboard for monitoring

## Resources

- [Google Gemini API Documentation](https://ai.google.dev/docs)
- [Supabase Edge Functions Documentation](https://supabase.com/docs/guides/functions)
- [Edge Function Code](./supabase/functions/gemini-chat/README.md)
