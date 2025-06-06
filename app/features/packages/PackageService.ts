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

  async getPackageByReference(reference: string): Promise<Package|null> {
    const parts = reference.split('/');
    if (parts.length !== 2 || !parts[0].startsWith('@')) {
      return null;
    }

    const scope = parts[0].slice(1);
    const name = parts[1];

    return await this.getPackage(scope, name);
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

  async getPackageAndVersion(scope: string|null, name: string|null): Promise<{pack: Package|null, version: PackageVersion|null}> {
    if (!scope || !name) {
      return { pack: null, version: null };
    }

    const nameParts = name.split('@');
    let rawVersion = null;
    if (nameParts.length > 1) {
      name = nameParts[0];
      rawVersion = nameParts[1];
    }

    const pack = await Package.query()
      .where('name', name)
      .whereHas('scope', (query) => {
        query.where('name', scope);
      })
      .first();

    if (!pack) {
      return { pack: null, version: null };
    }

    let version: PackageVersion|null = null;
    if (rawVersion) {
      version = await pack.getVersionOrFail(rawVersion);
    } else {
      await pack.load('latestStableVersion');
      version = pack.latestStableVersion;
    }

    return { pack, version };
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