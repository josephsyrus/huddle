const db = require("../config/database");
const { isValidString, LIMITS } = require("../utils/validators");

const createChannel = async (req, res) => {
  const { workspaceId } = req.params;
  const { channelName, isPrivate, memberIds } = req.body;
  const userId = req.user.id;

  if (!isValidString(channelName, LIMITS.channelName.min, LIMITS.channelName.max)) {
    return res
      .status(400)
      .json({ message: "Channel name must be 1-50 characters." });
  }

  const memberCheck = await db.query(
    "SELECT 1 FROM workspace_members WHERE user_id = $1 AND workspace_id = $2",
    [userId, workspaceId]
  );
  if (memberCheck.rows.length === 0) {
    return res
      .status(403)
      .json({ message: "You are not a member of this workspace." });
  }

  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");

    const newChannelResult = await client.query(
      "INSERT INTO channels (channel_name, workspace_id, is_private) VALUES ($1, $2, $3) RETURNING channel_id, channel_name, is_private",
      [channelName, workspaceId, !!isPrivate]
    );
    const newChannel = newChannelResult.rows[0];

    let memberRows = [];
    if (isPrivate) {
      const wanted = Array.from(
        new Set([userId, ...(Array.isArray(memberIds) ? memberIds : [])])
      );
      const valid = await client.query(
        "SELECT user_id FROM workspace_members WHERE workspace_id = $1 AND user_id = ANY($2)",
        [workspaceId, wanted]
      );
      memberRows = valid.rows;
      for (const row of memberRows) {
        await client.query(
          "INSERT INTO channel_members (user_id, channel_id) VALUES ($1, $2)",
          [row.user_id, newChannel.channel_id]
        );
      }
    }

    await client.query("COMMIT");

    const io = req.app.get("io");
    if (io) {
      const payload = { workspaceId, channel: newChannel };
      if (isPrivate) {
        memberRows.forEach((row) =>
          io.to(`user:${row.user_id}`).emit("channelCreated", payload)
        );
      } else {
        io.to(workspaceId).emit("channelCreated", payload);
      }
    }

    res.status(201).json(newChannel);
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.code === "23505") {
      return res.status(409).json({
        message: "A channel with this name already exists in the workspace.",
      });
    }
    console.error("Error creating channel:", error);
    res.status(500).json({ message: "Server error." });
  } finally {
    client.release();
  }
};

const getChannelMembers = async (req, res) => {
  const { channelId } = req.params;
  const userId = req.user.id;

  try {
    const isMember = await db.query(
      "SELECT 1 FROM channel_members WHERE channel_id = $1 AND user_id = $2",
      [channelId, userId]
    );
    if (isMember.rows.length === 0) {
      return res.status(403).json({ message: "Not allowed." });
    }

    const result = await db.query(
      `SELECT u.user_id, u.username FROM users u
       JOIN channel_members cm ON u.user_id = cm.user_id
       WHERE cm.channel_id = $1`,
      [channelId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching channel members:", error);
    res.status(500).json({ message: "Server error." });
  }
};

const updateChannelMembers = async (req, res) => {
  const { workspaceId, channelId } = req.params;
  const { memberIds } = req.body;
  const userId = req.user.id;

  try {
    const channel = await db.query(
      "SELECT is_private, is_dm FROM channels WHERE channel_id = $1 AND workspace_id = $2",
      [channelId, workspaceId]
    );
    if (channel.rows.length === 0) {
      return res.status(404).json({ message: "Channel not found." });
    }
    if (!channel.rows[0].is_private || channel.rows[0].is_dm) {
      return res
        .status(400)
        .json({ message: "Only private channels have managed members." });
    }

    const isMember = await db.query(
      "SELECT 1 FROM channel_members WHERE channel_id = $1 AND user_id = $2",
      [channelId, userId]
    );
    if (isMember.rows.length === 0) {
      return res
        .status(403)
        .json({ message: "Only members can manage this channel." });
    }

    const requested = Array.isArray(memberIds) ? memberIds : [];
    const validRes = await db.query(
      "SELECT user_id FROM workspace_members WHERE workspace_id = $1 AND user_id = ANY($2)",
      [workspaceId, Array.from(new Set([...requested, userId]))]
    );
    const wanted = validRes.rows.map((r) => r.user_id);

    const currentRes = await db.query(
      "SELECT user_id FROM channel_members WHERE channel_id = $1",
      [channelId]
    );
    const current = currentRes.rows.map((r) => r.user_id);

    const toAdd = wanted.filter((id) => !current.includes(id));
    const toRemove = current.filter((id) => !wanted.includes(id));

    const client = await db.pool.connect();
    try {
      await client.query("BEGIN");
      for (const id of toAdd) {
        await client.query(
          "INSERT INTO channel_members (user_id, channel_id) VALUES ($1, $2)",
          [id, channelId]
        );
      }
      if (toRemove.length > 0) {
        await client.query(
          "DELETE FROM channel_members WHERE channel_id = $1 AND user_id = ANY($2)",
          [channelId, toRemove]
        );
      }
      await client.query("COMMIT");
    } catch (txError) {
      await client.query("ROLLBACK");
      throw txError;
    } finally {
      client.release();
    }

    const io = req.app.get("io");
    if (io) {
      const affected = Array.from(new Set([...current, ...wanted]));
      affected.forEach((id) =>
        io.to(`user:${id}`).emit("channelMembersChanged", { workspaceId, channelId })
      );
    }

    const updated = await db.query(
      `SELECT u.user_id, u.username FROM users u
       JOIN channel_members cm ON u.user_id = cm.user_id
       WHERE cm.channel_id = $1`,
      [channelId]
    );
    res.json(updated.rows);
  } catch (error) {
    console.error("Error updating channel members:", error);
    res.status(500).json({ message: "Server error." });
  }
};

const markRead = async (req, res) => {
  const { channelId } = req.params;
  const userId = req.user.id;

  try {
    await db.query(
      `INSERT INTO channel_read_status (user_id, channel_id, last_read_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id, channel_id) DO UPDATE SET last_read_at = NOW()`,
      [userId, channelId]
    );
    res.status(204).send();
  } catch (error) {
    console.error("Error marking channel read:", error);
    res.status(500).json({ message: "Server error." });
  }
};

module.exports = {
  createChannel,
  markRead,
  getChannelMembers,
  updateChannelMembers,
};
