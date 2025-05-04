import Package from "#models/package";
import Scope from "#models/scope";
import { createPackageValidator } from "#validators/package";

class PackageService {
  async createPackage(scope: Scope, packageName: string): Promise<Package> {
    const { package_name } = await createPackageValidator.validate(
      { package_name: packageName },
      { meta: { scope: scope } },
    );

    const newPackage = await Package.create({
      name: package_name,
      id_scope: scope.id,
    });

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