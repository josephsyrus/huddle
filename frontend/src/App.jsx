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
  const socket = useRef(null);
  const [toast, setToast] = useState(null);
  const [popups, setPopups] = useState({
    user: false,
    invite: false,
    addChoice: false,
    addWorkspace: false,
    joinWorkspace: false,
    confirmDelete: false,
    renameWorkspace: false,
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      handleLogin();
    }
  }, []);

  useEffect(() => {
    if (user) {
      const SOCKET_URL =
        import.meta.env.VITE_API_URL || "http://localhost:3001";
      socket.current = io(SOCKET_URL, {
        auth: { token: localStorage.getItem("token") },
      });

      socket.current.on("receiveMessage", (newMessage) => {
        setMessages((prev) => ({
          ...prev,
          [newMessage.channelId]: [
            ...(prev[newMessage.channelId] || []),
            newMessage,
          ],
        }));
      });

      socket.current.on("messageEdited", (updated) => {
        setMessages((prev) => ({
          ...prev,
          [updated.channelId]: (prev[updated.channelId] || []).map((m) =>
            m.id === updated.id ? updated : m
          ),
        }));
      });

      socket.current.on("messageDeleted", ({ id, channelId }) => {
        setMessages((prev) => ({
          ...prev,
          [channelId]: (prev[channelId] || []).map((m) =>
            m.id === id ? { ...m, deleted: true, text: null } : m
          ),
        }));
      });

      return () => {
        socket.current.disconnect();
      };
    }
  }, [user]);

  useEffect(() => {
    if (socket.current && currentWorkspaceId) {
      socket.current.emit("joinWorkspace", currentWorkspaceId);
      fetchWorkspaceData(currentWorkspaceId);
    } else if (!currentWorkspaceId) {
      setMessages({});
      setCurrentChannelId(null);
    }
  }, [currentWorkspaceId]);

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

      setWorkspaces((prev) => ({
        ...prev,
        [workspaceId]: {
          ...prev[workspaceId],
          id: fetchedWorkspace.workspace_id,
          name: fetchedWorkspace.workspace_name,
          owner_id: fetchedWorkspace.owner_id,
          channels: fetchedWorkspace.channels,
        },
      }));

      const messagesByChannel = {};
      fetchedWorkspace.channels.forEach((channel) => {
        messagesByChannel[channel.channel_id] = channel.messages;
      });
      setMessages(messagesByChannel);

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

  const handleSendMessage = (messageText) => {
    if (!socket.current || !user || !currentChannelId || !currentWorkspaceId)
      return;
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

  const handleCreateChannel = async (channelName) => {
    if (!currentWorkspaceId) return;
    const sanitizedName = channelName.toLowerCase().replace(/\s+/g, "-");
    if (!sanitizedName) return;

    try {
      const res = await api.post(`/workspaces/${currentWorkspaceId}/channels`, {
        channelName: sanitizedName,
      });
      const newChannel = res.data;
      await fetchWorkspaceData(currentWorkspaceId);
      setCurrentChannelId(newChannel.channel_id);
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
  const currentChannel = currentWorkspace?.channels?.find(
    (c) => c.channel_id === currentChannelId
  );
  const messagesForCurrentChannel = messages[currentChannelId] || [];

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
        onSelectChannel={(channel) => setCurrentChannelId(channel.channel_id)}
        onCreateChannel={handleCreateChannel}
        currentChannelId={currentChannelId}
        user={user}
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
        onSendMessage={handleSendMessage}
        onEditMessage={handleEditMessage}
        onDeleteMessage={handleDeleteMessage}
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
    </div>
  );
}

export default App;
