import { Job } from "adonisjs-jobs";
import PackagePublishJobModel from "./PackagePublishJobModel.js";
import normalizeException from 'normalize-exception';

type PackagePublishJobPayload = {
  publishingJobId: number;
};

export class PackagePublishJob extends Job {
  public async handle(payload: PackagePublishJobPayload) {
    const job = await PackagePublishJobModel.findOrFail(payload.publishingJobId);
  
    try {
      await job.updateInProgress();
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await job.updateCompleted();
    } catch (error) {
      await job.updateFailed([normalizeException(error).message]);
    }
  }
}