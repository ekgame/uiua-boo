import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('pending_app', (table) => {
      table.increments('id')
      table.integer('access_token_id').nullable().defaultTo(null)
      table.string('app_name').notNullable()
      table.string('private_code').notNullable()
      table.string('public_code').notNullable()
      table.text('requested_permissions').notNullable()
      table.enum('status', ['PENDING', 'APPROVED', 'DENIED']).defaultTo('PENDING')
      table.timestamp('expires_at').notNullable()
      table.timestamp('created_at')
    })
  }

  async down() {
    this.schema.dropTable('pending_app')
  }
}