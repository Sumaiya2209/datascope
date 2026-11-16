import { parseEnv } from "@neon/env";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import neonConfig from "../../../neon";
import * as schema from "./schema";

const {
  postgres: { databaseUrl },
} = parseEnv(neonConfig, ["DATABASE_URL"]);

export const client = postgres(databaseUrl);
export const db = drizzle(client, { schema });
