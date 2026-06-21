const db = require("./database");

const initDb = async () => {
  await db.query(
    `ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP`
  );
  await db.query(
    `ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE`
  );
  await db.query(
    `ALTER TABLE channels ADD COLUMN IF NOT EXISTS is_dm BOOLEAN DEFAULT FALSE`
  );
  await db.query(
    `CREATE TABLE IF NOT EXISTS message_reactions (
      reaction_id SERIAL PRIMARY KEY,
      message_id INTEGER REFERENCES messages(message_id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
      emoji VARCHAR(32) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(message_id, user_id, emoji)
    )`
  );
  await db.query(
    `CREATE TABLE IF NOT EXISTS channel_read_status (
      user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
      channel_id INTEGER REFERENCES channels(channel_id) ON DELETE CASCADE,
      last_read_at TIMESTAMP DEFAULT NOW(),
      PRIMARY KEY (user_id, channel_id)
    )`
  );
};

module.exports = { initDb };
