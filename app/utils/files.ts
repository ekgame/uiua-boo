import { cuid } from "@adonisjs/core/helpers";
import NodeBuffer, { Buffer } from "node:buffer";
import { Mime } from 'mime';
import standardTypes from 'mime/types/standard.js';
import PackageVersionFile from "#features/packages/PackageVersionFile";
import PackageVersion from "#features/packages/PackageVersion";
import router from "@adonisjs/core/services/router";

const mime = new Mime(standardTypes);
mime.define({ 'application/uiua': ['ua'] }, true);

export const generatePendingPackageArchiveFileKey = () =>
  `pending/${cuid()}.tar.gz`;

export const packageArtifactKey = (name: string, version: string) =>
  `artifact/${name}/${version}.tar.gz`;

export const packagePreviewFileKey = (name: string, version: string, path: string) =>
  `preview/${name}/${version}/${path}`;

export const resolveFileInfo = (buffer: Buffer<ArrayBufferLike>, fileName: string) => {
  const canPreview = 
    buffer.length <= 1024 * 1024  // 1 MB limit for previewable files
    && NodeBuffer.isUtf8(buffer); // Can only preview plaintext files

  return {
    canPreview,
    mimeType: mime.getType(fileName),
  }
}

export class PackageFileNode {
  name: string;
  children: PackageFileNode[];
  file?: PackageVersionFile | null;
  parent: PackageFileNode | null;

  constructor(name: string, parent: PackageFileNode | null, file: PackageVersionFile | null = null) {
    this.name = name;
    this.children = [];
    this.file = file;
    this.parent = parent;
  }

  get isDirectory(): boolean {
    return this.file === null;
  }

  get isFile(): boolean {
    return this.file !== null;
  }

  get displayName(): string {
    if (this.name === '') {
      return 'Package root';
    }

    return this.name;
  }

  sortChildren(): void {
    this.children.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });

    for (const child of this.children) {
      child.sortChildren();
    }
  }

  get path(): string {
    if (this.parent === null) {
      return '';
    }

    return `${this.parent.path}/${this.name}`;
  }

  get ancestors(): PackageFileNode[] {
    const ancestors: PackageFileNode[] = [];
    let current: PackageFileNode | null = this.parent;

    while (current) {
      ancestors.unshift(current);
      current = current.parent;
    }

    return ancestors;
  }
}

export class PackageFileSystem {
  private root: PackageFileNode;
  private version: PackageVersion;

  constructor(version: PackageVersion) {
    this.version = version;
    this.root = new PackageFileNode('', null);
  }

  public addFile(file: PackageVersionFile): void {
    const pathParts = file.path.split('/');
    const fileName = pathParts.pop()!;

    let currentNode = this.root;
    for (const part of pathParts) {
      let childNode = currentNode.children.find(child => child.name === part && child.isDirectory);
      if (!childNode) {
        childNode = new PackageFileNode(part, currentNode);
        currentNode.children.push(childNode);
      }
      currentNode = childNode;
    }

    currentNode.children.push(new PackageFileNode(fileName, currentNode, file));
  }

  public addFiles(files: PackageVersionFile[]): void {
    for (const file of files) {
      this.addFile(file);
    }
  }

  public async finalize() {
    await this.version.loadOnce('pack');
    this.root.sortChildren();
  }

  public resolveFile(path: string): PackageFileNode | null {
    if (path === '') {
      return this.root;
    }

    const pathParts = path.split('/');
    let currentNode: PackageFileNode | null = this.root;

    for (const part of pathParts) {
      if (!currentNode) {
        return null;
      }
      currentNode = currentNode.children.find(child => child.name === part) || null;
    }

    return currentNode;
  }

  public generateFileUrl(fileNode: PackageFileNode): string {
    const rootUrl = router.makeUrl('package.files.root', {
      scope: this.version.pack.scope.reference,
      name: this.version.pack.name,
      version: this.version.version,
    });

    if (fileNode.parent === null) {
      return rootUrl;
    }

    return `${rootUrl}${fileNode.path}`;
  }
}