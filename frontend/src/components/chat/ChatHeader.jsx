import React from "react";
import { HashIcon, UserIcon, LockIcon, UsersIcon } from "../ui/Icons";
import SearchBar from "./SearchBar";

const ChatHeader = ({
  channel,
  workspace,
  onSearch,
  onJumpToResult,
  resolveChannelName,
  onManageMembers,
}) => {
  const channelIcon = channel?.isDm ? (
    <UserIcon />
  ) : channel?.is_private ? (
    <LockIcon />
  ) : (
    <HashIcon />
  );

  return (
    <div className="chat-header">
      {workspace ? (
        <>
          <div className="chat-header-title">
            {channel ? (
              <>
                {channelIcon}
                <h2>{channel.channel_name}</h2>
                {channel.is_private && !channel.isDm && (
                  <button
                    className="manage-members-btn"
                    onClick={onManageMembers}
                    title="Manage members"
                  >
                    <UsersIcon />
                  </button>
                )}
              </>
            ) : (
              <h2>Select a channel</h2>
            )}
          </div>
          <SearchBar
            onSearch={onSearch}
            onSelect={onJumpToResult}
            resolveName={resolveChannelName}
          />
        </>
      ) : null}
    </div>
  );
};

export default ChatHeader;
