const db = require("../config/database");
const { nanoid } = require("nanoid");
const { isValidString, LIMITS } = require("../utils/validators");
const { formatMessage } = require("./messageController");

const getAccessibleChannelIds = async (workspaceId, userId) => {
  const result = await db.query(
    `SELECT channel_id FROM channels
     WHERE workspace_id = $1 AND is_dm = FALSE AND is_private = FALSE
     UNION
     SELECT cm.channel_id FROM channel_members cm
     JOIN channels c ON cm.channel_id = c.channel_id
     WHERE c.workspace_id = $1 AND cm.user_id = $2
       AND (c.is_dm = TRUE OR c.is_private = TRUE)`,
    [workspaceId, userId]
  );
  return result.rows.map((r) => r.channel_id);
};

const getWorkspaces = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await db.query(
      `SELECT w.workspace_id, w.workspace_name, w.owner_id 
       FROM workspaces w
       JOIN workspace_members wm ON w.workspace_id = wm.workspace_id
       WHERE wm.user_id = $1`,
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching workspaces:", error);
    res.status(500).json({ message: "Server error." });
  }
};

const createWorkspace = async (req, res) => {
  const { name } = req.body;
  const ownerId = req.user.id;

  if (!isValidString(name, LIMITS.workspaceName.min, LIMITS.workspaceName.max)) {
    return res
      .status(400)
      .json({ message: "Workspace name must be 1-50 characters." });
  }

  const workspaceId = `ws_${nanoid(12)}`;

  try {
    await db.query("BEGIN");

    const newWorkspaceResult = await db.query(
      "INSERT INTO workspaces (workspace_id, workspace_name, owner_id) VALUES ($1, $2, $3) RETURNING workspace_id, workspace_name",
      [workspaceId, name, ownerId]
    );
    const newWorkspace = newWorkspaceResult.rows[0];

    await db.query(
      "INSERT INTO workspace_members (user_id, workspace_id) VALUES ($1, $2)",
      [ownerId, workspaceId]
    );

    const generalChannelResult = await db.query(
      "INSERT INTO channels (channel_name, workspace_id) VALUES ($1, $2) RETURNING channel_id",
      ["general", workspaceId]
    );
    const generalChannelId = generalChannelResult.rows[0].channel_id;

    await db.query(
      "INSERT INTO channel_members (user_id, channel_id) VALUES ($1, $2)",
      [ownerId, generalChannelId]
    );

    await db.query("COMMIT");

    res.status(201).json(newWorkspace);
  } catch (error) {
    await db.query("ROLLBACK");
    console.error("Error creating workspace:", error);
    res.status(500).json({ message: "Server error." });
  }
};

const joinWorkspace = async (req, res) => {
  const { workspaceId } = req.body;
  const userId = req.user.id;

  if (!workspaceId) {
    return res.status(400).json({ message: "Workspace ID is required." });
  }

  try {
    await db.query("BEGIN");
    const workspaceResult = await db.query(
      "SELECT workspace_id FROM workspaces WHERE workspace_id = $1",
      [workspaceId]
    );
    if (workspaceResult.rows.length === 0) {
      return res.status(404).json({ message: "Workspace not found." });
    }

    const memberResult = await db.query(
      "SELECT * FROM workspace_members WHERE user_id = $1 AND workspace_id = $2",
      [userId, workspaceId]
    );
    if (memberResult.rows.length > 0) {
      return res
        .status(409)
        .json({ message: "You are already a member of this workspace." });
    }

    await db.query(
      "INSERT INTO workspace_members (user_id, workspace_id) VALUES ($1, $2)",
      [userId, workspaceId]
    );

    const generalChannelResult = await db.query(
      "SELECT channel_id FROM channels WHERE workspace_id = $1 AND channel_name = $2",
      [workspaceId, "general"]
    );
    if (generalChannelResult.rows.length > 0) {
      const generalChannelId = generalChannelResult.rows[0].channel_id;
      await db.query(
        "INSERT INTO channel_members (user_id, channel_id) VALUES ($1, $2)",
        [userId, generalChannelId]
      );
    }

    await db.query("COMMIT");

    res.status(200).json({ message: "Successfully joined workspace." });
  } catch (error) {
    await db.query("ROLLBACK");
    console.error("Error joining workspace:", error);
    res.status(500).json({ message: "Server error." });
  }
};

