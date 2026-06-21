const db = require("../config/database");

const openDm = async (req, res) => {
  const { workspaceId } = req.params;
  const { userId: targetUserId } = req.body;
  const userId = req.user.id;

  if (!targetUserId || targetUserId === userId) {
    return res.status(400).json({ message: "A valid user is required." });
  }

  try {
    const members = await db.query(
      "SELECT user_id FROM workspace_members WHERE workspace_id = $1 AND user_id = ANY($2)",
      [workspaceId, [userId, targetUserId]]
    );
    if (members.rows.length < 2) {
      return res
        .status(403)
        .json({ message: "Both users must belong to the workspace." });
    }

    const dmName = `dm-${Math.min(userId, targetUserId)}-${Math.max(
      userId,
      targetUserId
    )}`;

    let channelResult = await db.query(
      "SELECT channel_id FROM channels WHERE workspace_id = $1 AND channel_name = $2 AND is_dm = TRUE",
      [workspaceId, dmName]
    );

    let channelId;
    if (channelResult.rows.length > 0) {
      channelId = channelResult.rows[0].channel_id;
    } else {
      await db.query("BEGIN");
      const created = await db.query(
        "INSERT INTO channels (channel_name, workspace_id, is_dm) VALUES ($1, $2, TRUE) RETURNING channel_id",
        [dmName, workspaceId]
      );
      channelId = created.rows[0].channel_id;
      await db.query(
        "INSERT INTO channel_members (user_id, channel_id) VALUES ($1, $2), ($3, $2)",
        [userId, channelId, targetUserId]
      );
      await db.query("COMMIT");
    }

    const otherUser = await db.query(
      "SELECT username FROM users WHERE user_id = $1",
      [targetUserId]
    );

    const io = req.app.get("io");
    if (io) {
      io.to(`user:${targetUserId}`).emit("dmOpened", {
        workspaceId,
        channel_id: channelId,
        other_user_id: userId,
        other_username: req.user.username,
      });
    }

    res.json({
      channel_id: channelId,
      other_user_id: targetUserId,
      other_username: otherUser.rows[0].username,
    });
  } catch (error) {
    await db.query("ROLLBACK").catch(() => {});
    console.error("Error opening DM:", error);
    res.status(500).json({ message: "Server error." });
  }
};

module.exports = { openDm };
