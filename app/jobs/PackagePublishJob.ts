import { Job } from "adonisjs-jobs";
import PackagePublishJobModel from "#features/publishing/PackagePublishJobModel";
import normalizeException from 'normalize-exception';
import { inject } from "@adonisjs/core";
import drive from '@adonisjs/drive/services/main'
import app from "@adonisjs/core/services/app";
import { CliRunner } from "../utils/cli.js";
import { packageArtifactKey } from "../utils/files.js";

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

    const artifactKey = packageArtifactKey(
      job.relatedPackage.scope.name,
      job.relatedPackage.name,
      job.version,
    );

    await disk.move(pendingArchiveFile, artifactKey);

    return true;
  }
}