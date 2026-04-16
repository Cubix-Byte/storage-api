import { Request, Response, NextFunction } from "express";
import { sendErrorResponse, HttpStatusCodes } from "../utils/shared-lib-imports";

/**
 * Middleware to verify secret key from request header
 * Expects secretKey in header: x-secret-key
 */
export const verifySecretKey = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const secretKey = process.env.SECRET_KEY;

  if (!secretKey) {
    return sendErrorResponse(
      res,
      "Secret key not configured",
      HttpStatusCodes.INTERNAL_SERVER_ERROR,
      {}
    );
  }

  const providedKey = req.headers["x-secret-key"] as string;

  if (!providedKey) {
    return sendErrorResponse(
      res,
      "Secret key is required in x-secret-key header",
      HttpStatusCodes.UNAUTHORIZED,
      {}
    );
  }

  if (providedKey !== secretKey) {
    return sendErrorResponse(
      res,
      "Invalid secret key",
      HttpStatusCodes.UNAUTHORIZED,
      {}
    );
  }

  next();
};

