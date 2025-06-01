use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct BooPackageDefinition {
    pub name: String,
    pub version: String,
    pub include: Vec<String>,
}

impl BooPackageDefinition {
    pub fn package_file_name(&self) -> String {
        format!("{}-{}", self.name.replace("/", "-"), self.version)
    }
}
