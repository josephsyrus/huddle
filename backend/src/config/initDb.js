const db = require("./database");

const initDb = async () => {
  await db.query(
    `CREATE TABLE IF NOT EXISTS users (
      user_id SERIAL PRIMARY KEY,
      username VARCHAR(30) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )`
  );
  await db.query(
    `CREATE TABLE IF NOT EXISTS workspaces (
      workspace_id VARCHAR(32) PRIMARY KEY,
      workspace_name VARCHAR(50) NOT NULL,
      owner_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW()
    )`
  );
  await db.query(
    `CREATE TABLE IF NOT EXISTS workspace_members (
      user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
      workspace_id VARCHAR(32) REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, workspace_id)
    )`
  );
  await db.query(
    `CREATE TABLE IF NOT EXISTS channels (
      channel_id SERIAL PRIMARY KEY,
      channel_name VARCHAR(50) NOT NULL,
      workspace_id VARCHAR(32) REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
      is_dm BOOLEAN DEFAULT FALSE,
      is_private BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE (workspace_id, channel_name)
    )`
  );
  await db.query(
    `CREATE TABLE IF NOT EXISTS channel_members (
      user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
      channel_id INTEGER REFERENCES channels(channel_id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, channel_id)
    )`
  );
  await db.query(
    `CREATE TABLE IF NOT EXISTS messages (
      message_id SERIAL PRIMARY KEY,
      content TEXT NOT NULL,
      channel_id INTEGER REFERENCES channels(channel_id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
      sent_at TIMESTAMP DEFAULT NOW()
    )`
  );
  await db.query(
    `CREATE INDEX IF NOT EXISTS idx_messages_channel_id_message_id
     ON messages (channel_id, message_id DESC)`
  );
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
    `ALTER TABLE channels ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE`
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
