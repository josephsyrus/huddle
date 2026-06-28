import React, { useState } from "react";
import { EditIcon, TrashIcon, ReactionIcon } from "../ui/Icons";

const REACTION_EMOJIS = ["👍", "❤️", "😂", "🎉", "😮", "😢"];

const Message = ({
  message,
  user,
  onEdit,
  onDelete,
  onReact,
  actionsVisible,
  onToggleActions,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(message.text || "");
  const [showPicker, setShowPicker] = useState(false);

  const formattedTime = message.createdAt
    ? new Date(message.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "...";
  const initials = message.userId
    ? message.userId.substring(0, 2).toUpperCase()
    : "??";
  const isOwn = user && message.userId === user.username;
  const reactions = message.reactions || [];

  const saveEdit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== message.text) {
      onEdit(message.id, trimmed);
    }
    setIsEditing(false);
  };

  const react = (emoji) => {
    onReact(message.id, emoji);
    setShowPicker(false);
  };

  return (
    <div
      className={`message-item ${actionsVisible ? "actions-visible" : ""}`}
      onClick={onToggleActions}
    >
      <div className="message-avatar">{initials}</div>
      <div className="message-content">
        <div className="message-meta">
          <span className="message-username">{message.userId}</span>
          <span className="message-timestamp">{formattedTime}</span>
        </div>
        {message.deleted ? (
          <p className="message-text message-deleted">
            This message was deleted
          </p>
        ) : isEditing ? (
          <div className="message-edit">
            <input
              className="message-edit-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveEdit();
                if (e.key === "Escape") setIsEditing(false);
              }}
              autoFocus
            />
            <div className="message-edit-actions">
              <button onClick={saveEdit} className="message-edit-save">
                Save
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="message-edit-cancel"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="message-text">
            {message.text}
            {message.edited && <span className="message-edited"> (edited)</span>}
          </p>
        )}
        {!message.deleted && reactions.length > 0 && (
          <div className="message-reactions">
            {reactions.map((r) => (
              <button
                key={r.emoji}
                className={`reaction-badge ${
                  r.userIds.includes(user?.id) ? "reacted" : ""
                }`}
                onClick={() => react(r.emoji)}
              >
                <span>{r.emoji}</span>
                <span className="reaction-count">{r.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      {!message.deleted && !isEditing && (
        <div
          className="message-actions"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="reaction-add">
            <button onClick={() => setShowPicker((s) => !s)} title="Add reaction">
              <ReactionIcon />
            </button>
            {showPicker && (
              <div className="reaction-picker">
                {REACTION_EMOJIS.map((emoji) => (
                  <button key={emoji} onClick={() => react(emoji)}>
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
          {isOwn && (
            <>
              <button
                onClick={() => {
                  setDraft(message.text);
                  setIsEditing(true);
                }}
                title="Edit"
              >
                <EditIcon />
              </button>
              <button onClick={() => onDelete(message.id)} title="Delete">
                <TrashIcon />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Message;
