import React, { useState } from "react";
import { HashIcon, UserIcon, AddUserIcon, ChevronDownIcon } from "../ui/Icons";
import UserPopup from "../ui/UserPopup";
import WorkspaceSettingsMenu from "../ui/WorkspaceSettingsMenu";

const ChannelSidebar = ({
  workspace,
  onSelectChannel,
  onCreateChannel,
  onUserClick,
  currentChannelId,
  user,
  onlineUserIds = [],
  unreadCounts = {},
  onOpenDm,
  isUserPopupVisible,
  onLogout,
  onInviteClick,
  onDeleteWorkspace,
  onRenameWorkspace,
}) => {
  const [newChannelName, setNewChannelName] = useState("");
  const [isSettingsMenuVisible, setSettingsMenuVisible] = useState(false);

  const handleCreateChannel = (e) => {
    e.preventDefault();
    if (newChannelName.trim()) {
      onCreateChannel(newChannelName.trim());
      setNewChannelName("");
    }
  };

  const handleDeleteClick = () => {
    setSettingsMenuVisible(false);
    onDeleteWorkspace();
  };

  const handleRenameClick = () => {
    setSettingsMenuVisible(false);
    onRenameWorkspace();
  };

  const isOwner = workspace && user && workspace.owner_id === user.id;

  return (
    <div className="channel-sidebar">
      {isUserPopupVisible && <UserPopup user={user} onLogout={onLogout} />}

      <div className="sidebar-header">
        {workspace ? (
          <>
            {isOwner ? (
              <div
                className="sidebar-header-clickable"
                onClick={() => setSettingsMenuVisible(!isSettingsMenuVisible)}
              >
                <h1>{workspace.name}</h1>
                <ChevronDownIcon />
              </div>
            ) : (
              <h1 className="non-owner-title">{workspace.name}</h1>
            )}
            <button
              className="invite-button"
              title="Invite people"
              onClick={onInviteClick}
            >
              <AddUserIcon />
            </button>
          </>
        ) : (
          <h1 className="non-owner-title">No Workspace</h1>
        )}
      </div>

      {isOwner && isSettingsMenuVisible && (
        <WorkspaceSettingsMenu
          onRenameClick={handleRenameClick}
          onDeleteClick={handleDeleteClick}
        />
      )}

      <div className="sidebar-content">
        {workspace && (
          <>
            <div className="sidebar-section">
              <h2>CHANNELS</h2>
              <ul className="channel-list">
                {workspace.channels?.map((channel) => {
                  const unread = unreadCounts[channel.channel_id] || 0;
                  return (
                    <li
                      key={channel.channel_id}
                      className={`channel-item ${
                        currentChannelId === channel.channel_id ? "active" : ""
                      }`}
                      onClick={() => onSelectChannel(channel)}
                    >
                      <HashIcon />
                      <span>{channel.channel_name}</span>
                      {unread > 0 && <span className="unread-badge">{unread}</span>}
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="create-channel-section">
              <form onSubmit={handleCreateChannel}>
                <input
                  type="text"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder="Create a channel"
                  className="create-channel-input"
                />
              </form>
            </div>
            {workspace.dms?.length > 0 && (
              <div className="sidebar-section">
                <h2>DIRECT MESSAGES</h2>
                <ul className="channel-list">
                  {workspace.dms.map((dm) => {
                    const unread = unreadCounts[dm.channel_id] || 0;
                    return (
                      <li
                        key={dm.channel_id}
                        className={`channel-item ${
                          currentChannelId === dm.channel_id ? "active" : ""
                        }`}
                        onClick={() => onSelectChannel(dm)}
                      >
                        <span
                          className={`status-dot ${
                            onlineUserIds.includes(dm.otherUserId)
                              ? "online"
                              : "offline"
                          }`}
                        />
                        <span>{dm.otherUsername}</span>
                        {unread > 0 && (
                          <span className="unread-badge">{unread}</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            {workspace.members?.length > 0 && (
              <div className="sidebar-section">
                <h2>MEMBERS</h2>
                <ul className="member-list">
                  {workspace.members.map((member) => {
                    const isOnline = onlineUserIds.includes(member.user_id);
                    const isSelf = member.user_id === user?.id;
                    return (
                      <li
                        key={member.user_id}
                        className={`member-item ${isSelf ? "" : "clickable"}`}
                        onClick={() => !isSelf && onOpenDm(member.user_id)}
                        title={isSelf ? undefined : `Message ${member.username}`}
                      >
                        <span
                          className={`status-dot ${
                            isOnline ? "online" : "offline"
                          }`}
                        />
                        <span>
                          {member.username}
                          {isSelf && " (you)"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </>
        )}
      </div>

      <div className="sidebar-footer" onClick={onUserClick}>
        <UserIcon />
        <span className="user-id" title={user?.username}>
          {user?.username}
        </span>
      </div>
    </div>
  );
};

export default ChannelSidebar;
