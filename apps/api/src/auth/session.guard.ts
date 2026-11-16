import {
  SESSION_COOKIE,
  UnauthorisedError,
  userSchema,
} from "@greenquote/domain";
import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { z } from "zod";

import { IS_PUBLIC } from "./public.decorator.js";
import type { SessionRequest } from "./session.js";

const sessionPayloadSchema = z.object({
  sub: z.uuid(),
  role: userSchema.shape.role,
});

/** Global: every route needs a valid session cookie unless marked @Public(). */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<SessionRequest>();
    const token: unknown = request.cookies?.[SESSION_COOKIE];
    if (typeof token !== "string") throw new UnauthorisedError("Not signed in");

    // Bad signature, expiry and malformed tokens all end the same way: not signed in.
    const payload = await this.jwt.verifyAsync<object>(token).catch(() => null);
    const session = sessionPayloadSchema.safeParse(payload);
    if (!session.success) throw new UnauthorisedError("Not signed in");

    request.actor = { id: session.data.sub, role: session.data.role };
    return true;
  }
}
