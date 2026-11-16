import {
  type Actor,
  type Quote,
  quoteInputSchema,
  type QuoteList,
  quoteListQuerySchema,
  quoteListSchema,
  quoteSchema,
} from "@greenquote/domain";
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { createZodDto } from "nestjs-zod";

import { CurrentUser } from "../auth/current-user.decorator.js";
import { QuotesService } from "./quotes.service.js";

class QuoteInputDto extends createZodDto(quoteInputSchema) {}
class QuoteDto extends createZodDto(quoteSchema) {}
class QuoteListQueryDto extends createZodDto(quoteListQuerySchema) {}
class QuoteListDto extends createZodDto(quoteListSchema) {}

@ApiTags("quotes")
@ApiCookieAuth()
@ApiUnauthorizedResponse({ description: "No valid session" })
@Controller("quotes")
export class QuotesController {
  constructor(private readonly quotes: QuotesService) {}

  @Get()
  @ApiOperation({
    summary: "List quotes",
    description:
      "Scoped by role: a user gets only their own quotes, an admin gets every quote. " +
      "Newest first. `q` matches the requesting user's and the applicant's name and email, ignoring case.",
  })
  @ApiOkResponse({
    type: QuoteListDto,
    description: "One page of quotes and the total number that match",
  })
  @ApiBadRequestResponse({
    description:
      "q longer than 100 characters, limit outside 1–100 or a negative offset",
  })
  findAll(
    @CurrentUser() actor: Actor,
    @Query() query: QuoteListQueryDto,
  ): Promise<QuoteList> {
    return this.quotes.listQuotes(actor, query);
  }

  @Post()
  @ApiCreatedResponse({
    type: QuoteDto,
    description: "The quote with its system price, risk band and three offers",
  })
  @ApiBadRequestResponse({
    description: "Invalid input, or a down payment above the system price",
  })
  create(
    @CurrentUser() actor: Actor,
    @Body() body: QuoteInputDto,
  ): Promise<Quote> {
    return this.quotes.createQuote(actor, body);
  }

  @Get(":id")
  @ApiParam({ name: "id", format: "uuid", description: "The quote's id" })
  @ApiOkResponse({ type: QuoteDto, description: "The quote with its offers" })
  @ApiBadRequestResponse({ description: "The id is not a UUID" })
  @ApiNotFoundResponse({
    description: "The quote does not exist or is not yours to see",
  })
  findOne(
    @CurrentUser() actor: Actor,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<Quote> {
    return this.quotes.getQuote(actor, id);
  }
}
