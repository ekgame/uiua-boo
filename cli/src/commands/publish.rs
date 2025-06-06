use std::{
    cmp,
    collections::HashSet,
    error::Error,
    fs,
    path::{self, PathBuf},
    process,
    time::Duration,
    vec,
};

use owo_colors::OwoColorize;

use crate::{
    PublishArgs,
    api::{
        ApiRequestError, AuthRequest, AuthRequestResponse, AuthRequestStatus, BooApiClient,
        CreatePublishJobRequest, PackagePublishJobStatus, PublishJobResult,
    },
    common::BooPackageDefinition,
    print_error, print_success, print_warning,
};

use flate2::Compression;
use flate2::write::GzEncoder;
use glob::glob;
use tar::Builder;
use tokio::time::sleep;

use super::validate;

const POLLING_INTERVAL_SECS: u64 = 1;
const AUTH_TIMEOUT_SECS: u64 = 300; // 5 minutes
const PUBLISH_JOB_WAIT_TIMEOUT_SECS: u64 = 600; // 10 minutes

enum PublishingIssueType {
    Error,
    Warning,
}

struct PublishingIssue {
    issue_type: PublishingIssueType,
    message: String,
}

struct PublishingIssues {
    message: Vec<PublishingIssue>,
}

impl PublishingIssues {
    fn new() -> Self {
        Self { message: vec![] }
    }

    fn add_issue(&mut self, issue_type: PublishingIssueType, message: String) {
        self.message.push(PublishingIssue {
            issue_type,
            message,
        });
    }

    fn add_error(&mut self, message: String) {
        self.add_issue(PublishingIssueType::Error, message);
    }

    fn add_warning(&mut self, message: String) {
        self.add_issue(PublishingIssueType::Warning, message);
    }

    fn has_errors(&self) -> bool {
        self.message
            .iter()
            .any(|issue| matches!(issue.issue_type, PublishingIssueType::Error))
    }

    fn get_sorted_issues(&self) -> Vec<&PublishingIssue> {
        let mut sorted_issues = self.message.iter().collect::<Vec<_>>();
        sorted_issues.sort_by(|a, b| match (&a.issue_type, &b.issue_type) {
            (PublishingIssueType::Error, PublishingIssueType::Warning) => cmp::Ordering::Greater,
            (PublishingIssueType::Warning, PublishingIssueType::Error) => cmp::Ordering::Less,
            _ => cmp::Ordering::Equal,
        });
        sorted_issues
    }
}

struct PublishingData {
    package: BooPackageDefinition,
    issues: PublishingIssues,
    files: Vec<PathBuf>,
}

struct VerifiedPackage {
    package: BooPackageDefinition,
    buffer: Vec<u8>,
}

enum PublishingError {
    AppRequestDenied,
    PublishJobErrors(Vec<String>),
    ApiError(String),
    NetworkError(String),
}

impl From<&ApiRequestError> for PublishingError {
    fn from(err: &ApiRequestError) -> Self {
        match err {
            ApiRequestError::ApiError(message) => PublishingError::ApiError(message.clone()),
            ApiRequestError::NetworkError(err) => {
                let mut error_message = err.to_string();
                if let Some(source) = err.source() {
                    error_message += &format!(": {}", source);
                }
                PublishingError::NetworkError(error_message)
            }
            ApiRequestError::ValidationErrors(error) => PublishingError::ApiError(
                error
                    .errors
                    .iter()
                    .map(|e| match &e.field {
                        Some(field) => format!("{}: {}", field, e.message),
                        None => e.message.clone(),
                    })
                    .collect::<Vec<_>>()
                    .join(", "),
            ),
            ApiRequestError::AuthError(message) => PublishingError::ApiError(message.clone()),
        }
    }
}

