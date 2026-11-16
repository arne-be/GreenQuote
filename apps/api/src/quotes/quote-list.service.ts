import type { Db } from "@greenquote/db";
import { QuoteListService as DomainQuoteListService } from "@greenquote/domain/server";
import { Inject, Injectable } from "@nestjs/common";

import { DATABASE } from "../database.module.js";

@Injectable()
export class QuoteListService extends DomainQuoteListService {
  constructor(@Inject(DATABASE) db: Db) {
    super(db);
  }
}
