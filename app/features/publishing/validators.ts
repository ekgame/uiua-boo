import PackageService from '#features/packages/PackageService';
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

const isValidPackage = vine.createRule(async (value: unknown, _: void, field: FieldContext) => {
  if (typeof value !== 'string' || !field.isValid) {
    return;
  }

  const resolvedPackage = await PackageService.getPackageByReference(value);
  if (!resolvedPackage) {
    field.report(`package "${value}" does not exist`, 'package', field);
    return;
  }
});

export const publishPackageValidator = vine.compile(
  vine.object({
    name: vine.string().use(isValidPackage()),
    version: vine.string().use(isSemver()).transform(t => semver.parse(t)!),
  }),
);
