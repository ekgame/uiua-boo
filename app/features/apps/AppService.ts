import PendingApp from "./PendingApp.js";
import { appPermissionsArraySchema, pendingAppSchema } from "./validators.js";
import { Infer } from "@vinejs/vine/types";
import { randomUUID } from "crypto";
import { DateTime, Duration } from "luxon";
import User from "../users/User.js";
import App from "./App.js";

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
      code: await this.generatePendingAppCode(),
      requestedPermissions: JSON.stringify(validated.requested_permissions),
      expiresAt: DateTime.local().plus(expirationTime),
    });

    return newPendingApp;
  }

  private async generatePendingAppCode(): Promise<string> {
    let code: string;

    do {
      code = randomUUID();
    } while (await PendingApp.findBy("code", code));

    return code;
  }

  private async generateAppToken(): Promise<string> {
    let token: string;
    do {
      token = randomUUID();
    } while (await App.findBy("token", token));
    return token;
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

  async removeExpiredApps(now: DateTime = DateTime.local()): Promise<number> {
    const expiredApps = await App.query()
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
  ): Promise<App> {
    const app = await App.create({
      userId: user.id,
      appName: pendingApp.appName,
      token: await this.generateAppToken(),
      permissions: pendingApp.requestedPermissions,
      expiresAt: DateTime.local().plus(expirationTime),
    });

    pendingApp.appId = app.id;
    pendingApp.status = 'APPROVED';
    await pendingApp.save();

    return app;
  }

  async denyPendingApp(pendingApp: PendingApp) {
    pendingApp.status = 'DENIED';
    await pendingApp.save();
  }
}

export default new AppService();