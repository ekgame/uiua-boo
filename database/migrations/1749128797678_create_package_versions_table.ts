import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'package_version'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table.integer('package_id').unsigned().notNullable()
      table.string('version').notNullable()
      table.string('artifact_file_key').nullable()
      table.boolean('is_yanked').defaultTo(false).notNullable()
      table.timestamp('created_at').notNullable()

      table.index(['package_id', 'version'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}