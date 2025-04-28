import { DateTime } from 'luxon'
import { BaseModel, column, manyToMany } from '@adonisjs/lucid/orm'
import type { ManyToMany } from '@adonisjs/lucid/types/relations';
import Scope from '#models/scope';
import type { UserRole } from '#types/user_role';

export default class User extends BaseModel {
  static table = 'user';

  @column({ isPrimary: true })
  declare id: number;

  @column()
  declare githubId: number;

  @column()
  declare githubName: string;

  @column()
  declare githubUsername: string;

  @column()
  declare email: string;

  @column()
  declare role: UserRole;

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null;

  @manyToMany(() => Scope, {
    pivotTable: 'scope_member',
    pivotForeignKey: 'user_id',
    pivotRelatedForeignKey: 'scope_id',
    pivotColumns: ['member_type'],
    pivotTimestamps: true,
  })
  declare scopes: ManyToMany<typeof Scope>;
}