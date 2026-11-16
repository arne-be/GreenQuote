import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC = "isPublic";

/** Marks a route as reachable without a session; the session guard (added with auth) will skip these. */
export const Public = () => SetMetadata(IS_PUBLIC, true);
