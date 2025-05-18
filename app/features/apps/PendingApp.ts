import { DateTime } from 'luxon'
import { BaseModel, beforeFind, column } from '@adonisjs/lucid/orm'
import { appPermissionsArraySchema } from './validators.js'
import { parseJsonValidated } from '../../utils/validation.js'
import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'

export type PendingAppStatus = 'PENDING' | 'APPROVED' | 'DENIED'

export default class PendingApp extends BaseModel {
  public static table = 'pending_app'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare appName: string

  @column()
  declare code: string

  /**
   * JSON array string of requested permissions.
   * See appPermissionsArraySchema in validators.ts
   */
  @column()
  declare requestedPermissions: string

  @column()
  declare status: PendingAppStatus

  @column.dateTime()
  declare expiresAt: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  async requestedPermissionsArray() {
    return await parseJsonValidated(appPermissionsArraySchema, this.requestedPermissions)
  }

  @beforeFind()
  static beforeFindHook(query: ModelQueryBuilderContract<typeof PendingApp>) {
    query.where('expires_at', '>', DateTime.now().toSQL());
  }
}

