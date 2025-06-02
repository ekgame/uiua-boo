use reqwest::{Error, Response, multipart};
use serde::{Deserialize, Serialize, de::DeserializeOwned};
use urlencoding;

// TODO: change default url
const DEFAULT_API_URL: &str = "http://localhost:3333/api/";

pub struct BooApiClient {
    client: reqwest::Client,
    pub app_name: String,
    pub base_url: String,
    access_token: Option<String>,
}

pub enum ApiRequestError {
    ApiError(String),
    AuthError(String),
    NetworkError(Error),
    ValidationErrors(ApiErrors),
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ApiErrors {
    pub errors: Vec<ApiError>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ApiError {
    pub message: String,
    pub field: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct AuthRequest {
    pub app_name: String,
    pub requested_permissions: Vec<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct AuthRequestResponse {
    pub private_code: String,
    pub public_code: String,
    pub expires_at: String,
    pub request_url: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct AuthRequestStatusResponse {
    pub status: AuthRequestStatus,
    pub expires_at: String,
    pub access_token: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "UPPERCASE")]
pub enum AuthRequestStatus {
    Pending,
    Approved,
    Denied,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct AuthRequestDeleteResponse {
    status: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct CreatePublishJobRequest {
    pub scope: String,
    pub name: String,
    pub version: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct PublishJob {
    pub publishing_id: i64,
    pub package_scope: String,
    pub package_name: String,
    pub publishing_version: String,
    pub status: PackagePublishJobStatus,
    pub result: Option<PublishJobResult>,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum PublishJobResult {
    Success,
    Error(PublishJobResultError),
}

#[derive(Serialize, Deserialize, Debug)]
pub struct PublishJobResultError {
    pub errors: Vec<String>,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum PackagePublishJobStatus {
    Pending,
    Queued,
    InProgress,
    Completed,
    Failed,
}

impl BooApiClient {
    pub fn new() -> Self {
        let base_url = std::env::var("BOO_API_URL").unwrap_or_else(|_| DEFAULT_API_URL.to_string());
        let app_name = format!("Boo CLI/{}", env!("CARGO_PKG_VERSION"));

        let client = reqwest::Client::builder()
            .user_agent(app_name.clone())
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .expect("Failed to create HTTP client");

        BooApiClient {
            client,
            app_name,
            base_url,
            access_token: None,
        }
    }

    pub fn set_access_token(&mut self, token: String) {
        self.access_token = Some(token);
    }

    fn get_access_token(&self) -> Result<String, ApiRequestError> {
        self.access_token.clone().ok_or(ApiRequestError::AuthError(
            "Missing access token".to_string(),
        ))
    }

    async fn parse_response<T>(
        response_result: Result<Response, reqwest::Error>,
    ) -> Result<T, ApiRequestError>
    where
        T: DeserializeOwned,
    {
        let response = response_result.map_err(|e| ApiRequestError::NetworkError(e))?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response
                .bytes()
                .await
                .map_err(ApiRequestError::NetworkError)?;

            if let Ok(api_error) = serde_json::from_slice::<ApiError>(&body) {
                return Err(ApiRequestError::ApiError(api_error.message));
            }

            if let Ok(validation_errors) = serde_json::from_slice::<ApiErrors>(&body) {
                return Err(ApiRequestError::ValidationErrors(validation_errors.clone()));
            }

            return Err(ApiRequestError::ApiError(format!(
                "Request failed with status {} and unknown error format: {}",
                status,
                String::from_utf8_lossy(&body)
            )));
        }

        let bytes = response
            .bytes()
            .await
            .map_err(ApiRequestError::NetworkError)?;

        serde_json::from_slice::<T>(&bytes).map_err(|e| {
            let body_str = String::from_utf8_lossy(&bytes);
            ApiRequestError::ApiError(format!(
                "Failed to parse JSON response: {}. Response body: {}",
                e, body_str
            ))
        })
    }

    pub async fn create_auth_request(
        &self,
        request: AuthRequest,
    ) -> Result<AuthRequestResponse, ApiRequestError> {
        let url = format!("{}auth/request", self.base_url);
        let response_result = self.client.post(&url).json(&request).send().await;
        Self::parse_response(response_result).await
    }

    pub async fn get_auth_request_status(
        &self,
        private_code: &str,
    ) -> Result<AuthRequestStatusResponse, ApiRequestError> {
        let encoded_code = urlencoding::encode(private_code);
        let url = format!("{}auth/request/{}", self.base_url, encoded_code);
        let response_result = self.client.get(&url).send().await;
        Self::parse_response(response_result).await
    }

    pub async fn delete_auth_request(
        &self,
        private_code: &str,
    ) -> Result<AuthRequestDeleteResponse, ApiRequestError> {
        let encoded_code = urlencoding::encode(private_code);
        let url = format!("{}auth/request/{}", self.base_url, encoded_code);
        let response_result = self.client.delete(&url).send().await;
        Self::parse_response(response_result).await
    }

    pub async fn create_publishing_job(
        &self,
        request: CreatePublishJobRequest,
    ) -> Result<PublishJob, ApiRequestError> {
        let url = format!("{}publish", self.base_url);
        let response_result = self
            .client
            .post(&url)
            .header(
                "Authorization",
                format!("Bearer {}", self.get_access_token()?),
            )
            .json(&request)
            .send()
            .await;

        Self::parse_response(response_result).await
    }

    pub async fn upload_package(
        &self,
        publishing_id: &i64,
        buffer: Vec<u8>,
    ) -> Result<PublishJob, ApiRequestError> {
        let part = multipart::Part::bytes(buffer.clone()).file_name("archive.tar.gz");

        let form = multipart::Form::new().part("archive", part);

        let url = format!("{}publish/{}/upload", self.base_url, publishing_id);
        let response_result = self
            .client
            .post(&url)
            .header(
                "Authorization",
                format!("Bearer {}", self.get_access_token()?),
            )
            .multipart(form)
            .send()
            .await;

        Self::parse_response(response_result).await
    }

    pub async fn get_publish_job_status(
        &self,
        publishing_id: i64,
    ) -> Result<PublishJob, ApiRequestError> {
        let url = format!("{}publish/{}", self.base_url, publishing_id);
        let response_result = self
            .client
            .get(&url)
            .header(
                "Authorization",
                format!("Bearer {}", self.get_access_token()?),
            )
            .send()
            .await;
        Self::parse_response(response_result).await
    }
}
