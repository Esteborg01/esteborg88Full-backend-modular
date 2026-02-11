import express from "express";

const router = express.Router();

router.get("/health", async (req, res) => {
  return res.status(200).json({
    ok: true,
    service: "esteborg88full-backend-modular",
    time: new Date().toISOString(),
  });
});

export default router;
