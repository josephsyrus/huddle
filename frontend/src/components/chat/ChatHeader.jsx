import React from "react";
import { HashIcon, UserIcon } from "../ui/Icons";
import SearchBar from "./SearchBar";

const ChatHeader = ({
  channel,
  workspace,
  onSearch,
  onJumpToResult,
  resolveChannelName,
}) => {
  return (
    <div className="chat-header">
      {workspace ? (
        <>
          <div className="chat-header-title">
            {channel ? (
              <>
                {channel.isDm ? <UserIcon /> : <HashIcon />}
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
