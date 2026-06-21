import React, { useState, useLayoutEffect, useRef } from "react";
import ChatHeader from "./ChatHeader";
import Message from "./Message";
import TypingIndicator from "./TypingIndicator";
import { SendIcon } from "../ui/Icons";

const Chat = ({
  channel,
  messages,
  hasMore,
  onLoadOlder,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onToggleReaction,
  onSearch,
  onJumpToResult,
  resolveChannelName,
  onTyping,
  typingUsers,
  user,
  workspace,
}) => {
  const [newMessage, setNewMessage] = useState("");
  const [loadingOlder, setLoadingOlder] = useState(false);
  const messagesAreaRef = useRef(null);
  const typingTimeout = useRef(null);
  const prevChannelIdRef = useRef(null);
  const prependRef = useRef(null);
  const loadingRef = useRef(false);
  const nearBottomRef = useRef(true);

  const channelId = channel?.channel_id;

  const channelLabel = channel
    ? channel.isDm
      ? `@${channel.channel_name}`
      : `#${channel.channel_name}`
    : "";

  const handleScroll = () => {
    const el = messagesAreaRef.current;
    if (!el) return;
    nearBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 120;

    if (
      el.scrollTop <= 80 &&
      hasMore &&
      !loadingRef.current &&
      messages.length > 0
    ) {
      loadingRef.current = true;
      setLoadingOlder(true);
      prependRef.current = { height: el.scrollHeight, top: el.scrollTop };
      Promise.resolve(onLoadOlder?.()).finally(() => {
        loadingRef.current = false;
        setLoadingOlder(false);
      });
    }
  };

  useLayoutEffect(() => {
    const el = messagesAreaRef.current;
    if (!el) return;

    if (prevChannelIdRef.current !== channelId) {
      prevChannelIdRef.current = channelId;
      prependRef.current = null;
      nearBottomRef.current = true;
      el.scrollTop = el.scrollHeight;
      return;
    }

    if (prependRef.current) {
      const { height, top } = prependRef.current;
      prependRef.current = null;
      el.scrollTop = top + (el.scrollHeight - height);
      return;
    }

    if (nearBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, channelId]);

  const stopTyping = () => {
    clearTimeout(typingTimeout.current);
    typingTimeout.current = null;
    onTyping?.(false);
  };

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    if (!onTyping) return;
    if (!typingTimeout.current) {
      onTyping(true);
    }
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(stopTyping, 2000);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim()) {
      onSendMessage(newMessage.trim());
      setNewMessage("");
      stopTyping();
    }
  };

  return (
    <div className="chat-container">
      <ChatHeader
        channel={channel}
        workspace={workspace}
        onSearch={onSearch}
        onJumpToResult={onJumpToResult}
        resolveChannelName={resolveChannelName}
      />
      <div className="messages-area" ref={messagesAreaRef} onScroll={handleScroll}>
        {!workspace ? (
          <div className="placeholder-container">
            <p className="placeholder-text">
              Create or join a workspace to get started!
            </p>
          </div>
        ) : channel ? (
          messages.length > 0 ? (
            <div>
              {loadingOlder && (
                <div className="messages-loading">Loading earlier messages…</div>
              )}
              {messages.map((msg) => (
                <Message
                  key={msg.id}
                  message={msg}
                  user={user}
                  onEdit={onEditMessage}
                  onDelete={onDeleteMessage}
                  onReact={onToggleReaction}
                />
              ))}
            </div>
          ) : (
            <div className="placeholder-container">
              <p className="placeholder-text">
                Be the first to say something in {channelLabel}!
              </p>
            </div>
          )
        ) : (
          <div className="placeholder-container">
            <p className="placeholder-text">
              Select a channel to start chatting.
            </p>
          </div>
        )}
      </div>
      {channel && user && (
        <div className="chat-input-area">
          <TypingIndicator users={typingUsers} />
          <form onSubmit={handleSendMessage} className="chat-form">
            <input
              type="text"
              value={newMessage}
              onChange={handleInputChange}
              placeholder={`Message ${channelLabel}`}
              className="chat-input"
            />
            <button type="submit" className="send-button">
              <SendIcon />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default Chat;
