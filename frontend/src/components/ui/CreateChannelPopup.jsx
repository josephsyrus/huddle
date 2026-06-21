import React, { useState } from "react";

const CreateChannelPopup = ({ members = [], currentUserId, onClose, onCreate }) => {
  const [name, setName] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [selected, setSelected] = useState([]);

  const toggleMember = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate(name.trim(), isPrivate, isPrivate ? selected : []);
  };

  const selectableMembers = members.filter((m) => m.user_id !== currentUserId);

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-box" onClick={(e) => e.stopPropagation()}>
        <h1 className="popup-title">Create a channel</h1>
        <form onSubmit={handleSubmit} className="popup-form">
          <div className="input-group">
            <label htmlFor="channel-name">Channel name</label>
            <input
              id="channel-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. project-updates"
              autoFocus
            />
          </div>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
            />
            <span>Private channel — only chosen members can access it</span>
          </label>

          {isPrivate && (
            <div className="member-select">
              {selectableMembers.length === 0 ? (
                <p className="member-select-empty">No other members yet.</p>
              ) : (
                selectableMembers.map((m) => (
                  <label key={m.user_id} className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={selected.includes(m.user_id)}
                      onChange={() => toggleMember(m.user_id)}
                    />
                    <span>{m.username}</span>
                  </label>
                ))
              )}
            </div>
          )}

          <button type="submit" className="popup-button">
            Create Channel
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateChannelPopup;
