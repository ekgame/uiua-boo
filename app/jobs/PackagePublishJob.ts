import { Job } from "adonisjs-jobs";
import PackagePublishJobModel from "#features/publishing/PackagePublishJobModel";
import normalizeException from 'normalize-exception';
import { inject } from "@adonisjs/core";
import drive from '@adonisjs/drive/services/main'
import app from "@adonisjs/core/services/app";
import { CliRunner } from "../utils/cli.js";
import { packageArtifactKey, packagePreviewFileKey, resolveFileInfo } from "../utils/files.js";
import * as tar from 'tar';
import path from 'node:path';
import db from "@adonisjs/lucid/services/db";
import PackageVersion from "#features/packages/PackageVersion";
import PackageVersionFile from "#features/packages/PackageVersionFile";
import zlib from 'node:zlib';

type PackagePublishJobPayload = {
  publishingJobId: number;
};

export default class PackagePublishJob extends Job {
  public async handle(payload: PackagePublishJobPayload) {
    const startTime = performance.now();
    this.logger.info(`Starting package publish job for publishing job ID: ${payload.publishingJobId}`);
    
    const job = await PackagePublishJobModel.findOrFail(payload.publishingJobId);
    this.logger.info(`Processing package publish job ${job.id} for version ${job.version}`);
  
    try {
      await job.updateInProgress();
      this.logger.info(`Updated job ${job.id} to in-progress status`);
      
      if (await this.doJob(job)) {
        await job.updateCompleted();
        const duration = Math.round(performance.now() - startTime);
        this.logger.info(`Package publish job ${job.id} completed successfully in ${duration}ms`);
      } 
    } catch (error) {
      const duration = Math.round(performance.now() - startTime);
      this.logger.error(`Package publish job ${job.id} failed after ${duration}ms:`, normalizeException(error).message);
      
      await job.updateFailed([{
        message: normalizeException(error).message
      }]);
    } finally {
      if (job.archiveFileName) {
        this.logger.debug(`Cleaning up temporary archive file: ${job.archiveFileName}`);
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

    this.logger.debug(`Processing archive file: ${pendingArchiveFile}`);

    const disk = drive.use('fs');
    if (!await disk.exists(pendingArchiveFile)) {
      this.logger.error(`Pending archive file does not exist: ${pendingArchiveFile}`);
      throw new Error('Pending archive file does not exist.');
    }

    await job.loadOnce('relatedPackage');
    if (!job.relatedPackage) {
      this.logger.error(`Related package not found`);
      throw new Error('Related package not found for the publishing job.');
    }

    this.logger.info(`Validating package archive for ${job.relatedPackage.reference} v${job.version}`);
    const physicalArchivePath = app.makePath('storage', 'files', pendingArchiveFile);
    const cli = CliRunner.getInstance();

    const validationResults = await cli.validatePackageArchive(physicalArchivePath, {
      expectedName: job.relatedPackage.reference,
      expectedVersion: job.version,
    });

    if (validationResults.length > 0) {
      this.logger.warn(`Package validation failed for ${job.relatedPackage.reference} v${job.version}:`, validationResults);
      await job.updateFailed(validationResults);
      return false;
    }

    this.logger.info(`Package validation successful for ${job.relatedPackage.reference} v${job.version}`);

    // The functions to execute to clean up any loose ends
    // in case of an error while setting everything up.
    const cleanupFunctions: CallableFunction[] = [];

    try {
      this.logger.info(`Moving pending archive file to artifact storage`);
      const artifactKey = packageArtifactKey(
        job.relatedPackage.fullName,
        job.version,
      );

      await disk.move(pendingArchiveFile, artifactKey);
      cleanupFunctions.push(async () => {
        this.logger.info(`Cleaning up artifact file ${artifactKey}`);
        await disk.delete(artifactKey)
      });

      const archiveStream = await disk.getStream(artifactKey);

      const trx = await db.transaction();
      cleanupFunctions.push(async () => {
        this.logger.warn(`Rolling back transaction due to an error`);
        await trx.rollback()
      });

      const packageVersion = await PackageVersion.create({
        packageId: job.relatedPackage.id,
        version: job.version,
        artifactFileKey: artifactKey,
      }, { client: trx });

      this.logger.info(`Created package version entry ${job.relatedPackage.reference} v${job.version} with ID ${packageVersion.id}`);

      const entries: { path: string, content: Buffer }[] = [];
      await new Promise<void>((resolve, reject) => {
        archiveStream
          .pipe(zlib.createGunzip())
          .pipe(tar.t())
          .on('entry', async (entry: tar.ReadEntry) => {
            // I have no idea why this effectively reads the file, but it does.
            const fileContent = Buffer.concat(await entry.collect());
            const filePath = path.normalize(entry.path);

            if (fileContent === null) {
              this.logger.error(`Failed to read file content for ${filePath} in job ${job.id}`);
              reject(new Error(`Failed to read file content for ${filePath}`));
              return;
            }
            this.logger.info(`Extracted entry: ${filePath}`);
            entries.push({ path: filePath, content: fileContent });
          })
          .on('end', () => {
            this.logger.info(`Finished extracting ${entries.length} entries`);
            resolve();
          })
          .on('error', (err: Error) => {
            this.logger.error(`Error during archive extraction: ${err.message}`);
            reject(err);
          });
      });

      if (entries.length === 0) {
        this.logger.warn(`No entries extracted from the archive`);
        throw new Error('No files found in the package archive');
      }

      for (const entry of entries) {
        const data = resolveFileInfo(entry.content, entry.path);
        let fileKey: string | null = null;
        let isPreviewable = data.canPreview;
        let mimeType = data.mimeType;

        if (data.canPreview) {
          fileKey = packagePreviewFileKey(
            job.relatedPackage.fullName,
            job.version,
            entry.path,
          );
          
          await disk.put(fileKey, entry.content);
          cleanupFunctions.push(async () => {
            this.logger.info(`Cleaning up preview file ${fileKey}`);
            await disk.delete(fileKey!)
          });
        }

        await PackageVersionFile.create({
          packageVersionId: packageVersion.id,
          path: entry.path,
          sizeBytes: entry.content.length,
          fileKey,
          mimeType,
          isPreviewable,
        }, { client: trx });
      }

      await trx.commit();

      if (packageVersion.semver.prerelease.length === 0) {
        this.logger.info(`Setting latest stable version for package ${job.relatedPackage.reference}`);
        job.relatedPackage.latestStableVersionId = packageVersion.id;
        await job.relatedPackage.save();
      }
    } catch (error) {
      this.logger.error(`Error during doJob: ${normalizeException(error).message}. Initiating cleanup.`);
      await Promise.allSettled(cleanupFunctions.map(fn => fn().catch((e: Error) => this.logger.error(`Cleanup function failed: ${normalizeException(e).message}`))));
      throw error;
    }

    return true;
  }
}