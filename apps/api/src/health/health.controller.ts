import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";

import { Public } from "../auth/public.decorator.js";

@ApiTags("health")
@Controller("health")
export class HealthController {
  @Public()
  @Get()
  @ApiOkResponse({
    description:
      "The process is up (liveness only; the database is not checked)",
  })
  check() {
    return { status: "ok" };
  }
}
