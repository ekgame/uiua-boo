import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('pending_app', (table) => {
      table.increments('id')
      table.string('app_name').notNullable()
      table.string('code').notNullable()
      table.text('requested_permissions').notNullable()
      table.timestamp('expires_at').notNullable()
      table.timestamp('created_at')
    })
  }

  async down() {
    this.schema.dropTable('pending_app')
  }
}