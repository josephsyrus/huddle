const db = require("../config/database");
const { isValidString, LIMITS } = require("../utils/validators");

const createChannel = async (req, res) => {
  const { workspaceId } = req.params;
  const { channelName } = req.body;
  const userId = req.user.id;

  if (!isValidString(channelName, LIMITS.channelName.min, LIMITS.channelName.max)) {
    return res
      .status(400)
      .json({ message: "Channel name must be 1-50 characters." });
  }

  try {
    await db.query("BEGIN");

    const memberCheck = await db.query(
      "SELECT * FROM workspace_members WHERE user_id = $1 AND workspace_id = $2",
      [userId, workspaceId]
    );
    if (memberCheck.rows.length === 0) {
      return res
        .status(403)
        .json({ message: "You are not a member of this workspace." });
    }

    // Create the new channel
    const newChannelResult = await db.query(
      "INSERT INTO channels (channel_name, workspace_id) VALUES ($1, $2) RETURNING channel_id, channel_name",
      [channelName, workspaceId]
    );
    const newChannel = newChannelResult.rows[0];

    // Since all channels are public, add all workspace members to the new channel
    const workspaceMembersResult = await db.query(
      "SELECT user_id FROM workspace_members WHERE workspace_id = $1",
      [workspaceId]
    );

    for (const member of workspaceMembersResult.rows) {
      await db.query(
        "INSERT INTO channel_members (user_id, channel_id) VALUES ($1, $2)",
        [member.user_id, newChannel.channel_id]
      );
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

module.exports = { createChannel };
