import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class PendingApp extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare appName: string

  @column()
  declare code: string

  @column()
  declare requestedPermissions: string

  @column.dateTime()
  declare expiresAt: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime
}

