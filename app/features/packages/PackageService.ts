import Package from "./Package.js";
import Scope from "../scopes/Scope.js";
import { createPackageValidator } from "./validators.js";
import logger from "@adonisjs/core/services/logger";
import PackageVersion from "./PackageVersion.js";
import semver, { SemVer } from "semver";

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

    logger.info(`Package created: ${newPackage.reference}`);

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

  async getLatestStableVersion(targetPackage: Package): Promise<PackageVersion|null> {
    const versions = await targetPackage.versionMap();
    const stableVersions = Array.from(versions.keys()).filter((v) => !v.prerelease.length);
    if (stableVersions.length === 0) {
      return null;
    }

    const latestStableVersion = stableVersions.toSorted(semver.rcompare);
    return versions.get(latestStableVersion.shift()!)!;
  }

  async getLatestVersion(targetPackage: Package): Promise<PackageVersion|null> {
    const versions = await targetPackage.versionMap();
    const latestVersion = Array.from(versions.keys()).toSorted(semver.rcompare);
    return versions.get(latestVersion.shift()!)!;
  }
}

export default new PackageService();