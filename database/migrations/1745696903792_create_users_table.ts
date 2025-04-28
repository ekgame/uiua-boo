import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('user', (table) => {
      table.increments('id').notNullable()
      table.integer('github_id').notNullable()
      table.string('github_name', 256).notNullable()
      table.string('github_username', 256).notNullable()
      table.string('email', 256).notNullable()
      table.enum('role', ['ADMIN', 'USER']).notNullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable('user')
  }
}