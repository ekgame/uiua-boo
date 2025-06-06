use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct BooPackageDefinition {
    pub name: String,
    pub version: String,
    pub include: Vec<String>,
}

impl BooPackageDefinition {
    pub fn package_file_name(&self) -> String {
        let clean_name = self.name
            .replace("/", "-")
            .replace("@", "");
        
        format!("{}-{}", clean_name, self.version)
    }

    pub fn version_reference(&self) -> String {
        format!("{}@{}", self.name, self.version)
    }
}
