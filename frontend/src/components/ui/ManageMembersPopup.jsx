import React, { useState, useEffect } from "react";
import api from "../../api";

const ManageMembersPopup = ({
  workspaceId,
  channel,
  members = [],
  currentUserId,
  onClose,
  onError,
}) => {
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .get(`/workspaces/${workspaceId}/channels/${channel.channel_id}/members`)
      .then((res) => {
        if (active) setSelected(res.data.map((m) => m.user_id));
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [workspaceId, channel.channel_id]);

  const toggle = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(
        `/workspaces/${workspaceId}/channels/${channel.channel_id}/members`,
        { memberIds: selected }
      );
      onClose();
    } catch (error) {
      onError?.(error.response?.data?.message || "Could not update members.");
      setSaving(false);
    }
  };

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-box" onClick={(e) => e.stopPropagation()}>
        <h1 className="popup-title">Members of #{channel.channel_name}</h1>
        {loading ? (
          <p className="member-select-empty">Loading…</p>
        ) : (
          <div className="member-select">
            {members.map((m) => {
              const isSelf = m.user_id === currentUserId;
              return (
                <label key={m.user_id} className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={selected.includes(m.user_id)}
                    disabled={isSelf}
                    onChange={() => toggle(m.user_id)}
                  />
                  <span>
                    {m.username}
                    {isSelf && " (you)"}
                  </span>
                </label>
              );
            })}
          </div>
        )}
        <button
          className="popup-button"
          onClick={handleSave}
          disabled={saving || loading}
        >
          {saving ? "Saving…" : "Save Members"}
        </button>
      </div>
    </div>
  );
};

export default ManageMembersPopup;
