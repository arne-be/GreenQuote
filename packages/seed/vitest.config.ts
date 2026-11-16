import { containerTestTimeouts } from "@greenquote/config/vitest";
import { defineConfig } from "vitest/config";

export default defineConfig({ test: containerTestTimeouts });
