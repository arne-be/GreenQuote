export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends DomainError {
  /** The input field at fault, in the same shape as a Zod issue's path. */
  constructor(
    message: string,
    readonly path?: string[],
  ) {
    super(message);
  }
}
export class UnauthorisedError extends DomainError {}
export class ForbiddenError extends DomainError {}
export class NotFoundError extends DomainError {}
export class ConflictError extends DomainError {}
