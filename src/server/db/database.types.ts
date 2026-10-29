// Datenbanktypen: generiert in database.generated.ts (`npm run db:types`), hier nur Kurznamen.
export type { Database, Json } from "./database.generated";
import type { Database } from "./database.generated";

export type MemberRole = Database["public"]["Enums"]["member_role"];
export type AddressForm = Database["public"]["Enums"]["address_form"];
