import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

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

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null;
}