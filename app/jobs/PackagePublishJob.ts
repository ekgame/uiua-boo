import { Job } from "adonisjs-jobs";
import PackagePublishJobModel from "#features/publishing/PackagePublishJobModel";
import normalizeException from 'normalize-exception';
import { inject } from "@adonisjs/core";
import drive from '@adonisjs/drive/services/main'
import app from "@adonisjs/core/services/app";
import { CliRunner } from "../utils/cli.js";
import { packageArtifactKey, packagePreviewFileKey, resolveFileInfo } from "../utils/files.js";
import * as tar from 'tar';
import { Readable } from 'node:stream';
import path from 'node:path';
import db from "@adonisjs/lucid/services/db";
import PackageVersion from "#features/packages/PackageVersion";
import PackageVersionFile from "#features/packages/PackageVersionFile";

type PackagePublishJobPayload = {
  publishingJobId: number;
};

export default class PackagePublishJob extends Job {
  public async handle(payload: PackagePublishJobPayload) {
    const job = await PackagePublishJobModel.findOrFail(payload.publishingJobId);
  
    try {
      await job.updateInProgress();
      if (await this.doJob(job)) {
        await job.updateCompleted();
      } 
    } catch (error) {
      await job.updateFailed([{
        message: normalizeException(error).message
      }]);
    } finally {
      if (job.archiveFileName) {
        await drive.use('fs').delete(job.archiveFileName);
      }
    }
  }

  @inject()
  private async doJob(job: PackagePublishJobModel): Promise<boolean> {
    const pendingArchiveFile = job.archiveFileName;
    if (!pendingArchiveFile) {
      throw new Error('No archive file set for the publishing job.');
    }

    const disk = drive.use('fs');
    if (!await disk.exists(pendingArchiveFile)) {
      throw new Error('Pending archive file does not exist.');
    }

    await job.loadOnce('relatedPackage');
    if (!job.relatedPackage) {
      throw new Error('Related package not found for the publishing job.');
    }

    const physicalArchivePath = app.makePath('storage', 'files', pendingArchiveFile);
    const cli = CliRunner.getInstance();

    const validationResults = await cli.validatePackageArchive(physicalArchivePath, {
      expectedName: job.relatedPackage.fullName,
      expectedVersion: job.version,
    });

    if (validationResults.length > 0) {
      await job.updateFailed(validationResults);
      return false;
    }

    // The functions to execute to clean up any loose ends
    // in case of an error while setting everything up.
    const cleanupFunctions: CallableFunction[] = [];

    try {
      const artifactKey = packageArtifactKey(
        job.relatedPackage.fullName,
        job.version,
      );

      await disk.move(pendingArchiveFile, artifactKey);
      cleanupFunctions.push(async () => await disk.delete(artifactKey));

      const archiveBytes = await disk.getBytes(artifactKey);
      if (!archiveBytes) {
        throw new Error('Failed to read the archive file');
      }

      const trx = await db.transaction();
      cleanupFunctions.push(async () => await trx.rollback());

      const packageVersion = await PackageVersion.create({
        packageId: job.relatedPackage.id,
        version: job.version,
        artifactFileKey: artifactKey,
      }, { client: trx });

      // Collect all entries first
      const entries: { path: string, content: Buffer }[] = [];
      await new Promise<void>((resolve, reject) => {
        Readable.from(archiveBytes)
          .pipe(tar.t({ sync: true }))
          .on('entry', (entry: tar.ReadEntry) => {
            const filePath = path.normalize(entry.path);
            const fileContent = entry.read();
            if (!fileContent) {
              reject(new Error(`Failed to read file content for ${filePath}`));
              return;
            }
            entries.push({ path: filePath, content: fileContent });
          })
          .on('end', resolve)
          .on('error', reject);
      });

      // Process entries sequentially
      for (const entry of entries) {
        const data = resolveFileInfo(entry.content, entry.path);
        let fileKey = null;
        let isPreviewable = data.canPreview;
        let mimeType = data.mimeType;

        if (data.canPreview) {
          fileKey = packagePreviewFileKey(
            job.relatedPackage.fullName,
            job.version,
            entry.path,
          );

          await disk.put(fileKey, entry.content);
          cleanupFunctions.push(async () => await disk.delete(fileKey!));
        }

        await PackageVersionFile.create({
          packageVersionId: packageVersion.id,
          path: entry.path,
          fileKey,
          mimeType,
          isPreviewable,
        }, { client: trx });
      }

      await trx.commit();
    } catch (error) {
      await Promise.allSettled(cleanupFunctions);
      throw error;
    }

    return true;
  }
}