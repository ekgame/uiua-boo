import { DateTime } from 'luxon'
import { BaseModel, column, manyToMany } from '@adonisjs/lucid/orm'
import type { ManyToMany } from '@adonisjs/lucid/types/relations'
import User from './user.js'

export default class Scope extends BaseModel {
  static table = 'scope'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @manyToMany(() => User, {
    pivotTable: 'scope_member',
    pivotForeignKey: 'scope_id',
    pivotRelatedForeignKey: 'user_id',
    pivotColumns: ['member_type'],
    pivotTimestamps: true,
  })
  declare members: ManyToMany<typeof User>;
}