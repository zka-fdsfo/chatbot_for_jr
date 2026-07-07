import Fab from '@mui/material/Fab';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutlined';

function Launcher({ onClick, position }) {
  const isLeft = position === 'BOTTOM_LEFT';

  return (
    <Fab
      color="primary"
      onClick={onClick}
      aria-label="Open chat"
      sx={{
        position: 'fixed',
        bottom: 24,
        ...(isLeft ? { left: 24 } : { right: 24 }),
        zIndex: (theme) => theme.zIndex.modal,
      }}
    >
      <ChatBubbleOutlineIcon />
    </Fab>
  );
}

export default Launcher;
