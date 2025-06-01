use bytesize::ByteSize;
use serde::{Deserialize, Serialize};
use virtual_filesystem::{FileSystem, tar_fs::TarFS};

use crate::{common::BooPackageDefinition, print_error, print_success, ValidationArgs};

#[derive(Debug, Clone)]
pub struct ValidationRules {
    pub compressed_package_max_size: u64,
    pub internal_file_max_size: u64,
    pub expected_name: Option<String>,
    pub expected_version: Option<String>,
}

impl ValidationRules {
    pub fn new() -> Self {
        ValidationRules {
            compressed_package_max_size: ByteSize::mb(5).as_u64(),
            internal_file_max_size: ByteSize::mb(5).as_u64(),
            expected_name: None,
            expected_version: None,
        }
    }

    pub fn with_expected_name(mut self, name: String) -> Self {
        self.expected_name = Some(name);
        self
    }

    pub fn with_expected_version(mut self, version: String) -> Self {
        self.expected_version = Some(version);
        self
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationError {
    pub message: String,
}

impl ValidationError {
    fn new(message: String) -> Self {
        ValidationError { message }
    }
}

pub(crate) fn run_validation(args: ValidationArgs) {
    let mut rules = ValidationRules::new();
    if let Some(name) = &args.expect_name {
        rules = rules.with_expected_name(name.clone());
    }
    if let Some(version) = &args.expect_version {
        rules = rules.with_expected_version(version.clone());
    }

    let package_file = args.package_file;

    let buffer = std::fs::read(&package_file).expect("Failed to read the package file");
    let results = validate_package(&buffer, &rules);

    if args.json {
        let json_results = serde_json::to_string(&results).expect("Failed to serialize results to JSON");
        println!("{}", json_results);
        return;
    }

    if results.is_empty() {
        print_success("Package validation passed successfully.");
    } else {
        print_error("Package validation failed:");
        for error in results {
            print_error(&format!(" - {}", error.message));
        }
    }
}

pub(crate) fn validate_package(buffer: &Vec<u8>, rules: &ValidationRules) -> Vec<ValidationError> {
    let mut errors = Vec::<ValidationError>::new();

    if buffer.len() > rules.compressed_package_max_size as usize {
        errors.push(ValidationError::new(format!(
            "The compressed package exceeds the maximum size of {} bytes.",
            ByteSize::b(rules.compressed_package_max_size)
        )));
    }

    let decoder = flate2::read::GzDecoder::new(buffer.as_slice());
    let package = TarFS::new(decoder);
    if let Err(error) = package {
        errors.push(ValidationError::new(format!(
            "Failed to read the package: {error}"
        )));
        return errors;
    }

    let mut package = package.unwrap();
    errors.extend(validate_package_files(rules, &package));

    match try_get_package_definition(&mut package, "boo.json") {
        Ok(definition) => {
            errors.extend(validate_package_definition(&definition));
            errors.extend(validate_package_definition_by_rules(&definition, rules));
            // TODO: check if only files defined in 'include' are present
        }
        Err(error) => errors.push(error),
    }

    let has_lib_file = match &package.exists("lib.ua") {
        Ok(status) => {
            if *status {
                // TODO: Add additional validation for 'lib.ua'
            }
            status.clone()
        }
        Err(error) => {
            errors.push(ValidationError::new(format!(
                "Failed to check for 'lib.ua': {error}"
            )));
            false
        }
    };

    let has_main_file = match &package.exists("main.ua") {
        Ok(status) => {
            if *status {
                // TODO: Add additional validation for 'main.ua'
            }
            status.clone()
        }
        Err(error) => {
            errors.push(ValidationError::new(format!(
                "Failed to check for 'main.ua': {error}"
            )));
            false
        }
    };

    if !has_lib_file && !has_main_file {
        errors.push(ValidationError::new(
            "The package must contain at least one of either 'lib.ua' or 'main.ua'.".to_string(),
        ));
    }

    errors
}

fn validate_package_files(rules: &ValidationRules, fs: &TarFS) -> Vec<ValidationError> {
    let mut errors = Vec::new();

    let entries = fs.read_dir("/");
    if let Err(_) = entries {
        errors.push(ValidationError::new(
            "Failed to read the root directory of the archive.".to_string(),
        ));
        return errors;
    }

    let entries = entries.unwrap();

    for entry in entries.flatten() {
        if entry.is_directory() {
            continue;
        }

        let file_size = entry.len();
        if file_size > rules.internal_file_max_size {
            errors.push(ValidationError::new(format!(
                "The file {} exceeds the maximum size of {} bytes.",
                entry.path.display(),
                ByteSize::b(rules.internal_file_max_size)
            )));
        }
    }

    errors
}

// Extracted function to handle opening, reading, and parsing boo.json
fn try_get_package_definition(
    package: &mut TarFS,
    file_path: &str,
) -> Result<BooPackageDefinition, ValidationError> {
    let mut file = package.open_file(file_path).map_err(|error| {
        ValidationError::new(format!(
            "Could not open '{file_path}' file in the archive: {error}"
        ))
    })?;

    let mut buf = String::new();
    file.read_to_string(&mut buf)
        .map_err(|error| ValidationError::new(format!("Failed to read '{file_path}': {error}")))?;

    serde_json::from_str::<BooPackageDefinition>(&buf)
        .map_err(|error| ValidationError::new(format!("Invalid '{file_path}' format: {error}")))
}

pub fn validate_package_definition(definition: &BooPackageDefinition) -> Vec<ValidationError> {
    let mut errors = Vec::new();

    if let Err(error) = validate_package_name(&definition.name) {
        errors.push(error);
    }

    if let Err(error) = semver::Version::parse(&definition.version) {
        errors.push(ValidationError::new(format!(
            "Invalid package version '{}': {}",
            definition.version, error
        )));
    }

    errors
}

fn validate_package_definition_by_rules(definition: &BooPackageDefinition, rules: &ValidationRules) -> Vec<ValidationError> {
    let mut errors = Vec::new();

    if let Some(expected_name) = &rules.expected_name {
        if definition.name != *expected_name {
            errors.push(ValidationError::new(format!(
                "Expected package name '{}' but found '{}'",
                expected_name, definition.name
            )));
        }
    }

    if let Some(expected_version) = &rules.expected_version {
        if definition.version != *expected_version {
            errors.push(ValidationError::new(format!(
                "Expected package version '{}' but found '{}'",
                expected_version, definition.version
            )));
        }
    }

    errors
}

pub fn validate_package_name(name: &String) -> Result<String, ValidationError> {
    if name.is_empty() {
        return Err(ValidationError::new("package name cannot be empty".to_string()));
    }

    if !name.contains('/') {
        return Err(ValidationError::new(
            "package name must be in the format 'scope-name/package-name'".to_string(),
        ));
    }

    let parts: Vec<&str> = name.split('/').collect();
    if parts.len() != 2 {
        return Err(ValidationError::new(
            "package name must contain exactly one '/'".to_string(),
        ));
    }

    let (scope, package) = (parts[0], parts[1]);
    validate_package_name_piece(scope, "scope name")?;
    validate_package_name_piece(package, "package name")?;

    Ok(name.to_string())
}

fn validate_package_name_piece(name: &str, piece: &str) -> Result<(), ValidationError> {
    if name.is_empty() {
        return Err(ValidationError::new(format!("{} cannot be empty", piece)));
    }

    if name.chars().any(|c| !c.is_ascii_alphanumeric() && c != '-') {
        return Err(ValidationError::new(format!(
            "{} can only contain alphanumeric characters and dashes",
            piece
        )));
    }

    if name.starts_with('-') || name.ends_with('-') {
        return Err(ValidationError::new(format!(
            "{} cannot start or end with a dash",
            piece
        )));
    }

    if name.contains("--") {
        return Err(ValidationError::new(format!(
            "{} cannot contain consecutive dashes",
            piece
        )));
    }

    let length = name.len();
    let min_length = 2;
    let max_length = 32;

    if length < min_length || length > max_length {
        return Err(ValidationError::new(format!(
            "{} must be between {} and {} characters long",
            piece, min_length, max_length
        )));
    }

    Ok(())
}