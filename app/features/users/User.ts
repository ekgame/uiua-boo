import { DateTime } from 'luxon'
import { BaseModel, column, manyToMany } from '@adonisjs/lucid/orm'
import type { ManyToMany } from '@adonisjs/lucid/types/relations';
import Scope from '../scopes/Scope.js';
import type { UserRole } from './UserRole.js';
import { AccessToken, DbAccessTokensProvider } from '@adonisjs/auth/access_tokens'

export default class User extends BaseModel {
  static table = 'user';

  static accessTokens = DbAccessTokensProvider.forModel(User, {
    prefix: 'boo_',
    table: 'auth_access_token',
  })

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

  currentAccessToken?: AccessToken;
}