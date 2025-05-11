use std::path::Path;

use crate::common::{validate_package_name, BooPackageDefinition};
use crate::InitArgs;

use crate::{print_error, print_success};

pub(crate) fn run_init(args: InitArgs) {
    let file = Path::new("boo.json");
    if file.exists() {
        print_error("boo.json already exists. Skipping initialization.");
        return;
    }

    let package_name = validate_package_name(&args.package_name);
    if let Err(e) = package_name {
        print_error(&format!("Invalid package name '{}': {}", args.package_name, e));
        return;
    }

    let default_package = BooPackageDefinition {
        name: package_name.unwrap(),
        version: "0.1.0".to_string(),
        include: vec![
            "**/*.ua".to_string(),
            "boo.json".to_string(),
            "README.md".to_string(),
            "LICENSE".to_string(),
        ],
    };

    let json = serde_json::to_string_pretty(&default_package).unwrap();
    if let Err(e) = std::fs::write("boo.json", json) {
        print_error(&format!("Failed to write to boo.json: {}", e));
        return;
    }

    print_success("boo.json created successfully.");
}
