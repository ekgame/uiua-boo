import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('package', (table) => {
      table.increments('id').primary()
      table.integer('scope_id').notNullable()

      table.string('name').notNullable()
      table.string('description', 255).notNullable().defaultTo('')
      table.boolean('is_archived').notNullable().defaultTo(false)
      table.integer('latest_stable_version_id').nullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable('package')
  }
}