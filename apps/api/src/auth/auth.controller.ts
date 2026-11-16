import {
  type Actor,
  loginSchema,
  registerSchema,
  SESSION_COOKIE,
  type User,
  userSchema,
} from "@greenquote/domain";
import { Body, Controller, Get, HttpCode, Post, Res } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import type { CookieOptions, Response } from "express";
import { createZodDto } from "nestjs-zod";

import type { Env } from "../config/env.js";
import { AuthService } from "./auth.service.js";
import { CurrentUser } from "./current-user.decorator.js";
import { Public } from "./public.decorator.js";
import { SESSION_TTL_SECONDS } from "./session.js";

class RegisterDto extends createZodDto(registerSchema) {}
class LoginDto extends createZodDto(loginSchema) {}
class UserDto extends createZodDto(userSchema) {}

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Public()
  @Post("register")
  @ApiCreatedResponse({
    type: UserDto,
    description: "Registered as a user and signed in (sets the session cookie)",
  })
  @ApiBadRequestResponse({
    description: "Invalid full name, email or password",
  })
  @ApiConflictResponse({ description: "The email is already registered" })
  async register(
    @Body() body: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<User> {
    const user = await this.auth.register(body);
    await this.startSession(response, user);
    return user;
  }

  @Public()
  @Post("login")
  @HttpCode(200)
  @ApiOkResponse({
    type: UserDto,
    description: "Signed in (sets the session cookie)",
  })
  @ApiBadRequestResponse({ description: "Malformed email or password" })
  @ApiUnauthorizedResponse({ description: "Email or password is incorrect" })
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<User> {
    const user = await this.auth.login(body);
    await this.startSession(response, user);
    return user;
  }

  // Public so an expired session can still be cleared.
  @Public()
  @Post("logout")
  @HttpCode(204)
  @ApiNoContentResponse({ description: "Session cookie cleared" })
  logout(@Res({ passthrough: true }) response: Response): void {
    response.clearCookie(SESSION_COOKIE, this.cookieOptions());
  }

  @Get("me")
  @ApiCookieAuth()
  @ApiOkResponse({ type: UserDto, description: "The signed-in user" })
  @ApiUnauthorizedResponse({ description: "No valid session" })
  me(@CurrentUser() actor: Actor): Promise<User> {
    return this.auth.getUser(actor);
  }

  private async startSession(response: Response, user: User): Promise<void> {
    const token = await this.jwt.signAsync({ sub: user.id, role: user.role });
    response.cookie(SESSION_COOKIE, token, {
      ...this.cookieOptions(),
      maxAge: SESSION_TTL_SECONDS * 1000,
    });
  }

  private cookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      sameSite: "lax",
      secure: this.config.get("NODE_ENV", { infer: true }) === "production",
      path: "/",
    };
  }
}
