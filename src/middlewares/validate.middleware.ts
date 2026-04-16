import { Request, Response, NextFunction } from "express";
import { sendErrorResponse, HttpStatusCodes } from "../utils/shared-lib-imports";
import { ZodSchema } from "zod";

/**
 * Validation middleware for request body validation
 * Uses Zod schemas to validate incoming requests
 */
export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body - use passthrough to keep unknown fields
      const validatedData = (schema as any).passthrough().parse(req.body);
      // Merge validated data with original body to preserve all fields (especially for form-data)
      req.body = { ...req.body, ...validatedData };
      next();
    } catch (error: any) {
      const errorMessages = error.errors?.map((err: any) => ({
        field: err.path.join('.'),
        message: err.message
      })) || [{ message: 'Validation failed' }];

      return sendErrorResponse(
        res,
        "Validation failed",
        HttpStatusCodes.BAD_REQUEST,
        { errors: errorMessages }
      );
    }
  };
};

/**
 * Validation middleware for query parameters
 */
export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = schema.parse(req.query);
      req.query = validatedData;
      next();
    } catch (error: any) {
      const errorMessages = error.errors?.map((err: any) => ({
        field: err.path.join('.'),
        message: err.message
      })) || [{ message: 'Query validation failed' }];

      return sendErrorResponse(
        res,
        "Query validation failed",
        HttpStatusCodes.BAD_REQUEST,
        { errors: errorMessages }
      );
    }
  };
};

/**
 * Validation middleware for route parameters
 */
export const validateParams = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = schema.parse(req.params);
      req.params = validatedData;
      next();
    } catch (error: any) {
      const errorMessages = error.errors?.map((err: any) => ({
        field: err.path.join('.'),
        message: err.message
      })) || [{ message: 'Parameter validation failed' }];

      return sendErrorResponse(
        res,
        "Parameter validation failed",
        HttpStatusCodes.BAD_REQUEST,
        { errors: errorMessages }
      );
    }
  };
};
