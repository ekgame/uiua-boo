import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('app', (table) => {
      table.increments('id')
      table.integer('user_id').notNullable()
      table.string('app_name').notNullable()
      table.string('token').notNullable()
      table.text('permissions').notNullable()
      table.timestamp('expires_at').notNullable()
      table.timestamp('created_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable('app')
  }
}