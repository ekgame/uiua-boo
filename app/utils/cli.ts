import normalizeException from 'normalize-exception';
import { exec } from 'teen_process';

type PackageArchiveValidationOptions = {
  expectedName?: string;
  expectedVersion?: string;
};

type PackageArchiveValidationResults = {
  message: string;
}[];

export class CliRunner {
  private static instance: CliRunner | null = null;

  constructor(private executablePath: string) { }

  public async validatePackageArchive(path: string, options: PackageArchiveValidationOptions): Promise<PackageArchiveValidationResults> {
    const args: string[] = [
      'validate',
      path,
      '--json',
    ];

    if (options.expectedName) {
      args.push('--expect-name', options.expectedName);
    }

    if (options.expectedVersion) {
      args.push('--expect-version', options.expectedVersion);
    }

    return JSON.parse(await this.run(args)) as PackageArchiveValidationResults;
  }

  private async run(args: string[]): Promise<string> {
    try {
      return (await exec(this.executablePath, args)).stdout;
    } catch (error) {
      throw new Error(`CLI execution failed: ${normalizeException(error).message}`);
    }
  }

  public static getInstance(): CliRunner {
    if (!CliRunner.instance) {
      CliRunner.instance = new CliRunner(this.getExecutablePath());
    }

    return CliRunner.instance;
  }

  private static getExecutablePath(): string {
    const envMode = (process.env.NODE_ENV || '').toLocaleLowerCase();
    console.log(`Using CLI executable path for environment: ${envMode}`);
    if (['test', 'development'].includes(envMode)) {
      return 'cli/target/debug/uiua-boo';
    }

    return 'cli/target/release/uiua-boo';
  }
}