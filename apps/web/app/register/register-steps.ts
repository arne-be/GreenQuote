import type { RegisterInput } from "@greenquote/domain";

import type { Step } from "@/lib/steps";

export const registerSteps = [
  { id: "name", fields: ["fullName"] },
  { id: "email", fields: ["email"] },
  { id: "password", fields: ["password"] },
] as const satisfies Step<RegisterInput>[];
