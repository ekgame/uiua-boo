use bytesize::ByteSize;
use virtual_filesystem::{FileSystem, tar_fs::TarFS};

use crate::{ValidationArgs, print_error, print_success};

pub struct ValidationRules {
    pub compressed_package_max_size: u64,
    pub internal_file_max_size: u64,
}

impl ValidationRules {
    pub fn new() -> Self {
        ValidationRules {
            compressed_package_max_size: ByteSize::mb(5).as_u64(),
            internal_file_max_size: ByteSize::mb(5).as_u64(),
        }
    }
}

pub struct ValidationError {
    pub message: String,
}

impl ValidationError {
    fn new(message: String) -> Self {
        ValidationError { message }
    }
}

pub(crate) fn run_validation(args: ValidationArgs) {
    let rules = ValidationRules::new();
    let package_file = args.package_file;

    let buffer = std::fs::read(&package_file).expect("Failed to read the package file");
    let results = validate_package(&buffer, &rules);

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

    let package = package.unwrap();
    errors.extend(validate_package_files(rules, &package));

    match &package.exists("boo.json") {
        Ok(true) => {
            // TODO: Validate the 'boo.json' file contents
            // TODO: check for extra files that are not declared in includes
        }
        Ok(false) => errors.push(ValidationError::new(
            "The package is missing the required 'boo.json' file.".to_string(),
        )),
        Err(error) => errors.push(ValidationError::new(format!(
            "Failed to check for 'boo.json': {error}",
        ))),
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
