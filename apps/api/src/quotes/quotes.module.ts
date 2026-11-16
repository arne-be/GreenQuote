import { Module } from "@nestjs/common";

import { QuoteListService } from "./quote-list.service.js";
import { QuotesController } from "./quotes.controller.js";
import { QuotesService } from "./quotes.service.js";

@Module({
  controllers: [QuotesController],
  providers: [QuotesService, QuoteListService],
})
export class QuotesModule {}
