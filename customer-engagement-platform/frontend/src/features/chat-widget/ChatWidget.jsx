import { useEffect } from 'react';
import Launcher from './components/Launcher';
import ChatWindow from './components/ChatWindow';
import useChatWidget from './hooks/useChatWidget';
import useWidgetSettings from './hooks/useWidgetSettings';
import WidgetSettingsProvider from './contexts/WidgetSettingsProvider';
import { SENDER_TYPE } from './constants/chatWidget';

function ChatWidget() {
  return (
    <WidgetSettingsProvider>
      <ChatWidgetInner />
    </WidgetSettingsProvider>
  );
}

function ChatWidgetInner() {
  const settings = useWidgetSettings();
  const {
    isOpen,
    open,
    close,
    connectionStatus,
    messages,
    isRemoteTyping,
    sendMessage,
    notifyTyping,
    markRead,
    isConversationClosed,
  } = useChatWidget(settings);

  useEffect(() => {
    if (!isOpen) return;

    const hasUnreadFromOthers = messages.some(
      (message) => message.senderType !== SENDER_TYPE.VISITOR && !message.readAt,
    );

    if (hasUnreadFromOthers) {
      markRead();
    }
  }, [isOpen, messages, markRead]);

  if (!isOpen) {
    return <Launcher onClick={open} position={settings.position} />;
  }

  return (
    <ChatWindow
      connectionStatus={connectionStatus}
      messages={messages}
      isRemoteTyping={isRemoteTyping}
      onClose={close}
      onSend={sendMessage}
      onTyping={notifyTyping}
      isConversationClosed={isConversationClosed}
    />
  );
}

export default ChatWidget;
