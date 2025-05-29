use reqwest::Response;
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
    NetworkError(String),
    ValidationErrors(ApiValidationErrors),
    ResponseFormatError(String),
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ApiError {
    message: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ApiValidationErrors {
    pub errors: Vec<ApiValidationError>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ApiValidationError {
    pub message: String,
    pub field: String,
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

    async fn parse_response<T>(
        response_result: Result<Response, reqwest::Error>,
    ) -> Result<T, ApiRequestError>
    where
        T: DeserializeOwned,
    {
        let response = response_result.map_err(|e| ApiRequestError::NetworkError(e.to_string()))?;

        if response.status() == 422 {
            let validation_errors: ApiValidationErrors = response
                .json()
                .await
                .map_err(|e| ApiRequestError::ResponseFormatError(e.to_string()))?;
            return Err(ApiRequestError::ValidationErrors(validation_errors));
        }

        if !response.status().is_success() {
            let error: ApiError = response
                .json()
                .await
                .map_err(|e| ApiRequestError::ResponseFormatError(e.to_string()))?;
            return Err(ApiRequestError::ApiError(error.message));
        }

        response
            .json()
            .await
            .map_err(|e| ApiRequestError::ResponseFormatError(e.to_string()))
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
}
