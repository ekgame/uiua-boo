import Package from './Package.js';
import Scope from '../scopes/Scope.js';
import vine, { SimpleMessagesProvider } from '@vinejs/vine'

export const createPackageValidator = vine
  .withMetaData<{
    scope: Scope,
  }>()
  .compile(
    vine.object({
      package_name: vine.string()
        .minLength(2)
        .maxLength(32)
        .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
        .unique(async (_db, value, field) => {
          const result = await Package.query()
            .where('name', value)
            .where('scope_id', field.meta.scope.id)
            .first();
          return result === null;
        }),
    })
  );

createPackageValidator.messagesProvider = new SimpleMessagesProvider({
  'package_name.required': 'Package name is required',
  'package_name.minLength': 'Package name must be at least {{ min }} characters long',
  'package_name.maxLength': 'Package name must be at most {{ max }} characters long',
  'package_name.regex': 'Package name can only contain lowercase letters, numbers, and dashes',
  'package_name.database.unique': 'This package already exists in this scope',
});