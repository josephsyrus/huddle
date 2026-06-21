import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import api from "./api";

import AuthPage from "./components/auth/AuthPage";
import WorkspaceSidebar from "./components/layout/WorkspaceSidebar";
import ChannelSidebar from "./components/layout/ChannelSidebar";
import Chat from "./components/chat/Chat";
import AddWorkspacePopup from "./components/ui/AddWorkspacePopup";
import InvitePeoplePopup from "./components/ui/InvitePeoplePopup";
import AddWorkspaceChoicePopup from "./components/ui/AddWorkspaceChoicePopup";
import JoinWorkspacePopup from "./components/ui/JoinWorkspacePopup";
import ConfirmDeletePopup from "./components/ui/ConfirmDeletePopup";
import RenameWorkspacePopup from "./components/ui/RenameWorkspacePopup";
import CreateChannelPopup from "./components/ui/CreateChannelPopup";
import ManageMembersPopup from "./components/ui/ManageMembersPopup";
import Toast from "./components/ui/Toast";

const decodeToken = (token) => {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch (e) {
    return null;
  }
};

function App() {
  const [user, setUser] = useState(null);
  const [workspaces, setWorkspaces] = useState({});
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState(null);
  const [currentChannelId, setCurrentChannelId] = useState(null);
  const [messages, setMessages] = useState({});
  const [hasMoreMessages, setHasMoreMessages] = useState({});
  const [typingUsers, setTypingUsers] = useState({});
  const [onlineUsers, setOnlineUsers] = useState({});
  const [unreadCounts, setUnreadCounts] = useState({});
  const [draftDm, setDraftDm] = useState(null);
  const socket = useRef(null);
  const currentChannelIdRef = useRef(null);
  const currentWorkspaceIdRef = useRef(null);
  const [toast, setToast] = useState(null);
  const [popups, setPopups] = useState({
    user: false,
    invite: false,
    addChoice: false,
    addWorkspace: false,
    joinWorkspace: false,
    confirmDelete: false,
    renameWorkspace: false,
    createChannel: false,
    manageMembers: false,
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      handleLogin();
    }
  }, []);

  useEffect(() => {
    if (user) {
      const SOCKET_URL = import.meta.env.VITE_API_URL || undefined;
      socket.current = io(SOCKET_URL, {
        auth: { token: localStorage.getItem("token") },
      });

      socket.current.on("connect", () => {
        if (currentWorkspaceIdRef.current) {
          socket.current.emit("joinWorkspace", currentWorkspaceIdRef.current);
        }
      });

      socket.current.on("receiveMessage", (newMessage) => {
        setMessages((prev) => ({
          ...prev,
          [newMessage.channelId]: [
            ...(prev[newMessage.channelId] || []),
            newMessage,
          ],
        }));

        if (newMessage.userId === user.username) return;
        if (newMessage.channelId === currentChannelIdRef.current) {
          markChannelRead(newMessage.channelId);
        } else {
          setUnreadCounts((prev) => ({
            ...prev,
            [newMessage.channelId]: (prev[newMessage.channelId] || 0) + 1,
          }));
        }
      });

      socket.current.on("messageEdited", (updated) => {
        setMessages((prev) => ({
          ...prev,
          [updated.channelId]: (prev[updated.channelId] || []).map((m) =>
            m.id === updated.id ? { ...m, ...updated } : m
          ),
        }));
      });

      socket.current.on(
        "reactionUpdated",
        ({ messageId, channelId, reactions }) => {
          setMessages((prev) => ({
            ...prev,
            [channelId]: (prev[channelId] || []).map((m) =>
              m.id === messageId ? { ...m, reactions } : m
            ),
          }));
        }
      );

      socket.current.on("messageDeleted", ({ id, channelId }) => {
        setMessages((prev) => ({
          ...prev,
          [channelId]: (prev[channelId] || []).map((m) =>
            m.id === id ? { ...m, deleted: true, text: null } : m
          ),
        }));
      });

      socket.current.on("userTyping", ({ channelId, username }) => {
        setTypingUsers((prev) => {
          const existing = prev[channelId] || [];
          if (existing.includes(username)) return prev;
          return { ...prev, [channelId]: [...existing, username] };
        });
      });

      socket.current.on("userStoppedTyping", ({ channelId, username }) => {
        setTypingUsers((prev) => ({
          ...prev,
          [channelId]: (prev[channelId] || []).filter((u) => u !== username),
        }));
      });

      socket.current.on("presenceUpdate", ({ workspaceId, onlineUserIds }) => {
        setOnlineUsers((prev) => ({ ...prev, [workspaceId]: onlineUserIds }));
      });

      socket.current.on(
        "dmOpened",
        ({ workspaceId, channel_id, other_user_id, other_username }) => {
          setWorkspaces((prev) => {
            const ws = prev[workspaceId];
            if (!ws) return prev;
            const dms = ws.dms || [];
            if (dms.some((d) => d.channel_id === channel_id)) return prev;
            const newDm = {
              channel_id,
              channel_name: other_username,
              otherUsername: other_username,
              otherUserId: other_user_id,
              isDm: true,
            };
            return { ...prev, [workspaceId]: { ...ws, dms: [...dms, newDm] } };
          });
          setMessages((prev) =>
            prev[channel_id] ? prev : { ...prev, [channel_id]: [] }
          );
        }
      );

      socket.current.on("channelCreated", ({ workspaceId, channel }) => {
        setWorkspaces((prev) => {
          const ws = prev[workspaceId];
          if (!ws) return prev;
          const channels = ws.channels || [];
          if (channels.some((c) => c.channel_id === channel.channel_id)) {
            return prev;
          }
          return {
            ...prev,
            [workspaceId]: {
              ...ws,
              channels: [...channels, { ...channel, messages: [], unread: 0 }],
            },
          };
        });
      });

      socket.current.on("channelMembersChanged", ({ workspaceId }) => {
        if (workspaceId === currentWorkspaceIdRef.current) {
          fetchWorkspaceData(workspaceId);
        }
      });

      socket.current.on("memberJoined", ({ workspaceId, member }) => {
        setWorkspaces((prev) => {
          const ws = prev[workspaceId];
          if (!ws) return prev;
          const existing = ws.members || [];
          if (existing.some((m) => m.user_id === member.user_id)) return prev;
          return {
            ...prev,
            [workspaceId]: { ...ws, members: [...existing, member] },
          };
        });
      });

      return () => {
        socket.current.disconnect();
      };
    }
  }, [user]);

  useEffect(() => {
    currentWorkspaceIdRef.current = currentWorkspaceId;
    setDraftDm(null);
    if (socket.current && currentWorkspaceId) {
      socket.current.emit("joinWorkspace", currentWorkspaceId);
      fetchWorkspaceData(currentWorkspaceId);
    } else if (!currentWorkspaceId) {
      setMessages({});
      setCurrentChannelId(null);
    }
  }, [currentWorkspaceId]);

  useEffect(() => {
    currentChannelIdRef.current = currentChannelId;
    if (currentChannelId) {
      setUnreadCounts((prev) => ({ ...prev, [currentChannelId]: 0 }));
      markChannelRead(currentChannelId);
    }
  }, [currentChannelId]);

  const fetchWorkspaces = async () => {
    try {
      const res = await api.get("/workspaces");
      const workspacesData = res.data.reduce((acc, ws) => {
        acc[ws.workspace_id] = {
          id: ws.workspace_id,
          name: ws.workspace_name,
          owner_id: ws.owner_id,
          initial: ws.workspace_name.substring(0, 1).toUpperCase(),
        };
        return acc;
      }, {});
      setWorkspaces(workspacesData);

      const workspaceIds = Object.keys(workspacesData);
      if (workspaceIds.length > 0) {
        if (!currentWorkspaceId || !workspacesData[currentWorkspaceId]) {
          setCurrentWorkspaceId(workspaceIds[0]);
        }
      } else {
        setCurrentWorkspaceId(null);
      }
    } catch (error) {
      console.error("Error fetching workspaces:", error);
    }
  };

  const fetchWorkspaceData = async (workspaceId) => {
    try {
      const res = await api.get(`/workspaces/${workspaceId}`);
      const fetchedWorkspace = res.data;

      const dms = (fetchedWorkspace.dms || []).map((d) => ({
        channel_id: d.channel_id,
        channel_name: d.other_username,
        otherUsername: d.other_username,
        otherUserId: d.other_user_id,
        isDm: true,
      }));

      setWorkspaces((prev) => ({
        ...prev,
        [workspaceId]: {
          ...prev[workspaceId],
          id: fetchedWorkspace.workspace_id,
          name: fetchedWorkspace.workspace_name,
          owner_id: fetchedWorkspace.owner_id,
          channels: fetchedWorkspace.channels,
          members: fetchedWorkspace.members,
          dms,
        },
      }));

      const messagesByChannel = {};
      fetchedWorkspace.channels.forEach((channel) => {
        messagesByChannel[channel.channel_id] = channel.messages;
      });
      (fetchedWorkspace.dms || []).forEach((dm) => {
        messagesByChannel[dm.channel_id] = dm.messages;
      });
      setMessages(messagesByChannel);

      const moreFlags = {};
      fetchedWorkspace.channels.forEach((c) => {
        moreFlags[c.channel_id] = (c.messages?.length || 0) >= 30;
      });
      (fetchedWorkspace.dms || []).forEach((d) => {
        moreFlags[d.channel_id] = (d.messages?.length || 0) >= 30;
      });
      setHasMoreMessages(moreFlags);

      const counts = {};
      fetchedWorkspace.channels.forEach((c) => {
        counts[c.channel_id] = c.unread || 0;
      });
      (fetchedWorkspace.dms || []).forEach((d) => {
        counts[d.channel_id] = d.unread || 0;
      });
      setUnreadCounts(counts);

      const accessibleIds = [
        ...fetchedWorkspace.channels.map((c) => c.channel_id),
        ...dms.map((d) => d.channel_id),
      ];
      const keepCurrent =
        currentChannelIdRef.current &&
        accessibleIds.includes(currentChannelIdRef.current);

      if (keepCurrent) {
        setCurrentChannelId(currentChannelIdRef.current);
      } else {
        const generalChannel = fetchedWorkspace.channels.find(
          (c) => c.channel_name === "general"
        );
        if (generalChannel) {
          setCurrentChannelId(generalChannel.channel_id);
        } else if (fetchedWorkspace.channels.length > 0) {
          setCurrentChannelId(fetchedWorkspace.channels[0].channel_id);
        } else {
          setCurrentChannelId(null);
        }
      }
    } catch (error) {
      console.error("Error fetching workspace data:", error);
    }
  };

  const handleLogin = () => {
    const token = localStorage.getItem("token");
    if (token) {
      const decodedUser = decodeToken(token);
      setUser(decodedUser);
      fetchWorkspaces();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setWorkspaces({});
    setCurrentWorkspaceId(null);
    setCurrentChannelId(null);
    setMessages({});
    setPopups({ ...popups, user: false });
  };

  const handleCreateWorkspace = async (name) => {
    try {
      const res = await api.post("/workspaces", { name });
      const newWorkspace = res.data;
      await fetchWorkspaces();
      setCurrentWorkspaceId(newWorkspace.workspace_id);
      setPopups({ ...popups, addWorkspace: false });
    } catch (error) {
      console.error("Error creating workspace:", error);
    }
  };

  const handleJoinWorkspace = async (workspaceId) => {
    try {
      await api.post("/workspaces/join", { workspaceId });
      await fetchWorkspaces();
      setCurrentWorkspaceId(workspaceId);
      setPopups({ ...popups, joinWorkspace: false });
    } catch (error) {
      setToast({
        message: error.response?.data?.message || "Could not join workspace.",
      });
    }
  };

  const handleRenameWorkspace = async (newName) => {
    try {
      await api.put(`/workspaces/${currentWorkspaceId}`, { name: newName });
      await fetchWorkspaces();
      await fetchWorkspaceData(currentWorkspaceId);
      setPopups({ ...popups, renameWorkspace: false });
    } catch (error) {
      console.error("Error renaming workspace:", error);
    }
  };

  const handleDeleteWorkspace = async () => {
    try {
      await api.delete(`/workspaces/${currentWorkspaceId}`);
      await fetchWorkspaces();
      setPopups({ ...popups, confirmDelete: false });
    } catch (error) {
      console.error("Error deleting workspace:", error);
    }
  };

  const handleSendMessage = async (messageText) => {
    if (!socket.current || !user || !currentWorkspaceId) return;

    if (draftDm) {
      try {
        const res = await api.post(`/workspaces/${currentWorkspaceId}/dm`, {
          userId: draftDm.otherUserId,
        });
        const channelId = res.data.channel_id;
        setWorkspaces((prev) => {
          const ws = prev[currentWorkspaceId];
          if (!ws) return prev;
          const dms = ws.dms || [];
          if (dms.some((d) => d.channel_id === channelId)) return prev;
          return {
            ...prev,
            [currentWorkspaceId]: {
              ...ws,
              dms: [
                ...dms,
                {
                  channel_id: channelId,
                  channel_name: draftDm.otherUsername,
                  otherUsername: draftDm.otherUsername,
                  otherUserId: draftDm.otherUserId,
                  isDm: true,
                },
              ],
            },
          };
        });
        setMessages((prev) =>
          prev[channelId] ? prev : { ...prev, [channelId]: [] }
        );
        setDraftDm(null);
        setCurrentChannelId(channelId);
        socket.current.emit("sendMessage", {
          content: messageText,
          channelId,
          workspaceId: currentWorkspaceId,
        });
      } catch (error) {
        setToast({
          message: error.response?.data?.message || "Could not send message.",
        });
      }
      return;
    }

    if (!currentChannelId) return;
    socket.current.emit("sendMessage", {
      content: messageText,
      channelId: currentChannelId,
      workspaceId: currentWorkspaceId,
    });
  };

  const handleEditMessage = (messageId, content) => {
    if (!socket.current || !currentWorkspaceId) return;
    socket.current.emit("editMessage", {
      messageId,
      content,
      channelId: currentChannelId,
      workspaceId: currentWorkspaceId,
    });
  };

  const handleDeleteMessage = (messageId) => {
    if (!socket.current || !currentWorkspaceId) return;
    socket.current.emit("deleteMessage", {
      messageId,
      channelId: currentChannelId,
      workspaceId: currentWorkspaceId,
    });
  };

  const handleOpenDm = (member) => {
    if (!currentWorkspaceId) return;
    const ws = workspaces[currentWorkspaceId];
    const existing = ws?.dms?.find((d) => d.otherUserId === member.user_id);
    if (existing) {
      setDraftDm(null);
      setCurrentChannelId(existing.channel_id);
    } else {
      setCurrentChannelId(null);
      setDraftDm({ otherUserId: member.user_id, otherUsername: member.username });
    }
    setPopups({ ...popups, user: false });
  };

  const handleToggleReaction = (messageId, emoji) => {
    if (!socket.current || !currentWorkspaceId) return;
    socket.current.emit("toggleReaction", {
      messageId,
      emoji,
      channelId: currentChannelId,
      workspaceId: currentWorkspaceId,
    });
  };

  const loadOlderMessages = async (channelId) => {
    const wsId = currentWorkspaceIdRef.current;
    const existing = messages[channelId] || [];
    if (!wsId || !channelId || existing.length === 0) return;

    try {
      const res = await api.get(
        `/workspaces/${wsId}/channels/${channelId}/messages`,
        { params: { before: existing[0].id, limit: 30 } }
      );
      const older = res.data.messages || [];
      if (older.length > 0) {
        setMessages((prev) => {
          const current = prev[channelId] || [];
          const seen = new Set(current.map((m) => m.id));
          const merged = [...older.filter((m) => !seen.has(m.id)), ...current];
          return { ...prev, [channelId]: merged };
        });
      }
      setHasMoreMessages((prev) => ({ ...prev, [channelId]: !!res.data.hasMore }));
    } catch (error) {
      console.error("Error loading older messages:", error);
    }
  };

  const markChannelRead = (channelId) => {
    const wsId = currentWorkspaceIdRef.current;
    if (!wsId || !channelId) return;
    api.post(`/workspaces/${wsId}/channels/${channelId}/read`).catch(() => {});
  };

  const handleSearch = async (query) => {
    if (!currentWorkspaceId) return [];
    try {
      const res = await api.get(`/workspaces/${currentWorkspaceId}/search`, {
        params: { q: query },
      });
      return res.data;
    } catch (error) {
      return [];
    }
  };

  const resolveChannelName = (result) => {
    const ws = workspaces[currentWorkspaceId];
    if (result.isDm) {
      const dm = ws?.dms?.find((d) => d.channel_id === result.channelId);
      return dm ? `@${dm.otherUsername}` : "Direct message";
    }
    return `#${result.channelName}`;
  };

  const handleTyping = (isTyping) => {
    if (!socket.current || !currentWorkspaceId || !currentChannelId) return;
    socket.current.emit(isTyping ? "startTyping" : "stopTyping", {
      workspaceId: currentWorkspaceId,
      channelId: currentChannelId,
    });
  };

  const handleCreateChannel = async (channelName, isPrivate, memberIds) => {
    if (!currentWorkspaceId) return;
    const sanitizedName = channelName.toLowerCase().replace(/\s+/g, "-");
    if (!sanitizedName) return;

    try {
      const res = await api.post(`/workspaces/${currentWorkspaceId}/channels`, {
        channelName: sanitizedName,
        isPrivate: !!isPrivate,
        memberIds: memberIds || [],
      });
      const newChannel = res.data;
      await fetchWorkspaceData(currentWorkspaceId);
      setCurrentChannelId(newChannel.channel_id);
      setPopups((p) => ({ ...p, createChannel: false }));
    } catch (error) {
      setToast({
        message: error.response?.data?.message || "Could not create channel.",
      });
    }
  };

  if (!user) {
    return <AuthPage onLogin={handleLogin} />;
  }

  const currentWorkspace = currentWorkspaceId
    ? workspaces[currentWorkspaceId]
    : null;
  let currentChannel =
    currentWorkspace?.channels?.find(
      (c) => c.channel_id === currentChannelId
    ) ||
    currentWorkspace?.dms?.find((d) => d.channel_id === currentChannelId);
  if (!currentChannel && draftDm) {
    currentChannel = {
      isDm: true,
      isDraft: true,
      channel_name: draftDm.otherUsername,
      otherUsername: draftDm.otherUsername,
    };
  }
  const messagesForCurrentChannel = currentChannelId
    ? messages[currentChannelId] || []
    : [];

  return (
    <div className="app-container">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <WorkspaceSidebar
        data={workspaces}
        currentWorkspaceId={currentWorkspaceId}
        onSelectWorkspace={setCurrentWorkspaceId}
        onAddWorkspace={() => setPopups({ ...popups, addChoice: true })}
      />
      <ChannelSidebar
        workspace={currentWorkspace}
        onSelectChannel={(channel) => {
          setDraftDm(null);
          setCurrentChannelId(channel.channel_id);
        }}
        onAddChannel={() => setPopups({ ...popups, createChannel: true })}
        currentChannelId={currentChannelId}
        user={user}
        onlineUserIds={onlineUsers[currentWorkspaceId] || []}
        unreadCounts={unreadCounts}
        onOpenDm={handleOpenDm}
        onManageMembers={() => setPopups({ ...popups, manageMembers: true })}
        draftDmUserId={draftDm?.otherUserId}
        isUserPopupVisible={popups.user}
        onLogout={handleLogout}
        onUserClick={() => setPopups({ ...popups, user: !popups.user })}
        onInviteClick={() => setPopups({ ...popups, invite: true })}
        onDeleteWorkspace={() => setPopups({ ...popups, confirmDelete: true })}
        onRenameWorkspace={() =>
          setPopups({ ...popups, renameWorkspace: true })
        }
      />
      <Chat
        workspace={currentWorkspace}
        channel={currentChannel}
        messages={messagesForCurrentChannel}
        hasMore={!!hasMoreMessages[currentChannelId]}
        onLoadOlder={() => loadOlderMessages(currentChannelId)}
        onSendMessage={handleSendMessage}
        onEditMessage={handleEditMessage}
        onDeleteMessage={handleDeleteMessage}
        onToggleReaction={handleToggleReaction}
        onSearch={handleSearch}
        onJumpToResult={(result) => setCurrentChannelId(result.channelId)}
        resolveChannelName={resolveChannelName}
        onTyping={handleTyping}
        typingUsers={(typingUsers[currentChannelId] || []).filter(
          (u) => u !== user.username
        )}
        user={user}
      />

      {popups.addChoice && (
        <AddWorkspaceChoicePopup
          onClose={() => setPopups({ ...popups, addChoice: false })}
          onChooseCreate={() =>
            setPopups({ ...popups, addChoice: false, addWorkspace: true })
          }
          onChooseJoin={() =>
            setPopups({ ...popups, addChoice: false, joinWorkspace: true })
          }
        />
      )}
      {popups.addWorkspace && (
        <AddWorkspacePopup
          onClose={() => setPopups({ ...popups, addWorkspace: false })}
          onCreate={handleCreateWorkspace}
        />
      )}
      {popups.joinWorkspace && (
        <JoinWorkspacePopup
          onClose={() => setPopups({ ...popups, joinWorkspace: false })}
          onJoin={handleJoinWorkspace}
        />
      )}
      {popups.invite && currentWorkspace && (
        <InvitePeoplePopup
          workspace={currentWorkspace}
          onClose={() => setPopups({ ...popups, invite: false })}
        />
      )}
      {popups.confirmDelete && currentWorkspace && (
        <ConfirmDeletePopup
          workspaceName={currentWorkspace.name}
          onConfirm={handleDeleteWorkspace}
          onClose={() => setPopups({ ...popups, confirmDelete: false })}
        />
      )}
      {popups.renameWorkspace && currentWorkspace && (
        <RenameWorkspacePopup
          currentWorkspaceName={currentWorkspace.name}
          onRename={handleRenameWorkspace}
          onClose={() => setPopups({ ...popups, renameWorkspace: false })}
        />
      )}
      {popups.createChannel && currentWorkspace && (
        <CreateChannelPopup
          members={currentWorkspace.members || []}
          currentUserId={user.id}
          onClose={() => setPopups({ ...popups, createChannel: false })}
          onCreate={handleCreateChannel}
        />
      )}
      {popups.manageMembers && currentWorkspace && currentChannel?.is_private && (
        <ManageMembersPopup
          workspaceId={currentWorkspaceId}
          channel={currentChannel}
          members={currentWorkspace.members || []}
          currentUserId={user.id}
          onClose={() => setPopups({ ...popups, manageMembers: false })}
          onError={(message) => setToast({ message })}
        />
      )}
    </div>
  );
}

export default App;
