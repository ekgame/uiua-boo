import PendingApp from "./PendingApp.js";
import { appPermissionsArraySchema, pendingAppSchema } from "./validators.js";
import { Infer } from "@vinejs/vine/types";
import { randomUUID } from "crypto";
import { DateTime, Duration } from "luxon";

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
}

export default new AppService();