const express = require("express");
const router = express.Router({ mergeParams: true });
const {
  createChannel,
  getMessages,
  markRead,
  getChannelMembers,
  updateChannelMembers,
} = require("../controllers/channelController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

router.route("/").post(createChannel);

router.get("/:channelId/messages", getMessages);

router.post("/:channelId/read", markRead);

router
  .route("/:channelId/members")
  .get(getChannelMembers)
  .put(updateChannelMembers);

module.exports = router;
