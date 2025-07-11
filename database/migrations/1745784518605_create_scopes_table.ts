import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('scope', (table) => {
      table.increments('id').primary();
      table.string('name', 32).notNullable();

      table.timestamp('created_at');
      table.timestamp('updated_at');
    });

    this.schema.createTable('scope_member', (table) => {
      table.integer('scope_id').references('id').inTable('scope').onDelete('CASCADE');
      table.integer('user_id').references('id').inTable('user').onDelete('CASCADE');
      table.enum('member_type', ['OWNER', 'ADMIN', 'MEMBER']).notNullable();
  
      table.timestamp('created_at');
      table.timestamp('updated_at');

      table.primary(['scope_id', 'user_id']);
    });
  }

  async down() {
    this.schema.dropTable('scope');
    this.schema.dropTable('scope_member');
  }
}