import type { Actor } from "@greenquote/domain";
import type { Request } from "express";

export const SESSION_COOKIE = "session";
export const SESSION_TTL_SECONDS = 24 * 60 * 60;

/** A request that passed the session guard. */
export type SessionRequest = Request & { actor?: Actor };
