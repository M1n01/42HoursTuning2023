import { getSessionBySessionId } from "../routes/session/repository";
import express from "express";

export const checkAuthMiddleware = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  // ログインAPIはチェックしない
  if (req.method === "POST" && req.path === "/api/v1/session") {
    return next();
  }

  try {
    if (req.cookies?.SESSION_ID === undefined) {
      res.status(401).json({ message: "Unauthorized" });
      console.warn("cookies or session id is empty");
      return;
    }

    const session = await getSessionBySessionId(req.cookies.SESSION_ID);
    if (!session) {
      res.status(401).json({ message: "Unauthorized" });
      console.warn("invalid session id is set");
      return;
    }

    req.headers["X-DA-USER-ID"] = session.userId;
    next();
  } catch (e) {
    next(e);
  }
};
