const db = require("./database");

const initDb = async () => {
  await db.query(
    `ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP`
  );
  await db.query(
    `ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE`
  );
};

module.exports = { initDb };