const renameWorkspace = async (req, res) => {
  const { workspaceId } = req.params;
  const { name } = req.body;
  const userId = req.user.id;

  if (!name) {
    return res.status(400).json({ message: "New name is required." });
  }

  try {
    const workspaceResult = await db.query(
      "SELECT owner_id FROM workspaces WHERE workspace_id = $1",
      [workspaceId]
    );
    if (workspaceResult.rows.length === 0) {
      return res.status(404).json({ message: "Workspace not found." });
    }

    if (workspaceResult.rows[0].owner_id !== userId) {
      return res
        .status(403)
        .json({ message: "Only the owner can rename the workspace." });
    }

    await db.query(
      "UPDATE workspaces SET workspace_name = $1 WHERE workspace_id = $2",
      [name, workspaceId]
    );

    res.status(200).json({ message: "Workspace renamed successfully." });
  } catch (error) {
    console.error("Error renaming workspace:", error);
    res.status(500).json({ message: "Server error." });
  }
};

const deleteWorkspace = async (req, res) => {
  const { workspaceId } = req.params;
  const userId = req.user.id;

  try {
    const workspaceResult = await db.query(
      "SELECT owner_id FROM workspaces WHERE workspace_id = $1",
      [workspaceId]
    );
    if (workspaceResult.rows.length === 0) {
      return res.status(204).send();
    }

    if (workspaceResult.rows[0].owner_id !== userId) {
      return res
        .status(403)
        .json({ message: "Only the owner can delete the workspace." });
    }

    await db.query("DELETE FROM workspaces WHERE workspace_id = $1", [
      workspaceId,
    ]);

    res.status(204).send();
  } catch (error) {
    console.error("Error deleting workspace:", error);
    res.status(500).json({ message: "Server error." });
  }
};

