const db = require("../config/database");
const { isValidString, LIMITS } = require("../utils/validators");

const createMessage = async ({ content, channelId, userId }) => {
  if (!isValidString(content, LIMITS.message.min, LIMITS.message.max)) {
    return null;
  }
  if (!channelId || !userId) {
    return null;
  }
  try {
    const newMessageResult = await db.query(
      `INSERT INTO messages (content, channel_id, user_id) 
       VALUES ($1, $2, $3) 
       RETURNING message_id, content, channel_id, sent_at, user_id`,
      [content.trim(), channelId, userId]
    );

    const newMessage = newMessageResult.rows[0];

    const userResult = await db.query(
      "SELECT username FROM users WHERE user_id = $1",
      [newMessage.user_id]
    );
    const username = userResult.rows[0].username;

    return {
      id: newMessage.message_id,
      text: newMessage.content,
      userId: username,
      createdAt: newMessage.sent_at,
      channelId: newMessage.channel_id,
    };
  } catch (error) {
    console.error("Error creating message:", error);
    return null;
  }
};

module.exports = { createMessage };
