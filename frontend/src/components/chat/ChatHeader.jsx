import React from "react";
import { HashIcon, UserIcon, LockIcon, MenuIcon } from "../ui/Icons";
import SearchBar from "./SearchBar";

const ChatHeader = ({
  channel,
  workspace,
  onSearch,
  onJumpToResult,
  resolveChannelName,
  onToggleNav,
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
      <button
        className="nav-toggle-btn"
        title="Menu"
        onClick={onToggleNav}
        aria-label="Open menu"
      >
        <MenuIcon />
      </button>
      {workspace ? (
        <>
          <div className="chat-header-title">
            {channel ? (
              <>
                {channelIcon}
                <h2>{channel.channel_name}</h2>
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
