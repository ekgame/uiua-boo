import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, computed, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Package from './Package.js'
import PackageVersionFile from './PackageVersionFile.js'
import semver from 'semver'

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

  @hasMany(() => PackageVersionFile, {
    foreignKey: 'packageVersionId',
  })
  declare files: HasMany<typeof PackageVersionFile>

  @computed()
  get semver() {
    return semver.parse(this.version)!;
  }
}