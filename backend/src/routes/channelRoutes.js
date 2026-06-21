const express = require("express");
const router = express.Router({ mergeParams: true });
const {
  createChannel,
  markRead,
  getChannelMembers,
  updateChannelMembers,
} = require("../controllers/channelController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

router.route("/").post(createChannel);

router.post("/:channelId/read", markRead);

router
  .route("/:channelId/members")
  .get(getChannelMembers)
  .put(updateChannelMembers);

module.exports = router;
