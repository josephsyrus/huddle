import React, { useState } from "react";

const InvitePeoplePopup = ({ workspace, onClose }) => {
  const [copyButtonText, setCopyButtonText] = useState("Copy ID");

  const handleCopy = () => {
    navigator.clipboard.writeText(workspace.id).then(() => {
      setCopyButtonText("Copied!");
      setTimeout(() => setCopyButtonText("Copy ID"), 2000);
    });
  };

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-box" onClick={(e) => e.stopPropagation()}>
        <h1 className="popup-title">Invite people to {workspace.name}</h1>
        <p className="invite-description">
          Share this ID with anyone you want to invite. They can use it to join
          this workspace.
        </p>
        <div className="invite-id-container">
          <p className="invite-id-display">{workspace.id}</p>
          <button onClick={handleCopy} className="copy-button">
            {copyButtonText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvitePeoplePopup;
