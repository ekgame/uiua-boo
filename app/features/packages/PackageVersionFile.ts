import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import PackageVersion from './PackageVersion.js'

export default class PackageVersionFile extends BaseModel {
  static table = 'package_version_file'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare packageVersionId: number

  @column()
  declare path: string

  @column()
  declare sizeBytes: number

  @column()
  declare fileKey: string|null

  @column()
  declare mimeType: string|null

  @column()
  declare isPreviewable: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => PackageVersion, {
    foreignKey: 'packageVersionId',
  })
  declare packageVersion: BelongsTo<typeof PackageVersion>
}
