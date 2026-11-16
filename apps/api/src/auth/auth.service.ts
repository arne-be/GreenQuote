import type { Db } from "@greenquote/db";
import { AuthService as DomainAuthService } from "@greenquote/domain/server";
import { Inject, Injectable } from "@nestjs/common";
import { hash, verify } from "@node-rs/argon2";

import { DATABASE } from "../database.module.js";

@Injectable()
export class AuthService extends DomainAuthService {
  constructor(@Inject(DATABASE) db: Db) {
    super(db, { hash, verify });
  }
}
