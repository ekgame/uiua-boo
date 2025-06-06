import { DateTime } from 'luxon'
import { afterCreate, BaseModel, beforeFetch, beforeFind, belongsTo, column, computed, hasMany, hasOne } from '@adonisjs/lucid/orm'
import Scope from '../scopes/Scope.js'
import type { BelongsTo, HasMany, HasOne } from '@adonisjs/lucid/types/relations'
import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import PackageVersion from './PackageVersion.js'
import { SemVer } from 'semver'

export default class Package extends BaseModel {
  static table = 'package'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare scopeId: number

  @column()
  declare latestStableVersionId: number

  @column()
  declare name: string

  @column()
  declare description: string

  @column()
  declare isArchived: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Scope, {
    foreignKey: 'scopeId',
  })
  declare scope: BelongsTo<typeof Scope>

  @hasMany(() => PackageVersion, {
    foreignKey: 'packageId',
  })
  declare versions: HasMany<typeof PackageVersion>

  @hasOne(() => PackageVersion)
  declare latestStableVersion: HasOne<typeof PackageVersion>

  @computed()
  get reference() {
    return `@${this.fullName}`;
  }

  @computed()
  get fullName() {
    return `${this.scope.name}/${this.name}`;
  }

  async versionMap(): Promise<Map<SemVer, PackageVersion>> {
    await (this as Package).loadOnce('versions');
    const versionMap = new Map<SemVer, PackageVersion>();
    for (const version of this.versions) {
      versionMap.set(version.semver, version);
    }
    return versionMap;
  }

  @afterCreate()
  static async afterCreateHook(pack: Package) {
    // Eagerly load the related scope
    await pack.load('scope');
  }

  @beforeFind()
  static beforeFindHook(query: ModelQueryBuilderContract<typeof Package>) {
    // Eagerly load the related scope
    query.preload('scope');
  }

  @beforeFetch()
  static beforeFetchHook(query: ModelQueryBuilderContract<typeof Package>) {
    // Eagerly load the related scope
    query.preload('scope');
  }
}