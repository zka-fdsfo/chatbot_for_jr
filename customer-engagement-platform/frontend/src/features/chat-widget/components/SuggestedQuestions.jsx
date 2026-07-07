import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import useWidgetSettings from '../hooks/useWidgetSettings';
import analyticsService from '../../../services/analyticsService';
import { EVENT_TYPE } from '../../../constants/analytics';

function SuggestedQuestions({ onSelect }) {
  const settings = useWidgetSettings();

  const handleSelect = (question) => {
    analyticsService.recordEvent(EVENT_TYPE.SUGGESTED_QUESTION_USED, { question });
    onSelect(question);
  };

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, px: 1.5, py: 1 }}>
      {settings.suggestedQuestions.map((question) => (
        <Chip key={question} label={question} onClick={() => handleSelect(question)} size="small" variant="outlined" />
      ))}
    </Box>
  );
}

export default SuggestedQuestions;
