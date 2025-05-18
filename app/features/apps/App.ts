import { BaseModel, column, hasOne } from "@adonisjs/lucid/orm"
import { DateTime } from "luxon"
import { parseJsonValidated } from "../../utils/validation.js"
import { appPermissionsArraySchema } from "./validators.js"
import User from "../users/User.js"
import type { HasOne } from "@adonisjs/lucid/types/relations"

export default class App extends BaseModel {
  public static table = 'app'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare appName: string

  @column()
  declare token: string

  /**
   * JSON array string of requested permissions.
   * See appPermissionsArraySchema in validators.ts
   */
  @column()
  declare permissions: string

  @column.dateTime()
  declare expiresAt: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @hasOne(() => User, {
    localKey: 'userId',
    foreignKey: 'id',
  })
  declare user: HasOne<typeof User>

  async permissionsArray() {
    return await parseJsonValidated(appPermissionsArraySchema, this.permissions)
  }
}

