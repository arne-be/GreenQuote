import {
  type Actor,
  DOWN_PAYMENT_ABOVE_SYSTEM_PRICE,
  MAX_QUOTE_PAGE_SIZE,
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
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBody,
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
import { errorResponse, noSessionResponse } from "../common/error-response.js";
import { QuotesService } from "./quotes.service.js";

class QuoteInputDto extends createZodDto(quoteInputSchema) {}
class QuoteDto extends createZodDto(quoteSchema) {}
class QuoteListQueryDto extends createZodDto(quoteListQuerySchema) {}
class QuoteListDto extends createZodDto(quoteListSchema) {}

const quoteInputExample = {
  fullName: "Ada Lovelace",
  email: "ada@test.com",
  address: "12 St James Square, London",
  monthlyConsumptionKwh: 450,
  systemSizeKw: 5,
  downPayment: 1000,
};

// Money in euros, apr as a fraction (0.069 is 6.9 %).
const quoteExample: Quote = {
  id: "5de0294b-9bb5-4b53-8eae-df3583f77588",
  createdAt: "2026-11-16T19:50:30.522Z",
  ...quoteInputExample,
  systemPrice: 6000,
  principal: 5000,
  riskBand: "A",
  apr: 0.069,
  offers: [
    { termYears: 5, apr: 0.069, principalUsed: 5000, monthlyPayment: 98.77 },
    { termYears: 10, apr: 0.069, principalUsed: 5000, monthlyPayment: 57.8 },
    { termYears: 15, apr: 0.069, principalUsed: 5000, monthlyPayment: 44.66 },
  ],
};

@ApiTags("quotes")
@ApiCookieAuth()
@ApiUnauthorizedResponse(noSessionResponse)
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
  @ApiBadRequestResponse(
    errorResponse(
      HttpStatus.BAD_REQUEST,
      `q longer than 100 characters, limit outside 1–${MAX_QUOTE_PAGE_SIZE} or a negative offset`,
      {
        statusCode: 400,
        message: "Validation failed",
        errors: [
          {
            code: "too_big",
            path: ["limit"],
            message: `Too big: expected number to be <=${MAX_QUOTE_PAGE_SIZE}`,
          },
        ],
      },
    ),
  )
  findAll(
    @CurrentUser() actor: Actor,
    @Query() query: QuoteListQueryDto,
  ): Promise<QuoteList> {
    return this.quotes.listQuotes(actor, query);
  }

  @Post()
  @ApiOperation({
    summary: "Request a quote",
    description:
      "Prices the inputs with the current pricing rules and stores the quote for the signed-in user. " +
      "The applicant can be someone else. Numbers may also be sent as strings.",
  })
  @ApiBody({
    type: QuoteInputDto,
    examples: { ada: { value: quoteInputExample } },
  })
  @ApiCreatedResponse({
    type: QuoteDto,
    description: "The quote with its system price, risk band and three offers",
    example: quoteExample,
  })
  @ApiBadRequestResponse(
    errorResponse(
      HttpStatus.BAD_REQUEST,
      "Invalid input, or a down payment above the system price",
      {
        statusCode: 400,
        message: "Validation failed",
        errors: [
          {
            code: "custom",
            path: ["downPayment"],
            message: DOWN_PAYMENT_ABOVE_SYSTEM_PRICE,
          },
        ],
      },
    ),
  )
  create(
    @CurrentUser() actor: Actor,
    @Body() body: QuoteInputDto,
  ): Promise<Quote> {
    return this.quotes.createQuote(actor, body);
  }

  @Get(":id")
  @ApiOperation({
    summary: "Get a quote",
    description:
      "Returns the quote to the user who requested it and to any admin. Anyone else gets 404, " +
      "the same as for an id that does not exist, so the response does not reveal which quote ids exist.",
  })
  @ApiParam({ name: "id", format: "uuid", description: "The quote's id" })
  @ApiOkResponse({
    type: QuoteDto,
    description: "The quote with its offers",
    example: quoteExample,
  })
  @ApiBadRequestResponse(
    errorResponse(HttpStatus.BAD_REQUEST, "The id is not a UUID", {
      statusCode: 400,
      message: "Validation failed (uuid is expected)",
      error: "Bad Request",
    }),
  )
  @ApiNotFoundResponse(
    errorResponse(
      HttpStatus.NOT_FOUND,
      "The quote does not exist or is not yours to see",
      { statusCode: 404, message: "Quote not found" },
    ),
  )
  findOne(
    @CurrentUser() actor: Actor,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<Quote> {
    return this.quotes.getQuote(actor, id);
  }
}
