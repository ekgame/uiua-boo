use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct BooPackageDefinition {
    pub name: String,
    pub version: String,
    pub include: Vec<String>,
}

pub fn validate_package_name(name: &String) -> Result<String, String> {
    if name.is_empty() {
        return Err("package name cannot be empty".to_string());
    }

    if !name.contains('/') {
        return Err("package name must be in the format 'scope-name/package-name'".to_string());
    }

    let parts: Vec<&str> = name.split('/').collect();
    if parts.len() != 2 {
        return Err("package name must contain exactly one '/'".to_string());
    }

    let (scope, package) = (parts[0], parts[1]);
    validate_piece(scope, "scope name")?;
    validate_piece(package, "package name")?;

    Ok(name.to_string())
}

fn validate_piece(name: &str, piece: &str) -> Result<(), String> {
    if name.is_empty() {
        return Err(format!("{} cannot be empty", piece));
    }

    if name.chars().any(|c| !c.is_ascii_alphanumeric() && c != '-') {
        return Err(format!(
            "{} can only contain alphanumeric characters and dashes",
            piece
        ));
    }

    if name.starts_with('-') || name.ends_with('-') {
        return Err(format!("{} cannot start or end with a dash", piece));
    }

    if name.contains("--") {
        return Err(format!("{} cannot contain consecutive dashes", piece));
    }

    let length = name.len();
    let min_length = 2;
    let max_length = 32;

    if length < min_length || length > max_length {
        return Err(format!(
            "{} must be between {} and {} characters long",
            piece, min_length, max_length
        ));
    }

    Ok(())
}
