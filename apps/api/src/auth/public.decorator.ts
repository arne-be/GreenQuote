import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC = "isPublic";

/** Marks a route as reachable without a session, so a forgotten guard fails closed. */
export const Public = () => SetMetadata(IS_PUBLIC, true);
