/**
 * Example component demonstrating Gemini API integration
 *
 * This is a reference implementation showing how to use the Gemini hooks.
 * You can use this as a starting point for your own implementation.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useGeminiChat, useGeminiAuth } from '@/hooks/use-gemini';
import { Loader2 } from 'lucide-react';

export function GeminiChatExample() {
  const [response, setResponse] = useState<string | null>(null);
  const { data: isAuthenticated, isLoading: authLoading } = useGeminiAuth();
  const { sendMessage, isPending, rateLimit } = useGeminiChat();

  const handleTestGemini = () => {
    sendMessage('Hello Gemini!', {
      onSuccess: (data) => {
        setResponse(data);
      }
    });
  };

  if (authLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isAuthenticated) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gemini Chat</CardTitle>
          <CardDescription>
            Please sign in to use the Gemini chat feature
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const remainingMinute = (rateLimit.data?.limits.perMinute || 10) - (rateLimit.data?.minuteCount || 0);
  const remainingHour = (rateLimit.data?.limits.perHour || 100) - (rateLimit.data?.hourCount || 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gemini Chat Test</CardTitle>
        <CardDescription>
          Test the Gemini API integration with a hardcoded message
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Rate Limit Status:</span>
          <div className="space-y-1 text-right">
            <div>
              Remaining this minute: {remainingMinute}/10
            </div>
            <div>
              Remaining this hour: {remainingHour}/100
            </div>
          </div>
        </div>

        <Button
          onClick={handleTestGemini}
          disabled={isPending || remainingMinute === 0}
          className="w-full"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            'Test Gemini API'
          )}
        </Button>

        {response && (
          <div className="mt-4 rounded-lg bg-muted p-4">
            <p className="text-sm font-medium mb-2">Response from Gemini:</p>
            <p className="text-sm">{response}</p>
          </div>
        )}

        {remainingMinute === 0 && (
          <p className="text-sm text-destructive">
            Rate limit exceeded. Please wait a minute before trying again.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
