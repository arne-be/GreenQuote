import type { Db } from "@greenquote/db";
import { QuoteService } from "@greenquote/domain/server";
import { Inject, Injectable } from "@nestjs/common";

import { DATABASE } from "../database.module.js";

@Injectable()
export class QuotesService extends QuoteService {
  constructor(@Inject(DATABASE) db: Db) {
    super(db);
  }
}
