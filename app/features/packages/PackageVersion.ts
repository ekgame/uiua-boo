import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Package from './Package.js'

export default class PackageVersion extends BaseModel {
  static table = 'package_version'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare packageId: number

  @column()
  declare version: string

  @column()
  declare artifactFileKey: string|null

  @column()
  declare isYanked: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => Package, {
    foreignKey: 'packageId',
  })
  declare package: BelongsTo<typeof Package>
}