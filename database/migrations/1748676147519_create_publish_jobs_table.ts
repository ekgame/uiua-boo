import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'package_publish_job'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      
      table.integer('package_id').unsigned().notNullable()
      table.string('version').notNullable()
      table.string('archive_file_name').nullable()
      table.string('status').notNullable()
      table.text('result').nullable()
      table.timestamp('processing_started_at').nullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}