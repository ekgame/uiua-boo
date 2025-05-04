import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('package', (table) => {
      table.increments('id').primary()
      table.integer('id_scope').notNullable()

      table.string('name').notNullable()
      table.string('description', 255).notNullable().defaultTo('')
      table.boolean('is_archived').notNullable().defaultTo(false)

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable('package')
  }
}