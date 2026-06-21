import React, { useState } from "react";
import { EditIcon, TrashIcon } from "../ui/Icons";

const Message = ({ message, user, onEdit, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(message.text || "");

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

  const saveEdit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== message.text) {
      onEdit(message.id, trimmed);
    }
    setIsEditing(false);
  };

  return (
    <div className="message-item">
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
      </div>
      {isOwn && !message.deleted && !isEditing && (
        <div className="message-actions">
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
        </div>
      )}
    </div>
  );
};

export default Message;
