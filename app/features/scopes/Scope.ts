import { DateTime } from 'luxon'
import { BaseModel, column, computed, hasMany, manyToMany } from '@adonisjs/lucid/orm'
import type { HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'
import User from '../users/User.js'
import Package from '../packages/Package.js'

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

  @hasMany(() => Package, {
    foreignKey: 'id_scope',
  })
  declare packages: HasMany<typeof Package>;

  @computed()
  get identifier() {
    return `@${this.name}`;
  }
}