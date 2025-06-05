import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'package_version_file'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table.integer('package_version_id').notNullable()
      table.string('path').notNullable()
      table.string('file_key').nullable()
      table.string('mime_type').nullable()
      table.boolean('is_previewable').notNullable()
      table.timestamp('created_at').notNullable()

      table.index('package_version_id')
      table.index(['package_version_id', 'path'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}