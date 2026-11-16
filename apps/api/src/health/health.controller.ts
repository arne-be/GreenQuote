import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";

import { Public } from "../auth/public.decorator.js";

@ApiTags("health")
@Controller("health")
export class HealthController {
  @Public()
  @Get()
  @ApiOperation({ summary: "Check the API is up" })
  @ApiOkResponse({
    description:
      "The process is up (liveness only; the database is not checked)",
  })
  check() {
    return { status: "ok" };
  }
}
