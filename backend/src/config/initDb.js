const db = require("./database");

const initDb = async () => {
  await db.query(
    `ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP`
  );
  await db.query(
    `ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE`
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
};

module.exports = { initDb };
