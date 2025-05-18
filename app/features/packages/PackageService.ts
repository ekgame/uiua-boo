import Package from "./Package.js";
import Scope from "../scopes/Scope.js";
import { createPackageValidator } from "./validators.js";
import logger from "@adonisjs/core/services/logger";

class PackageService {
  async createPackage(scope: Scope, packageName: string): Promise<Package> {
    const { package_name } = await createPackageValidator.validate(
      { package_name: packageName },
      { meta: { scope: scope } },
    );

    const newPackage = await Package.create({
      name: package_name,
      scopeId: scope.id,
    });

    logger.info(`Package created: ${newPackage.identifier}`);

    return newPackage;
  }

  async getPackage(scope: string|null, name: string|null): Promise<Package|null> {
    if (!scope || !name) {
      return null;
    }

    return await Package.query()
      .where('name', name)
      .whereHas('scope', (query) => {
        query.where('name', scope);
      })
      .first();
  }
}

export default new PackageService();