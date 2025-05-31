import vine from '@vinejs/vine'
import { FieldContext } from '@vinejs/vine/types';
import semver from 'semver';

const isSemver = vine.createRule((value: unknown, _: void, field: FieldContext) => {
  if (typeof value !== 'string' || !field.isValid) {
    return;
  }

  if (semver.parse(value) === null) {
    field.report('must be a valid semantic version', 'semver', field);
  }
});

export const publishPackageValidator = vine.compile(
  vine.object({
    scope: vine.string().minLength(2).maxLength(32),
    name: vine.string().minLength(2).maxLength(32),
    version: vine.string().use(isSemver()).transform(t => semver.parse(t)!),
  }),
);
