/* =====================================================
   RESET PASSWORD ✅ parche fuerte: valida modifiedCount + logs
===================================================== */

router.post("/auth/reset", async (req, res) => {
  try {
    const { token, password } = req.body || {};

    if (!token || !password) {
      return res.status(400).json({ ok: false, error: "token_and_password_required" });
    }

    if (String(password).length < 8) {
      return res.status(400).json({ ok: false, error: "password_too_short" });
    }

    if (!requireJwtSecret(res)) return;

    let payload;
    try {
      payload = jwt.verify(String(token), process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ ok: false, error: "invalid_or_expired_token" });
    }

    if (payload?.type !== "pw_reset" || !payload?.sub) {
      return res.status(401).json({ ok: false, error: "invalid_token" });
    }

    const db = await getDb();
    const users = db.collection("users");

    const userIdStr = String(payload.sub);
    let userId;
    try {
      userId = new ObjectId(userIdStr);
    } catch {
      console.warn("[RESET] Invalid ObjectId in token sub:", userIdStr);
      return res.status(401).json({ ok: false, error: "invalid_token_sub" });
    }

    const user = await users.findOne({ _id: userId });
    if (!user) return res.status(404).json({ ok: false, error: "user_not_found" });

    console.log("[RESET] user:", String(user._id), user.email);

    const passwordHash = await bcrypt.hash(String(password), 12);

    // 1) Update por _id
    const r1 = await users.updateOne(
      { _id: userId },
      { $set: { passwordHash, updatedAt: new Date() } }
    );

    // 2) Backup: si por alguna razón no modificó, intenta por email (muy raro, pero útil)
    let r2 = null;
    if (!r1?.modifiedCount) {
      r2 = await users.updateOne(
        { email: String(user.email).toLowerCase().trim() },
        { $set: { passwordHash, updatedAt: new Date() } }
      );
    }

    console.log("[RESET] modifiedCount:", r1?.modifiedCount, "backup:", r2?.modifiedCount);

    if (!(r1?.modifiedCount || r2?.modifiedCount)) {
      return res.status(500).json({
        ok: false,
        error: "password_not_updated",
        message: "No se pudo actualizar passwordHash en Mongo.",
      });
    }

    // ✅ Token nuevo listo para auto-login
    const authToken = jwt.sign(
      { sub: String(user._id), email: user.email, plan: user.plan },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    // ✅ Mail “tu contraseña fue cambiada” (no bloquea)
    try {
      await sendPasswordChangedEmail({ toEmail: user.email });
    } catch (e) {
      console.warn("sendPasswordChangedEmail failed:", e?.message || e);
    }

    return res.json({ ok: true, token: authToken });
  } catch (err) {
    console.error("reset error:", err);
    return res.status(500).json({ ok: false, error: "internal_error" });
  }
});
