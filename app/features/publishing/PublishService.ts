import { Infer, InferInput } from "@vinejs/vine/types";
import { publishPackageValidator } from "./validators.js";
import PackageService from "#features/packages/PackageService";
import { Bouncer } from "@adonisjs/bouncer";
import User from "#features/users/User";
import PackagePolicy from "#features/packages/PackagePolicy";
import Package from "#features/packages/Package";
import { SemVer } from "semver";

class PublishService {
  public async validatePublishRequest(
    user: User,
    input: InferInput<typeof publishPackageValidator>,
  ): Promise<{ version: SemVer, package: Package }> {
    const data = await publishPackageValidator.validate(input);

    const targetPackage = await PackageService.getPackage(data.scope, data.name);
    if (!targetPackage) {
      throw new Error(`Package "${data.scope}/${data.name}" does not exist.`);
    }

    await new Bouncer(user)
      .with(PackagePolicy)
      .authorize('publish', targetPackage);

    // TODO: check if this or newer version already exists
    
    return {
      version: data.version,
      package: targetPackage,
    };
  }
}

export default new PublishService();