import { InferInput } from "@vinejs/vine/types";
import { publishPackageValidator } from "./validators.js";
import PackageService from "#features/packages/PackageService";
import { Bouncer } from "@adonisjs/bouncer";
import User from "#features/users/User";
import PackagePolicy from "#features/packages/PackagePolicy";
import Package from "#features/packages/Package";
import { SemVer } from "semver";
import PackagePublishJobModel, { PackagePublishJobStatus } from "./PackagePublishJobModel.js";
import { ValidationError } from "#exceptions/ValidationError";
import semver from "semver";

class PublishService {
  public async validatePublishRequest(
    user: User,
    input: InferInput<typeof publishPackageValidator>,
  ): Promise<{ version: SemVer, package: Package }> {
    const data = await publishPackageValidator.validate(input);

    const targetPackage = await PackageService.getPackage(data.scope, data.name);
    if (!targetPackage) {
      throw new ValidationError(`Package "${data.scope}/${data.name}" does not exist, did you create the package?`);
    }

    await new Bouncer(user)
      .with(PackagePolicy)
      .authorize('publishVersion', targetPackage, data.version);

    const latestVersion = await PackageService.getLatestVersion(targetPackage);
    if (latestVersion && semver.eq(latestVersion.semver, data.version)) {
      throw new ValidationError(`Package "${data.scope}/${data.name}" already has published version '${data.version}'.`);
    } else if (latestVersion && semver.gt(latestVersion.semver, data.version)) {
      throw new ValidationError(`Package "${data.scope}/${data.name}" already has version '${latestVersion.semver}', which is newer than '${data.version}'.`);
    }

    if (await this.packageHasPublishJob(targetPackage)) {
      throw new ValidationError(`Package "${data.scope}/${data.name}" already has a pending publish job, please wait for it to complete.`);
    }
    
    return {
      version: data.version,
      package: targetPackage,
    };
  }

  public async packageHasPublishJob(requestedPackage: Package): Promise<boolean> {
    const job = await PackagePublishJobModel.query()
      .where('package_id', requestedPackage.id)
      .whereNotIn('status', [
        PackagePublishJobStatus.COMPLETED,
        PackagePublishJobStatus.FAILED,
      ])
      .first();

    return job !== null;
  }
}

export default new PublishService();