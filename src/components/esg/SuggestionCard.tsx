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
        return <Badge variant="default" className="bg-accent text-accent-foreground shadow-sm">New</Badge>;
      case 'seen':
        return <Badge variant="secondary" className="bg-secondary text-secondary-foreground">Seen</Badge>;
      case 'dismissed':
        return <Badge variant="outline" className="border-2">Dismissed</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card className="w-full border-2 hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="bg-gradient-to-r from-card to-secondary/10 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-2xl font-bold leading-tight">{suggestion.suggestion_title}</CardTitle>
            <CardDescription className="mt-2 text-sm">
              Generated {new Date(suggestion.created_at).toLocaleDateString('en-GB', {
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
      <CardContent className="space-y-4 pt-6">
        {/* Markdown content with enhanced styling */}
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <ReactMarkdown>{suggestion.suggestion_narrative}</ReactMarkdown>
        </div>

        {/* Action buttons with enhanced styling */}
        {suggestion.status !== 'dismissed' && (
          <div className="flex gap-2 pt-4 border-t-2 border-border">
            {suggestion.status === 'new' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange('seen')}
                disabled={isUpdating}
                className="border-2 h-9"
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
              className="border-2 h-9 hover:bg-destructive/10 hover:border-destructive hover:text-destructive"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Dismiss
            </Button>
          </div>
        )}

        {suggestion.status === 'dismissed' && (
          <div className="flex gap-2 pt-4 border-t-2 border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusChange('new')}
              disabled={isUpdating}
              className="border-2 h-9 hover:bg-accent/10 hover:border-accent hover:text-accent"
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
