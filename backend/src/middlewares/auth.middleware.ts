import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { createError } from "./errorHandler";
import User from "../models/User.model";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: "student" | "mentor" | "admin";
    email: string;
  };
}

export const authenticate = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) throw createError("No token provided", 401);

    const secret = process.env.JWT_SECRET;
    if (!secret) throw createError("Server configuration error", 500);

    const decoded = jwt.verify(token, secret) as { id: string; role: string; email: string };
    const user = await User.findById(decoded.id).select("-password");
    if (!user || user.status === "suspended") throw createError("Unauthorized", 401);

    req.user = { id: decoded.id, role: decoded.role as "student" | "mentor" | "admin", email: decoded.email };
    next();
  } catch (error) {
    next(error);
  }
};

export const authorize = (...roles: string[]) =>
  (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(createError("Forbidden: insufficient permissions", 403));
    }
    next();
  };
