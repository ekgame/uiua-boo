use bytesize::ByteSize;

use crate::{ValidationArgs, print_error, print_success};

pub struct ValidationRules {
    pub compressed_package_max_size: u64,
    pub internal_file_max_size: u64,
}

impl ValidationRules {
    fn new() -> Self {
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

    // Read the package file
    let buffer = std::fs::read(&package_file).expect("Failed to read the package file");

    // Validate the package
    let results = validate_package(buffer, &rules);
    if results.is_empty() {
        print_success("Package validation passed successfully.");
    } else {
        print_error("Package validation failed:");
        for error in results {
            print_error(&format!(" - {}", error.message));
        }
    }
}

pub fn validate_package(buffer: Vec<u8>, rules: &ValidationRules) -> Vec<ValidationError> {
    let mut errors = Vec::<ValidationError>::new();

    if buffer.len() > rules.compressed_package_max_size as usize {
        errors.push(ValidationError::new(format!(
            "The compressed package exceeds the maximum size of {} bytes.",
            ByteSize::b(rules.compressed_package_max_size)
        )));
    }

    let mut archive = tar::Archive::new(flate2::read::GzDecoder::new(&buffer[..]));

    match archive.entries() {
        Ok(entries) => {
            errors.extend(validate_package_files(rules, entries));
        }
        Err(_) => errors.push(ValidationError::new(
            "Failed to read the archive.".to_string(),
        )),
    };

    errors
}

fn validate_package_files(
    rules: &ValidationRules,
    entries: tar::Entries<flate2::read::GzDecoder<&[u8]>>,
) -> Vec<ValidationError> {
    let mut errors = Vec::new();

    for entry in entries {
        match entry {
            Ok(entry) => {
                let file_size = entry.size();
                if file_size > rules.internal_file_max_size {
                    errors.push(ValidationError::new(format!(
                        "The file {} exceeds the maximum size of {} bytes.",
                        entry.path().unwrap().display(),
                        ByteSize::b(rules.internal_file_max_size)
                    )));
                }
            }
            Err(_) => {
                errors.push(ValidationError::new(
                    "Failed to read an entry in the archive.".to_string(),
                ));
                continue;
            }
        };
    }

    errors
}