pub(crate) fn run_publish(args: PublishArgs) {
    let package_data = get_current_package().unwrap_or_else(|e| {
        print_error(&e);
        process::exit(1);
    });

    for issue in package_data.issues.get_sorted_issues() {
        match issue.issue_type {
            PublishingIssueType::Error => print_error(&issue.message.to_string()),
            PublishingIssueType::Warning => print_warning(&issue.message.to_string()),
        }
    }

    let package_buffer = create_package(&package_data.files).unwrap_or_else(|e| {
        print_error(&e);
        process::exit(1);
    });

    let rules = validate::ValidationRules::new();
    let validation_errors = validate::validate_package(&package_buffer, &rules);

    if !validation_errors.is_empty() {
        for error in validation_errors {
            print_error(error.message.as_str());
        }
        process::exit(1);
    }

    let has_errors = package_data.issues.has_errors() || !validation_errors.is_empty();

    if args.check {
        if !has_errors {
            print_success("No issues found. Package is ready for publishing.");
        }
        process::exit(has_errors as i32);
    }

    if has_errors {
        process::exit(1);
    }

    if args.offline {
        let output_file = format!("{}.tar.gz", package_data.package.package_file_name());
        fs::write(&output_file, package_buffer).unwrap_or_else(|e| {
            print_error(&format!(
                "Failed to write package to file '{}': {}",
                output_file, e
            ));
            process::exit(1);
        });
        print_success(&format!("Package created successfully: '{}'", output_file));
        process::exit(0);
    }

    let status = do_publish(VerifiedPackage {
        package: package_data.package,
        buffer: package_buffer,
    });

    match status {
        Ok(_) => {
            print_success("Package published successfully.");
        }
        Err(PublishingError::AppRequestDenied) => {
            print_error("App request was denied, stopping.");
        }
        Err(PublishingError::NetworkError(message)) => {
            print_error(&format!("Network error: {}", message));
        }
        Err(PublishingError::ApiError(message)) => {
            print_error(&format!("API error: {}", message));
        }
        Err(PublishingError::PublishJobErrors(errors)) => {
            print_error("Publishing job failed:");
            for error in &errors {
                print_error(format!("- {}", error).as_str());
            }
        }
    }
}

fn get_current_package() -> Result<PublishingData, String> {
    let file_path = path::Path::new("boo.json");
    if !file_path.exists() {
        return Err("'boo.json' file not found. Please run `boo init` first.".to_string());
    }

    let file_contents = fs::read_to_string(file_path)
        .map_err(|e| format!("Failed to read boo.json: {}", e.to_string()))?;

    let package_definition: BooPackageDefinition = serde_json::from_str(&file_contents)
        .map_err(|e| format!("Failed to parse boo.json: {}", e.to_string()))?;

    let mut issues = PublishingIssues::new();

    let mut files: HashSet<PathBuf> = HashSet::new();
    for pattern in &package_definition.include {
        match match_files(pattern) {
            Ok(matched_files) if !matched_files.is_empty() => {
                for file in matched_files {
                    files.insert(file.clone());
                }
            }
            Ok(_) => issues.add_warning(format!("No files matched the pattern '{}'", pattern)),
            Err(e) => issues.add_error(format!("Invalid GLOB pattern '{}': {}", pattern, e)),
        }
    }

    return Ok(PublishingData {
        package: package_definition,
        issues,
        files: files.into_iter().collect(),
    });
}

fn match_files(pattern: &String) -> Result<Vec<PathBuf>, Box<dyn std::error::Error>> {
    let mut files = vec![];

    for entry in glob(pattern)? {
        match entry {
            Ok(path) if path.is_file() => files.push(path),
            Ok(_) => {}
            Err(_) => {}
        }
    }

    Ok(files)
}

fn create_package(files: &[PathBuf]) -> Result<Vec<u8>, String> {
    let encoder = GzEncoder::new(Vec::new(), Compression::default());
    let mut tar = Builder::new(encoder);

    for file in files {
        let relative_path = file.strip_prefix(".").unwrap_or(file);
        tar.append_path_with_name(file, relative_path)
            .map_err(|e| format!("Failed to add file to tar.gz: {}", e))?;
    }

    tar.finish()
        .map_err(|e| format!("Failed to finalize tar.gz file: {}", e))?;

    let encoder = tar
        .into_inner()
        .map_err(|e| format!("Failed to retrieve encoder: {}", e))?;

    let buffer = encoder
        .finish()
        .map_err(|e| format!("Failed to finish compression: {}", e))?;

    Ok(buffer)
}

