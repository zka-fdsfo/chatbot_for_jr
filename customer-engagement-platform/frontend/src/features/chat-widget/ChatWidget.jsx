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
    typingSenderType,
    sendMessage,
    notifyTyping,
    markRead,
    isConversationClosed,
    visitorProfile,
    updateProfile,
    endChat,
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

  // When embedded via public/embed.js, this widget renders inside an
  // iframe sized to match its own footprint (not the full page) — the
  // loader script can't know that footprint on its own, so it resizes
  // the iframe in response to this message. A no-op when the widget
  // isn't inside an iframe at all (e.g. loading widget.html directly).
  useEffect(() => {
    if (window.self === window.top) return;

    window.parent.postMessage(
      { source: 'ai-cep-widget', type: 'WIDGET_STATE', isOpen, position: settings.position },
      '*',
    );
  }, [isOpen, settings.position]);

  if (!isOpen) {
    return <Launcher onClick={open} position={settings.position} />;
  }

  return (
    <ChatWindow
      connectionStatus={connectionStatus}
      messages={messages}
      isRemoteTyping={isRemoteTyping}
      typingSenderType={typingSenderType}
      onClose={close}
      onSend={sendMessage}
      onTyping={notifyTyping}
      isConversationClosed={isConversationClosed}
      visitorProfile={visitorProfile}
      onUpdateProfile={updateProfile}
      onEndChat={endChat}
    />
  );
}

export default ChatWidget;
