use std::{
    cmp,
    collections::HashSet,
    fs,
    path::{self, PathBuf},
    process,
};

use crate::{
    PublishArgs,
    common::{BooPackageDefinition, validate_package_name},
    print_error, print_success, print_warning,
};

use flate2::Compression;
use flate2::write::GzEncoder;
use glob::glob;
use tar::Builder;

use super::validate;

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

pub(crate) fn run_publish(args: PublishArgs) {
    let package_data = validate_package().unwrap_or_else(|e| {
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
}

fn validate_package() -> Result<PublishingData, String> {
    let file_path = path::Path::new("boo.json");
    if !file_path.exists() {
        return Err("'boo.json' file not found. Please run `boo init` first.".to_string());
    }

    let file_contents = fs::read_to_string(file_path)
        .map_err(|e| format!("Failed to read boo.json: {}", e.to_string()))?;

    let package_definition: BooPackageDefinition = serde_json::from_str(&file_contents)
        .map_err(|e| format!("Failed to parse boo.json: {}", e.to_string()))?;

    let mut issues = PublishingIssues::new();

    if let Err(message) = validate_package_name(&package_definition.name) {
        issues.add_error(format!(
            "Invalid package name '{}': {}",
            package_definition.name, message
        ));
    }

    if let Err(message) = semver::Version::parse(&package_definition.version) {
        issues.add_error(format!(
            "Invalid package version '{}': {}",
            package_definition.version, message
        ));
    }

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
