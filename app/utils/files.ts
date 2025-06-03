import { cuid } from "@adonisjs/core/helpers";

export const generatePendingPackageArchiveFileKey = () => 
  `pending/${cuid()}.tar.gz`;

export const packageArtifactKey = (scope: string, name: string, version: string) =>
  `package/${scope}/${name}/${version}.tar.gz`;

export const packageSourceFileKey = (scope: string, name: string, version: string, path: string) =>
  `source/${scope}/${name}/${version}/${path}`;