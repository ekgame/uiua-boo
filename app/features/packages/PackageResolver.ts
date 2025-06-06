import { errors } from "@adonisjs/core";
import Package from "./Package.js";
import PackageVersion from "./PackageVersion.js";
import semver from "semver";

export interface ResolvedPackage {
  pack: Package
  version: PackageVersion|null
  requestedVersion: string|null
}

export class PackageResolver {
  private requestedVersion: string|null = null;
  private requireExactVersion: boolean = false;
  private defaultToStable: boolean = false;
  private requireVersion: boolean = false;

  private constructor(
    private scope: string|null,
    private name: string|null,
  ) {}

  withVersion(version: string|null): this {
    this.requestedVersion = version;
    return this;
  }

  expectExactVersion(): this {
    this.requireExactVersion = true;
    return this;
  }

  defaultToStableVersion(): this {
    this.defaultToStable = true;
    return this;
  }

  expectVersion(): this {
    this.requireVersion = true;
    return this;
  }

  async resolve(): Promise<ResolvedPackage|null> {
    if (!this.scope || !this.name) {
      return null;
    }

    const scope = this.scope!;
    const name = this.name!;

    const pack = await Package.query()
      .where('name', name)
      .whereHas('scope', (query) => {
        query.where('name', scope);
      })
      .first();

    if (!pack) {
      return null;
    }

    const version = this.requestedVersion;
    if (version && this.requireExactVersion && !semver.valid(version)) {
      return null;
    }

    let packageVersion: PackageVersion|null = null;
    if (version && this.requireExactVersion) {
      packageVersion = await pack.getVersion(version);
    } else if (version && semver.validRange(version)) {
      if (semver.valid(version)) {
        // If the version is exact - just try to get it
        packageVersion = await pack.getVersion(version);
      } else if (semver.validRange(version)) {
        await pack.loadOnce('versions');
        const versionMap = await pack.versionMap();
        const availableVersions = Array.from(versionMap.keys())
          .filter(v => v.prerelease.length === 0 && semver.satisfies(v, version))
          .toSorted(semver.rcompare);

        if (availableVersions.length > 0) {
          packageVersion = versionMap.get(availableVersions[0]) || null;
        }
      }
    } else if (!version && this.defaultToStable) {
      await pack.loadOnce('latestStableVersion');
      packageVersion = pack.latestStableVersion || null;
    }

    if (!packageVersion && this.requireVersion) {
      return null;
    }

    return {
      pack,
      version: packageVersion,
      requestedVersion: this.requestedVersion,
    };
  }

  async resolveOrFail(): Promise<ResolvedPackage> {
    const result = await this.resolve();

    if (!result) {
      throw new errors.E_HTTP_EXCEPTION(
        `Package ${this.formatPackageReference()} not found`,
        { status: 404 },
      );
    }

    return result;
  }

  private formatPackageReference(): string {
    if (!this.scope || !this.name) {
      return '';
    }

    let reference = `@${this.scope}/${this.name}`;
    if (this.requestedVersion) {
      reference += `@${this.requestedVersion}`;
    }

    return reference;
  }

  static fromScopeAndName(scope: string|null, name: string|null): PackageResolver {
    return new PackageResolver(scope, name);
  }

  static fromScopeAndNameWithOptionalVersion(scope: string|null, name: string|null): PackageResolver {
    let resolver = new PackageResolver(scope, name);

    if (name) {
      const nameParts = name.split('@');
      let version = null;

      if (nameParts.length > 1) {
        name = nameParts[0];
        version = nameParts[1];
        resolver = new PackageResolver(scope, name)
          .withVersion(version);
      }
    }
      
    return resolver;
  }

  static fromReference(reference: string): PackageResolver {
    const parts = reference.split('/');
    if (parts.length !== 2 || !parts[0].startsWith('@')) {
      return new PackageResolver(null, null);
    }

    const scope = parts[0].slice(1);
    let name = parts[1];
    let version = null;

    const nameParts = name.split('@');
    if (nameParts.length > 1) {
      name = nameParts[0];
      version = nameParts[1];
    }

    return new PackageResolver(scope, name)
      .withVersion(version);
  }
}