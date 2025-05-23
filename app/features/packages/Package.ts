import { DateTime } from 'luxon'
import { afterCreate, BaseModel, beforeFetch, beforeFind, belongsTo, column, computed } from '@adonisjs/lucid/orm'
import Scope from '../scopes/Scope.js'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'

export default class Package extends BaseModel {
  static table = 'package'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare scopeId: number

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

  @computed()
  get identifier() {
    return `${this.scope.identifier}/${this.name}`;
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