/**
 * SuggestionCard Component
 *
 * Displays an individual ESG suggestion/report with markdown support
 */

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Eye } from 'lucide-react';
import type { ProjectESGSuggestion } from '@/types/v2-schema';
import { updateSuggestionStatus } from '@/lib/services/esg.service';

interface SuggestionCardProps {
  suggestion: ProjectESGSuggestion;
  onStatusChange?: () => void;
}

export function SuggestionCard({ suggestion, onStatusChange }: SuggestionCardProps) {
  const [isUpdating, setIsUpdating] = React.useState(false);

  const handleStatusChange = async (newStatus: 'new' | 'seen' | 'dismissed') => {
    setIsUpdating(true);
    try {
      await updateSuggestionStatus(suggestion.suggestion_id, newStatus);
      onStatusChange?.();
    } catch (error) {
      console.error('Failed to update suggestion status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadge = () => {
    switch (suggestion.status) {
      case 'new':
        return <Badge variant="default">New</Badge>;
      case 'seen':
        return <Badge variant="secondary">Seen</Badge>;
      case 'dismissed':
        return <Badge variant="outline">Dismissed</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl">{suggestion.suggestion_title}</CardTitle>
            <CardDescription className="mt-1">
              Generated on {new Date(suggestion.created_at).toLocaleDateString('en-GB', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </CardDescription>
          </div>
          <div className="ml-4">
            {getStatusBadge()}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Markdown content */}
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <ReactMarkdown>{suggestion.suggestion_narrative}</ReactMarkdown>
        </div>

        {/* Action buttons */}
        {suggestion.status !== 'dismissed' && (
          <div className="flex gap-2 pt-4 border-t">
            {suggestion.status === 'new' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange('seen')}
                disabled={isUpdating}
              >
                <Eye className="h-4 w-4 mr-2" />
                Mark as Seen
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusChange('dismissed')}
              disabled={isUpdating}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Dismiss
            </Button>
          </div>
        )}

        {suggestion.status === 'dismissed' && (
          <div className="flex gap-2 pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusChange('new')}
              disabled={isUpdating}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Restore
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
