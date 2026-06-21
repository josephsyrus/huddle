const db = require("../config/database");
const { isValidString, LIMITS } = require("../utils/validators");

const formatMessage = (row, username) => ({
  id: row.message_id,
  text: row.is_deleted ? null : row.content,
  userId: username,
  createdAt: row.sent_at,
  channelId: row.channel_id,
  edited: !!row.edited_at,
  deleted: !!row.is_deleted,
  reactions: [],
});

const canAccessChannel = async (channelId, userId) => {
  const result = await db.query(
    `SELECT 1 FROM channels c
     WHERE c.channel_id = $1
       AND (
         (c.is_dm = FALSE AND c.is_private = FALSE AND EXISTS (
           SELECT 1 FROM workspace_members wm
           WHERE wm.workspace_id = c.workspace_id AND wm.user_id = $2
         ))
         OR EXISTS (
           SELECT 1 FROM channel_members cm
           WHERE cm.channel_id = c.channel_id AND cm.user_id = $2
         )
       )`,
    [channelId, userId]
  );
  return result.rows.length > 0;
};

const createMessage = async ({ content, channelId, userId }) => {
  if (!isValidString(content, LIMITS.message.min, LIMITS.message.max)) {
    return null;
  }
  if (!channelId || !userId) {
    return null;
  }
  if (!(await canAccessChannel(channelId, userId))) {
    return null;
  }
  try {
    const newMessageResult = await db.query(
      `INSERT INTO messages (content, channel_id, user_id)
       VALUES ($1, $2, $3)
       RETURNING message_id, content, channel_id, sent_at, user_id, edited_at, is_deleted`,
      [content.trim(), channelId, userId]
    );

    const newMessage = newMessageResult.rows[0];

    const userResult = await db.query(
      "SELECT username FROM users WHERE user_id = $1",
      [newMessage.user_id]
    );

    return formatMessage(newMessage, userResult.rows[0].username);
  } catch (error) {
    console.error("Error creating message:", error);
    return null;
  }
};

const editMessage = async ({ messageId, userId, content }) => {
  if (!isValidString(content, LIMITS.message.min, LIMITS.message.max)) {
    return null;
  }
  try {
    const existing = await db.query(
      "SELECT user_id FROM messages WHERE message_id = $1 AND is_deleted = FALSE",
      [messageId]
    );
    if (existing.rows.length === 0 || existing.rows[0].user_id !== userId) {
      return null;
    }

    const updated = await db.query(
      `UPDATE messages SET content = $1, edited_at = NOW()
       WHERE message_id = $2
       RETURNING message_id, content, channel_id, sent_at, user_id, edited_at, is_deleted`,
      [content.trim(), messageId]
    );

    const userResult = await db.query(
      "SELECT username FROM users WHERE user_id = $1",
      [userId]
    );

    return formatMessage(updated.rows[0], userResult.rows[0].username);
  } catch (error) {
    console.error("Error editing message:", error);
    return null;
  }
};

const deleteMessage = async ({ messageId, userId }) => {
  try {
    const existing = await db.query(
      "SELECT user_id, channel_id FROM messages WHERE message_id = $1",
      [messageId]
    );
    if (existing.rows.length === 0 || existing.rows[0].user_id !== userId) {
      return null;
    }

    await db.query(
      "UPDATE messages SET is_deleted = TRUE WHERE message_id = $1",
      [messageId]
    );

    return { id: messageId, channelId: existing.rows[0].channel_id };
  } catch (error) {
    console.error("Error deleting message:", error);
    return null;
  }
};

const getReactions = async (messageId) => {
  const result = await db.query(
    `SELECT emoji, COUNT(*)::int AS count, ARRAY_AGG(user_id) AS user_ids
     FROM message_reactions WHERE message_id = $1 GROUP BY emoji`,
    [messageId]
  );
  return result.rows.map((r) => ({
    emoji: r.emoji,
    count: r.count,
    userIds: r.user_ids,
  }));
};

const toggleReaction = async ({ messageId, userId, emoji }) => {
  if (!isValidString(emoji, 1, 32) || !messageId) {
    return null;
  }
  try {
    const message = await db.query(
      "SELECT channel_id FROM messages WHERE message_id = $1",
      [messageId]
    );
    if (message.rows.length === 0) {
      return null;
    }
    if (!(await canAccessChannel(message.rows[0].channel_id, userId))) {
      return null;
    }

    const inserted = await db.query(
      `INSERT INTO message_reactions (message_id, user_id, emoji)
       VALUES ($1, $2, $3)
       ON CONFLICT (message_id, user_id, emoji) DO NOTHING
       RETURNING reaction_id`,
      [messageId, userId, emoji]
    );

    if (inserted.rows.length === 0) {
      await db.query(
        "DELETE FROM message_reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3",
        [messageId, userId, emoji]
      );
    }

    return { messageId, reactions: await getReactions(messageId) };
  } catch (error) {
    console.error("Error toggling reaction:", error);
    return null;
  }
};

module.exports = {
  createMessage,
  editMessage,
  deleteMessage,
  toggleReaction,
  getReactions,
  formatMessage,
};