fn do_publish(package: VerifiedPackage) -> Result<(), PublishingError> {
    let mut client = BooApiClient::new();

    let rt = tokio::runtime::Runtime::new().expect("Failed to create Tokio runtime");
    rt.block_on(async {
        let auth_request = AuthRequest {
            app_name: client.app_name.clone(),
            requested_permissions: vec![format!(
                "package.upload-new-version:{}@{}",
                package.package.name, package.package.version
            )],
        };

        let auth_request_response = client
            .create_auth_request(auth_request)
            .await
            .map_err(|e| PublishingError::from(&e))?;

        println!("");
        println!("Please approve the application to act on your behalf:");
        println!("- {}", auth_request_response.request_url.underline());
        println!("");
        println!("{}", "Waiting for approval...".dimmed());

        let access_token = run_auth_verification_loop(&client, &auth_request_response).await;

        client
            .delete_auth_request(&auth_request_response.private_code)
            .await
            .map_err(|e| PublishingError::from(&e))?;

        print_success("Authorization approved");
        client.set_access_token(access_token?);

        print_success("Creating publishing job...");
        let publish_job = client
            .create_publishing_job(CreatePublishJobRequest {
                name: package.package.name,
                version: package.package.version.clone(),
            })
            .await
            .map_err(|e| PublishingError::from(&e))?;

        print_success("Uploading package...");
        client
            .upload_package(&publish_job.publishing_id, package.buffer)
            .await
            .map_err(|e| PublishingError::from(&e))?;

        print_success("Package uploaded successfully, waiting for publishing job to complete...");

        run_check_publish_job_status_loop(&client, publish_job.publishing_id).await?;

        Ok(())
    })
}

async fn run_auth_verification_loop(
    client: &BooApiClient,
    auth_request_response: &AuthRequestResponse,
) -> Result<String, PublishingError> {
    let start_time = std::time::Instant::now();

    loop {
        if start_time.elapsed().as_secs() > AUTH_TIMEOUT_SECS {
            return Err(PublishingError::ApiError(
                "Authorization request timed out".to_string(),
            ));
        }

        sleep(Duration::from_secs(POLLING_INTERVAL_SECS)).await;

        let request_status = client
            .get_auth_request_status(&auth_request_response.private_code)
            .await
            .map_err(|e| PublishingError::from(&e))?;

        match &request_status.status {
            AuthRequestStatus::Pending => {
                continue;
            }
            AuthRequestStatus::Approved => match request_status.access_token {
                Some(token) => return Ok(token),
                None => {
                    return Err(PublishingError::ApiError(
                        "No access token provided in the approval response.".to_string(),
                    ));
                }
            },
            AuthRequestStatus::Denied => return Err(PublishingError::AppRequestDenied),
        }
    }
}

async fn run_check_publish_job_status_loop(
    client: &BooApiClient,
    publishing_id: i64,
) -> Result<(), PublishingError> {
    let start_time = std::time::Instant::now();

    loop {
        if start_time.elapsed().as_secs() > PUBLISH_JOB_WAIT_TIMEOUT_SECS {
            return Err(PublishingError::ApiError(
                "Publishing job timed out".to_string(),
            ));
        }

        sleep(Duration::from_secs(POLLING_INTERVAL_SECS)).await;

        let publish_job = client
            .get_publish_job_status(publishing_id)
            .await
            .map_err(|e| PublishingError::from(&e))?;

        match publish_job.status {
            PackagePublishJobStatus::Completed => {
                return Ok(());
            }
            PackagePublishJobStatus::Failed => {
                let errors = match publish_job.result {
                    Some(PublishJobResult::Failure(e)) => {
                        e.errors.iter().map(|i| i.message.clone()).collect()
                    }
                    _ => vec!["Publishing job failed without details".into()],
                };
                return Err(PublishingError::PublishJobErrors(errors));
            }
            _ => continue,
        }
    }
}
