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

//extracting payload from jwt and returning as a js object
const decodeToken = (token) => {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch (e) {
    return null;
  }
};

function App() {
  const [user, setUser] = useState(null); //stores currently logged in user info as object
  const [workspaces, setWorkspaces] = useState({}); //stores all workspaces user is part of
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState(null); //state for selected workspaceid
  const [currentChannelId, setCurrentChannelId] = useState(null); //state for selected channelid within a workspace
  const [messages, setMessages] = useState({}); //list of messages in the channel?
  const socket = useRef(null); //useRef to prevent rerender on socket connection
  const [toast, setToast] = useState(null); //state of toast popup
  //object of popup states for different popups
  const [popups, setPopups] = useState({
    user: false,
    invite: false,
    addChoice: false,
    addWorkspace: false,
    joinWorkspace: false,
    confirmDelete: false,
    renameWorkspace: false,
  });

  //triggers once on render, usefull for reloading the page and checking for logged in user using the jwt
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      handleLogin();
    }
  }, []);

  //triggers when there is change in user state
  useEffect(() => {
    if (user) {
      //establishing connection to the backend and setting the current attribute in the ref
      const SOCKET_URL =
        import.meta.env.VITE_API_URL || "http://localhost:3001";
      socket.current = io(SOCKET_URL, {
        auth: { token: localStorage.getItem("token") },
      });
      //on connection print connected
      socket.current.on("connect", () =>
        console.log("Socket connected:", socket.current.id)
      );
      //receiveMessage is a custom event with a newMessage property, which adds the new message to old list of messages from the same channelId
      socket.current.on("receiveMessage", (newMessage) => {
        setMessages((prev) => ({
          ...prev,
          //lhs[] is for key, rhs[] is for array
          [newMessage.channelId]: [
            ...(prev[newMessage.channelId] || []),
            newMessage,
          ],
        }));
      });
      //triggers when user logs out (cleanup code)
      return () => {
        console.log("Disconnecting socket...");
        socket.current.disconnect();
      };
    }
  }, [user]);

  //triggers when user switches between workspaces
  useEffect(() => {
    if (socket.current && currentWorkspaceId) {
      //joinWorkspace tells the socket which workspace the user is currently in
      socket.current.emit("joinWorkspace", currentWorkspaceId);
      fetchWorkspaceData(currentWorkspaceId);
    } else if (!currentWorkspaceId) {
      //sets the messages and channel to null if no workspace selected
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

      // Set the general channel as current, or the first one if it doesn't exist
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
      userId: user.id,
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
      // Re-fetch workspace data to get the updated channel list
      await fetchWorkspaceData(currentWorkspaceId);
      // Switch to the new channel
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
