import { createZodDto } from "nestjs-zod";
import { z } from "zod";

// Documents the body DomainExceptionFilter and Nest send; the API never parses it.
const errorResponseSchema = z.object({
  statusCode: z.int().describe("The HTTP status code, repeated"),
  message: z.string().describe("What went wrong, readable by a person"),
  errors: z
    .array(
      z
        .object({
          code: z
            .string()
            .optional()
            .describe("The Zod issue code; absent when the domain rejects it"),
          path: z
            .array(z.union([z.string(), z.number()]))
            .describe("The field the error is about"),
          message: z.string(),
        })
        // A Zod issue keeps its other fields (origin, maximum, ...).
        .loose(),
    )
    .optional()
    .describe("Field errors; only on a 400 for an invalid body or query"),
  error: z
    .string()
    .optional()
    .describe(
      "The status text; only on Nest's own 400 for a malformed path id",
    ),
});

export class ErrorResponseDto extends createZodDto(errorResponseSchema) {}

/** Options for an `@Api...Response` decorator documenting one error status. */
export function errorResponse(
  description: string,
  example: z.infer<typeof errorResponseSchema>,
) {
  return { description, type: ErrorResponseDto, example };
}

export const noSessionResponse = errorResponse("No valid session", {
  statusCode: 401,
  message: "Not signed in",
});
