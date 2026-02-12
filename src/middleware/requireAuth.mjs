import jwt from "jsonwebtoken";

export function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ ok: false, error: "missing_token" });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ ok: false, error: "jwt_secret_missing" });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;

    return next();
  } catch (err) {
    return res.status(401).json({ ok: false, error: "invalid_token" });
  }
}
