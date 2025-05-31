import { BaseModel, column } from "@adonisjs/lucid/orm";
import { DateTime } from 'luxon'

export namespace PackagePublishJobStatus {
  /** The job is waiting for file to be uploaded and processing to start. */
  export const PENDING = 'PENDING';

  /** The job is queued for processing. */
  export const QUEUED = 'QUEUED';

  /** The job is currently being processed. */
  export const IN_PROGRESS = 'IN_PROGRESS';

  /** The job has been completed successfully. */
  export const COMPLETED = 'COMPLETED';

  /** The job has failed. */
  export const FAILED = 'FAILED';
}

export type PackagePublishJobStatus = (typeof PackagePublishJobStatus)[keyof typeof PackagePublishJobStatus];

interface PackagePublishJobSuccess {
  type: 'success';
}

interface PackagePublishJobFailure {
  type: 'failure';
  errors: string[];
}

export type PackagePublishJobResult =
  | PackagePublishJobSuccess
  | PackagePublishJobFailure;

export default class PackagePublishJobModel extends BaseModel {
  static table = 'package_publish_job';

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare packageId: number

  @column()
  declare version: string

  @column()
  declare archiveFileName: string | null

  @column()
  declare status: PackagePublishJobStatus

  /**
   * This is a JSON string containing details about the published package.
   */
  @column()
  declare result: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @column.dateTime()
  declare processingStartedAt: DateTime | null

  async updateQueued(archiveFileName: string) {
    this.status = PackagePublishJobStatus.QUEUED;
    this.archiveFileName = archiveFileName;
    return await this.save();
  }

  async updateInProgress() {
    this.status = PackagePublishJobStatus.IN_PROGRESS;
    this.processingStartedAt = DateTime.now();
    return await this.save();
  }

  async updateCompleted() {
    this.status = PackagePublishJobStatus.COMPLETED;
    this.result = JSON.stringify({
      type: 'success'
    } as PackagePublishJobSuccess);
    return await this.save();
  }

  async updateFailed(errors: string[]) {
    this.status = PackagePublishJobStatus.FAILED;
    this.result = JSON.stringify({
      type: 'failure',
      errors,
    } as PackagePublishJobFailure);
    return await this.save();
  }
}