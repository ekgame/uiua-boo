import { cuid } from "@adonisjs/core/helpers";
import NodeBuffer, { Buffer } from "node:buffer";
import { Mime } from 'mime';
import standardTypes from 'mime/types/standard.js';

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