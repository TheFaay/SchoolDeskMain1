import { sql } from "drizzle-orm";

type Transaction = { execute: (query: ReturnType<typeof sql>) => Promise<unknown> };

/** Serialize score saves with publish/unpublish for the same class, session and term. */
export function lockClassTerm(tx: Transaction, classId: string, session: string, term: string) {
  return tx.execute(sql`select pg_advisory_xact_lock(hashtext(${classId}), hashtext(${`${session}:${term}`}))`);
}
