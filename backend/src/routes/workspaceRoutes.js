const express = require("express");
const router = express.Router();
const {
  getWorkspaces,
  createWorkspace,
  joinWorkspace,
  renameWorkspace,
  deleteWorkspace,
  getWorkspaceData,
} = require("../controllers/workspaceController");
const { openDm } = require("../controllers/dmController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

router.route("/").get(getWorkspaces).post(createWorkspace);

router.post("/join", joinWorkspace);

router.post("/:workspaceId/dm", openDm);

router
  .route("/:workspaceId")
  .get(getWorkspaceData)
  .put(renameWorkspace)
  .delete(deleteWorkspace);

module.exports = router;
