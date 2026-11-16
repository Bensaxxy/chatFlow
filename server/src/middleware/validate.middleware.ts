import type { RequestHandler } from "express";
import type { ZodType } from "zod";

export const validateBody = (schema: ZodType): RequestHandler => {
  return (request, _response, next) => {
    const result = schema.safeParse(request.body);

    if (!result.success) {
      next(result.error);
      return;
    }

    /*
     * Use Zod's validated and transformed values.
     * This applies trimming and email normalization.
     */
    request.body = result.data;

    next();
  };
};
