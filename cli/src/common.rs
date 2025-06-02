use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct BooPackageDefinition {
    pub name: String,
    pub version: String,
    pub include: Vec<String>,
}

impl BooPackageDefinition {

    pub fn name_pieces(&self) -> (String, String) {
        let mut parts = self.name.split('/');
        (parts.next().unwrap_or("").into(), parts.next().unwrap_or("").into())
    }

    pub fn scope(&self) -> String {
        self.name_pieces().0
    }
    
    pub fn package_name(&self) -> String {
        self.name_pieces().1
    }

    pub fn package_file_name(&self) -> String {
        format!("{}-{}", self.name.replace("/", "-"), self.version)
    }
}
