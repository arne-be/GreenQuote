import { UnauthorisedError } from "@greenquote/domain";
import { createParamDecorator, type ExecutionContext } from "@nestjs/common";

import type { SessionRequest } from "./session.js";

/** The acting user set by SessionGuard; fails closed on a route without a session. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const { actor } = context.switchToHttp().getRequest<SessionRequest>();
    if (actor === undefined) throw new UnauthorisedError("Not signed in");
    return actor;
  },
);
