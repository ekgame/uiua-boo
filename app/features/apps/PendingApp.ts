import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import { appPermissionsArraySchema } from './validators.js'
import { parseJsonValidated } from '../../utils/validation.js'

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

  @column.dateTime()
  declare expiresAt: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  async requestedPermissionsArray() {
    return await parseJsonValidated(appPermissionsArraySchema, this.requestedPermissions)
  }
}

