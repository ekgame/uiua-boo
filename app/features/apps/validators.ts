import vine from '@vinejs/vine'

const appPermission = vine.group([
  vine.group.if((data) => data.type === 'update.package', {
    type: vine.literal('update.package'),
    scope: vine.string().maxLength(32),
    name: vine.string().maxLength(32).optional(),
    version: vine.string().maxLength(32).optional(),
  }),
]);

export const appPermissionSchema = vine
  .object({
    type: vine.enum([
      'update.package',
    ]),
  })
  .merge(appPermission);

export const appPermissionsArraySchema = vine.compile(
  vine.array(appPermissionSchema)
);

export const pendingAppSchema = vine.compile(
  vine.object({
    app_name: vine.string().minLength(2).maxLength(32),
    requested_permissions: vine.array(appPermissionSchema),
  }),
);
