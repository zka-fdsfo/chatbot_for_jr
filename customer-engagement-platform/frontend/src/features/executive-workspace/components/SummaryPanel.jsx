import { useEffect, useState } from 'react';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import conversationService from '../../../services/conversationService';
import useNotification from '../../../hooks/useNotification';

const SENTIMENT_COLOR = {
  POSITIVE: 'success',
  NEUTRAL: 'default',
  NEGATIVE: 'error',
};

function SummaryPanel({ mongoConversationId }) {
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const { notify } = useNotification();

  useEffect(() => {
    if (!mongoConversationId) return undefined;

    let isMounted = true;

    conversationService
      .getSummary(mongoConversationId)
      .then((result) => {
        if (isMounted) setSummary(result.summary);
      })
      .catch(() => {
        if (isMounted) setSummary(null);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [mongoConversationId]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const result = await conversationService.generateSummary(mongoConversationId);
      setSummary(result.summary);
    } catch (error) {
      notify(error.message ?? 'Failed to generate summary.', { severity: 'error' });
    } finally {
      setIsGenerating(false);
    }
  };

  if (!mongoConversationId) {
    return (
      <Paper variant="outlined" sx={{ height: '100%', p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          AI summary appears once a conversation is active.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper variant="outlined" sx={{ height: '100%', overflow: 'auto', p: 2 }}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6">AI Summary</Typography>
        <Button size="small" variant="outlined" onClick={handleGenerate} disabled={isGenerating}>
          {isGenerating ? 'Generating…' : summary ? 'Regenerate' : 'Generate'}
        </Button>
      </Stack>

      <Divider sx={{ my: 2 }} />

      {isLoading ? (
        <Typography variant="body2" color="text.secondary">
          Loading…
        </Typography>
      ) : summary ? (
        <Stack spacing={1.5}>
          <Typography variant="body2">{summary.summary}</Typography>

          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
            {summary.sentiment && (
              <Chip
                size="small"
                label={`Sentiment: ${summary.sentiment}`}
                color={SENTIMENT_COLOR[summary.sentiment] ?? 'default'}
              />
            )}
            {summary.outcome && <Chip size="small" label={`Outcome: ${summary.outcome}`} />}
          </Stack>

          {summary.visitorIntent && (
            <Typography variant="body2">
              <strong>Visitor intent:</strong> {summary.visitorIntent}
            </Typography>
          )}

          {summary.followUpRecommendation && (
            <Typography variant="body2">
              <strong>Follow-up:</strong> {summary.followUpRecommendation}
            </Typography>
          )}
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary">
          No summary generated yet.
        </Typography>
      )}
    </Paper>
  );
}

export default SummaryPanel;
