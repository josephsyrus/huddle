import React, { useState } from "react";
import {
  HashIcon,
  UserIcon,
  AddUserIcon,
  ChevronDownIcon,
  LockIcon,
  UsersIcon,
} from "../ui/Icons";
import UserPopup from "../ui/UserPopup";
import WorkspaceSettingsMenu from "../ui/WorkspaceSettingsMenu";

const ChannelSidebar = ({
  workspace,
  onSelectChannel,
  onAddChannel,
  onUserClick,
  currentChannelId,
  user,
  onlineUserIds = [],
  unreadCounts = {},
  onOpenDm,
  onManageMembers,
  draftDmUserId,
  isUserPopupVisible,
  onLogout,
  onInviteClick,
  onDeleteWorkspace,
  onRenameWorkspace,
}) => {
  const [isSettingsMenuVisible, setSettingsMenuVisible] = useState(false);

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
                  const isActive = currentChannelId === channel.channel_id;
                  return (
                    <li
                      key={channel.channel_id}
                      className={`channel-item ${isActive ? "active" : ""}`}
                      onClick={() => onSelectChannel(channel)}
                    >
                      {channel.is_private ? <LockIcon /> : <HashIcon />}
                      <span>{channel.channel_name}</span>
                      {isActive && channel.is_private && (
                        <button
                          className="channel-manage-btn"
                          title="Manage members"
                          onClick={(e) => {
                            e.stopPropagation();
                            onManageMembers();
                          }}
                        >
                          <UsersIcon />
                        </button>
                      )}
                      {unread > 0 && (
                        <span className="unread-badge">{unread}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
              <button className="add-channel-btn" onClick={onAddChannel}>
                + Create channel
              </button>
            </div>
            {workspace.members?.length > 0 && (
              <div className="sidebar-section">
                <h2>DIRECT MESSAGES</h2>
                <ul className="member-list">
                  {workspace.members.map((member) => {
                    const isOnline = onlineUserIds.includes(member.user_id);
                    const isSelf = member.user_id === user?.id;
                    const dm = workspace.dms?.find(
                      (d) => d.otherUserId === member.user_id
                    );
                    const unread = dm ? unreadCounts[dm.channel_id] || 0 : 0;
                    const isActive =
                      (dm && currentChannelId === dm.channel_id) ||
                      (!dm && draftDmUserId === member.user_id);
                    return (
                      <li
                        key={member.user_id}
                        className={`member-item ${isSelf ? "" : "clickable"} ${
                          isActive ? "active" : ""
                        }`}
                        onClick={() => !isSelf && onOpenDm(member)}
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
                        {unread > 0 && (
                          <span className="unread-badge">{unread}</span>
                        )}
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
