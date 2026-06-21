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

  try {
    await db.query("BEGIN");

    const newChannelResult = await db.query(
      "INSERT INTO channels (channel_name, workspace_id, is_private) VALUES ($1, $2, $3) RETURNING channel_id, channel_name, is_private",
      [channelName, workspaceId, !!isPrivate]
    );
    const newChannel = newChannelResult.rows[0];

    if (isPrivate) {
      const wanted = Array.from(
        new Set([userId, ...(Array.isArray(memberIds) ? memberIds : [])])
      );
      const valid = await db.query(
        "SELECT user_id FROM workspace_members WHERE workspace_id = $1 AND user_id = ANY($2)",
        [workspaceId, wanted]
      );
      for (const row of valid.rows) {
        await db.query(
          "INSERT INTO channel_members (user_id, channel_id) VALUES ($1, $2)",
          [row.user_id, newChannel.channel_id]
        );
      }
    }

    await db.query("COMMIT");
    res.status(201).json(newChannel);
  } catch (error) {
    await db.query("ROLLBACK");
    if (error.code === "23505") {
      return res.status(409).json({
        message: "A channel with this name already exists in the workspace.",
      });
    }
    console.error("Error creating channel:", error);
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

module.exports = { createChannel, markRead };