const getWorkspaceData = async (req, res) => {
  const { workspaceId } = req.params;
  const userId = req.user.id;

  try {
    const memberCheck = await db.query(
      "SELECT * FROM workspace_members WHERE user_id = $1 AND workspace_id = $2",
      [userId, workspaceId]
    );

    if (memberCheck.rows.length === 0) {
      return res
        .status(403)
        .json({ message: "You are not a member of this workspace." });
    }

    const workspaceResult = await db.query(
      "SELECT workspace_id, workspace_name, owner_id FROM workspaces WHERE workspace_id = $1",
      [workspaceId]
    );
    if (workspaceResult.rows.length === 0) {
      return res.status(404).json({ message: "Workspace not found." });
    }
    const workspace = workspaceResult.rows[0];

    const channelsResult = await db.query(
      `SELECT channel_id, channel_name, is_private FROM channels
       WHERE workspace_id = $1 AND is_dm = FALSE
         AND (is_private = FALSE OR channel_id IN (
           SELECT channel_id FROM channel_members WHERE user_id = $2
         ))`,
      [workspaceId, userId]
    );
    const channels = channelsResult.rows;

    const dmsResult = await db.query(
      `SELECT c.channel_id, ou.user_id AS other_user_id, ou.username AS other_username
       FROM channels c
       JOIN channel_members cm ON c.channel_id = cm.channel_id AND cm.user_id = $2
       JOIN channel_members ocm ON c.channel_id = ocm.channel_id AND ocm.user_id <> $2
       JOIN users ou ON ocm.user_id = ou.user_id
       WHERE c.workspace_id = $1 AND c.is_dm = TRUE`,
      [workspaceId, userId]
    );

    const membersResult = await db.query(
      `SELECT u.user_id, u.username FROM users u
       JOIN workspace_members wm ON u.user_id = wm.user_id
       WHERE wm.workspace_id = $1`,
      [workspaceId]
    );

    const accessibleIds = await getAccessibleChannelIds(workspaceId, userId);

    const messagesResult = await db.query(
      `SELECT m.message_id, m.content, m.channel_id, m.sent_at, m.edited_at, m.is_deleted, u.username
             FROM messages m
             JOIN users u ON m.user_id = u.user_id
             WHERE m.channel_id = ANY($1)
             ORDER BY m.sent_at ASC`,
      [accessibleIds]
    );

    const reactionsResult = await db.query(
      `SELECT mr.message_id, mr.emoji, COUNT(*)::int AS count, ARRAY_AGG(mr.user_id) AS user_ids
       FROM message_reactions mr
       WHERE mr.message_id IN (
         SELECT message_id FROM messages WHERE channel_id = ANY($1)
       )
       GROUP BY mr.message_id, mr.emoji`,
      [accessibleIds]
    );

    const reactionsByMessage = {};
    reactionsResult.rows.forEach((r) => {
      if (!reactionsByMessage[r.message_id]) reactionsByMessage[r.message_id] = [];
      reactionsByMessage[r.message_id].push({
        emoji: r.emoji,
        count: r.count,
        userIds: r.user_ids,
      });
    });

    const messagesByChannel = {};
    messagesResult.rows.forEach((msg) => {
      if (!messagesByChannel[msg.channel_id]) {
        messagesByChannel[msg.channel_id] = [];
      }
      const formatted = formatMessage(msg, msg.username);
      formatted.reactions = reactionsByMessage[formatted.id] || [];
      messagesByChannel[msg.channel_id].push(formatted);
    });

    const unreadResult = await db.query(
      `SELECT m.channel_id, COUNT(*)::int AS unread
       FROM messages m
       LEFT JOIN channel_read_status crs
         ON crs.channel_id = m.channel_id AND crs.user_id = $2
       WHERE m.channel_id = ANY($1)
         AND m.is_deleted = FALSE
         AND m.user_id <> $2
         AND m.sent_at > COALESCE(crs.last_read_at, to_timestamp(0))
       GROUP BY m.channel_id`,
      [accessibleIds, userId]
    );

    const unreadByChannel = {};
    unreadResult.rows.forEach((r) => {
      unreadByChannel[r.channel_id] = r.unread;
    });

    const response = {
      ...workspace,
      members: membersResult.rows,
      channels: channels.map((c) => ({
        ...c,
        messages: messagesByChannel[c.channel_id] || [],
        unread: unreadByChannel[c.channel_id] || 0,
      })),
      dms: dmsResult.rows.map((d) => ({
        ...d,
        messages: messagesByChannel[d.channel_id] || [],
        unread: unreadByChannel[d.channel_id] || 0,
      })),
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching workspace data:", error);
    res.status(500).json({ message: "Server error." });
  }
};

const searchMessages = async (req, res) => {
  const { workspaceId } = req.params;
  const { q } = req.query;
  const userId = req.user.id;

  if (!q || !q.trim()) {
    return res.json([]);
  }

  try {
    const accessibleIds = await getAccessibleChannelIds(workspaceId, userId);
    const result = await db.query(
      `SELECT m.message_id, m.content, m.channel_id, m.sent_at, u.username, c.channel_name, c.is_dm
       FROM messages m
       JOIN users u ON m.user_id = u.user_id
       JOIN channels c ON m.channel_id = c.channel_id
       WHERE m.is_deleted = FALSE
         AND m.content ILIKE $1
         AND m.channel_id = ANY($2)
       ORDER BY m.sent_at DESC
       LIMIT 50`,
      [`%${q.trim()}%`, accessibleIds]
    );

    res.json(
      result.rows.map((r) => ({
        id: r.message_id,
        text: r.content,
        username: r.username,
        channelId: r.channel_id,
        channelName: r.channel_name,
        isDm: r.is_dm,
        createdAt: r.sent_at,
      }))
    );
  } catch (error) {
    console.error("Error searching messages:", error);
    res.status(500).json({ message: "Server error." });
  }
};

module.exports = {
  getWorkspaces,
  createWorkspace,
  joinWorkspace,
  renameWorkspace,
  deleteWorkspace,
  getWorkspaceData,
  searchMessages,
};
