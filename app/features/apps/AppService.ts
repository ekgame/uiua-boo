import PendingApp from "./PendingApp.js";
import { appPermissionsArraySchema, pendingAppSchema } from "./validators.js";
import { Infer } from "@vinejs/vine/types";
import { DateTime, Duration } from "luxon";
import User from "../users/User.js";
import { cuid } from "@adonisjs/core/helpers";

class AppService {
  async createPendingApp(
    appName: string,
    requestedPermissions: Infer<typeof appPermissionsArraySchema>,
    expirationTime: Duration = Duration.fromObject({ minutes: 10 }),
  ): Promise<PendingApp> {
    const validated = await pendingAppSchema.validate({ 
      app_name: appName,
      requested_permissions: requestedPermissions
    });

    const newPendingApp = await PendingApp.create({
      appName: validated.app_name,
      privateCode: await this.generatePendingAppCode('private_code'),
      publicCode: await this.generatePendingAppCode('public_code'),
      requestedPermissions: JSON.stringify(validated.requested_permissions),
      expiresAt: DateTime.local().plus(expirationTime),
    });

    return newPendingApp;
  }

  private async generatePendingAppCode(key: 'private_code' | 'public_code'): Promise<string> {
    let code: string;

    do {
      code = cuid();
    } while (await PendingApp.findBy(key, code));

    return code;
  }

  async removeExpiredPendingApps(now: DateTime = DateTime.local()): Promise<number> {
    const expiredApps = await PendingApp.query()
      .where("expires_at", "<", now.toSQL()!);

    if (expiredApps.length === 0) {
      return 0;
    }

    for (const app of expiredApps) {
      await app.delete();
    }
    
    return expiredApps.length;
  }

  async approvePendingApp(
    pendingApp: PendingApp,
    user: User,
    expirationTime: Duration = Duration.fromObject({ minutes: 10 }),
  ): Promise<void> {
    const token = await User.accessTokens.create(
      user,
      await pendingApp.rawRequestedPermissionsArray(),
      {
        name: pendingApp.appName,
        expiresIn: expirationTime.as('seconds'),
      }
    );

    pendingApp.accessToken = token.value?.release()!;
    pendingApp.status = 'APPROVED';
    await pendingApp.save();
  }

  async denyPendingApp(pendingApp: PendingApp) {
    pendingApp.status = 'DENIED';
    await pendingApp.save();
  }
}

export default new AppService();