import { useMutation, useQuery } from '@tanstack/react-query';
import {
  callGemini,
  isGeminiAuthenticated,
  getGeminiRequestHistory,
  getRateLimitStatus,
  GeminiRateLimitError,
  GeminiAuthError,
  GeminiAPIError
} from '@/lib/geminiService';
import { useToast } from './use-toast';

/**
 * Hook for calling the Gemini API
 *
 * @example
 * ```tsx
 * function ChatComponent() {
 *   const { mutate: sendMessage, isPending, error } = useGemini();
 *
 *   const handleSend = () => {
 *     sendMessage('Hello Gemini!', {
 *       onSuccess: (response) => {
 *         console.log('Response:', response);
 *       }
 *     });
 *   };
 *
 *   return (
 *     <button onClick={handleSend} disabled={isPending}>
 *       {isPending ? 'Sending...' : 'Send Message'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useGemini() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: callGemini,
    onError: (error) => {
      if (error instanceof GeminiRateLimitError) {
        toast({
          variant: 'destructive',
          title: 'Rate limit exceeded',
          description: `You've exceeded the rate limit. Please try again later. (${error.minuteCount}/10 per minute, ${error.hourCount}/100 per hour)`
        });
      } else if (error instanceof GeminiAuthError) {
        toast({
          variant: 'destructive',
          title: 'Authentication required',
          description: error.message
        });
      } else if (error instanceof GeminiAPIError) {
        toast({
          variant: 'destructive',
          title: 'Gemini API Error',
          description: error.message
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error instanceof Error ? error.message : 'An unknown error occurred'
        });
      }
    }
  });
}

/**
 * Hook for checking if the user is authenticated for Gemini API
 *
 * @example
 * ```tsx
 * function ChatButton() {
 *   const { data: isAuthenticated, isLoading } = useGeminiAuth();
 *
 *   if (isLoading) return <div>Loading...</div>;
 *
 *   if (!isAuthenticated) {
 *     return <div>Please sign in to use Gemini</div>;
 *   }
 *
 *   return <ChatComponent />;
 * }
 * ```
 */
export function useGeminiAuth() {
  return useQuery({
    queryKey: ['gemini-auth'],
    queryFn: isGeminiAuthenticated,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook for fetching the user's Gemini request history
 *
 * @example
 * ```tsx
 * function RequestHistory() {
 *   const { data: history, isLoading } = useGeminiHistory();
 *
 *   if (isLoading) return <div>Loading...</div>;
 *
 *   return (
 *     <ul>
 *       {history?.map((request) => (
 *         <li key={request.id}>
 *           {request.status} - {new Date(request.created_at).toLocaleString()}
 *         </li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useGeminiHistory() {
  return useQuery({
    queryKey: ['gemini-history'],
    queryFn: getGeminiRequestHistory,
    refetchInterval: 1000 * 30, // Refetch every 30 seconds
  });
}

/**
 * Hook for checking the user's current rate limit status
 *
 * @example
 * ```tsx
 * function RateLimitDisplay() {
 *   const { data: status, isLoading } = useGeminiRateLimit();
 *
 *   if (isLoading) return <div>Loading...</div>;
 *
 *   return (
 *     <div>
 *       <p>Requests this minute: {status?.minuteCount}/{status?.limits.perMinute}</p>
 *       <p>Requests this hour: {status?.hourCount}/{status?.limits.perHour}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useGeminiRateLimit() {
  return useQuery({
    queryKey: ['gemini-rate-limit'],
    queryFn: getRateLimitStatus,
    refetchInterval: 1000 * 10, // Refetch every 10 seconds
  });
}

/**
 * Combined hook that provides both the mutation and rate limit status
 *
 * @example
 * ```tsx
 * function ChatComponent() {
 *   const { sendMessage, isPending, rateLimit } = useGeminiChat();
 *
 *   const remainingMinute = (rateLimit.data?.limits.perMinute || 10) - (rateLimit.data?.minuteCount || 0);
 *
 *   return (
 *     <div>
 *       <p>Remaining requests this minute: {remainingMinute}</p>
 *       <button
 *         onClick={() => sendMessage('Hello!')}
 *         disabled={isPending || remainingMinute === 0}
 *       >
 *         {isPending ? 'Sending...' : 'Send Message'}
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useGeminiChat() {
  const mutation = useGemini();
  const rateLimit = useGeminiRateLimit();

  return {
    sendMessage: mutation.mutate,
    sendMessageAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    data: mutation.data,
    rateLimit,
  };
}
