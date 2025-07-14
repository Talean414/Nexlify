import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { logger } from "../utils/logger";

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    logger.warn({
      context: "authMiddleware",
      message: "No token provided",
      url: req.url,
    });
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = decoded;
    next();
  } catch (err: any) {
    logger.error({
      context: "authMiddleware",
      error: err.message,
      details: err.stack,
      url: req.url,
    });
    res.status(401).json({ success: false, error: "Invalid token" });
  }
};