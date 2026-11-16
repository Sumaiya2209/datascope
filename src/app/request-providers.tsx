import { connection } from "next/server";
import type { ReactNode } from "react";
import { Providers } from "@/lib/providers";

export async function RequestProviders({ children }: { children: ReactNode }) {
  await connection();
  return <Providers>{children}</Providers>;
}
