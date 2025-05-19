import { AccessToken } from "@adonisjs/auth/access_tokens";
import db from "@adonisjs/lucid/services/db";

export async function getAccessTokenById(id: number): Promise<AccessToken | null> {
  const dbRow = await db.query()
    .from('auth_access_token')
    .where('id', id)
    .first();

  if (!dbRow) {
    return null;
  }

  return new AccessToken({
    identifier: dbRow.id,
    tokenableId: dbRow.tokenable_id,
    type: dbRow.type,
    name: dbRow.name,
    hash: dbRow.hash,
    abilities: JSON.parse(dbRow.abilities),
    createdAt: typeof dbRow.created_at === "number" ? new Date(dbRow.created_at) : dbRow.created_at,
    updatedAt: typeof dbRow.updated_at === "number" ? new Date(dbRow.updated_at) : dbRow.updated_at,
    lastUsedAt: typeof dbRow.last_used_at === "number" ? new Date(dbRow.last_used_at) : dbRow.last_used_at,
    expiresAt: typeof dbRow.expires_at === "number" ? new Date(dbRow.expires_at) : dbRow.expires_at
  });
}