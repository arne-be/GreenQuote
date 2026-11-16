import {
  type Actor,
  loginSchema,
  registerSchema,
  SESSION_COOKIE,
  type User,
  userSchema,
} from "@greenquote/domain";
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Res,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import type { CookieOptions, Response } from "express";
import { createZodDto } from "nestjs-zod";

import { errorResponse, noSessionResponse } from "../common/error-response.js";
import type { Env } from "../config/env.js";
import { AuthService } from "./auth.service.js";
import { CurrentUser } from "./current-user.decorator.js";
import { Public } from "./public.decorator.js";
import { SESSION_TTL_SECONDS } from "./session.js";

class RegisterDto extends createZodDto(registerSchema) {}
class LoginDto extends createZodDto(loginSchema) {}
class UserDto extends createZodDto(userSchema) {}

const userExample: User = {
  id: "0b7e4a52-3f0c-4a8e-9d55-6f1c2b9a7e10",
  fullName: "Ada Lovelace",
  email: "ada@test.com",
  role: "user",
};

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
  @ApiOperation({
    summary: "Register",
    description:
      "Creates a user with the `user` role and signs them in. The email is trimmed and lowercased.",
  })
  @ApiBody({
    type: RegisterDto,
    examples: {
      ada: {
        value: {
          fullName: "Ada Lovelace",
          email: "ada@test.com",
          password: "correct horse",
        },
      },
    },
  })
  @ApiCreatedResponse({
    type: UserDto,
    description: "Registered as a user and signed in (sets the session cookie)",
    example: userExample,
  })
  @ApiBadRequestResponse(
    errorResponse(
      HttpStatus.BAD_REQUEST,
      "Invalid full name, email or password",
      {
        statusCode: 400,
        message: "Validation failed",
        errors: [
          {
            code: "too_small",
            path: ["password"],
            message: "Use at least 8 characters",
          },
        ],
      },
    ),
  )
  @ApiConflictResponse(
    errorResponse(HttpStatus.CONFLICT, "The email is already registered", {
      statusCode: 409,
      message: "Email is already registered",
    }),
  )
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
  @ApiOperation({
    summary: "Sign in",
    description:
      "An unknown email and a wrong password get the same 401, so the response does not reveal who is registered.",
  })
  @ApiBody({
    type: LoginDto,
    examples: {
      ada: { value: { email: "ada@test.com", password: "correct horse" } },
    },
  })
  @ApiOkResponse({
    type: UserDto,
    description: "Signed in (sets the session cookie)",
    example: userExample,
  })
  @ApiBadRequestResponse(
    errorResponse(HttpStatus.BAD_REQUEST, "Malformed email or password", {
      statusCode: 400,
      message: "Validation failed",
      errors: [
        {
          code: "invalid_format",
          path: ["email"],
          message: "Enter a valid email address",
        },
      ],
    }),
  )
  @ApiUnauthorizedResponse(
    errorResponse(HttpStatus.UNAUTHORIZED, "Email or password is incorrect", {
      statusCode: 401,
      message: "Email or password is incorrect",
    }),
  )
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
  @ApiOperation({
    summary: "Sign out",
    description:
      "Clears the session cookie. Public, so a browser with an expired session can still clear it.",
  })
  @ApiNoContentResponse({ description: "Session cookie cleared" })
  logout(@Res({ passthrough: true }) response: Response): void {
    response.clearCookie(SESSION_COOKIE, this.cookieOptions());
  }

  @Get("me")
  @ApiCookieAuth()
  @ApiOperation({ summary: "Get the signed-in user" })
  @ApiOkResponse({
    type: UserDto,
    description: "The signed-in user",
    example: userExample,
  })
  @ApiUnauthorizedResponse(noSessionResponse)
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
