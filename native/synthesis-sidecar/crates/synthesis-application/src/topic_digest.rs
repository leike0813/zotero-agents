use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::sync::Arc;

const REPRESENTATIVE_IMAGE_BYTES_MAX: usize = 2 * 1024 * 1024;
const DIAGNOSTICS_MAX: usize = 20;
const DIAGNOSTIC_MAX_CHARS: usize = 512;
const PRESENTATION_MAX_CHARS: usize = 4_096;
const SOURCE_METADATA_MAX_CHARS: usize = 128;
const MIME_TYPE_MAX_CHARS: usize = 256;
const JSON_SAFE_INTEGER_MAX: u64 = 9_007_199_254_740_991;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct TopicPaperDigestRequest {
    pub paper_ref: String,
    pub locator: Option<String>,
    pub recorded_hash: String,
    pub library_id: Option<i64>,
    pub note_key: Option<String>,
    pub include_representative_image: bool,
}

impl TopicPaperDigestRequest {
    pub fn from_value(value: &Value) -> Result<Self, String> {
        let object = value
            .as_object()
            .ok_or_else(|| "invalid_request".to_owned())?;
        let digest_ref = object
            .get("digest_ref")
            .or_else(|| object.get("digestRef"))
            .and_then(Value::as_object);
        let string = |names: &[&str]| {
            names.iter().find_map(|name| {
                object
                    .get(*name)
                    .or_else(|| digest_ref.and_then(|digest| digest.get(*name)))
                    .and_then(Value::as_str)
                    .map(str::trim)
                    .filter(|value| !value.is_empty())
                    .map(str::to_owned)
            })
        };
        let library_id = ["library_id", "libraryId"].iter().find_map(|name| {
            digest_ref
                .and_then(|digest| digest.get(*name))
                .and_then(Value::as_i64)
        });
        if library_id.is_some_and(|value| value <= 0) {
            return Err("invalid_request".into());
        }
        let note_key = string(&["note_key", "noteKey"]);
        if note_key
            .as_deref()
            .is_some_and(|value| !valid_item_key(value))
        {
            return Err("invalid_request".into());
        }
        Ok(Self {
            paper_ref: string(&["paper_ref", "paperRef"]).unwrap_or_default(),
            locator: string(&["locator"]),
            recorded_hash: string(&[
                "payload_hash",
                "payloadHash",
                "expected_hash",
                "expectedHash",
            ])
            .unwrap_or_default(),
            library_id,
            note_key,
            include_representative_image: object
                .get("include_representative_image")
                .or_else(|| object.get("includeRepresentativeImage"))
                .is_some_and(Value::is_boolean)
                && object
                    .get("include_representative_image")
                    .or_else(|| object.get("includeRepresentativeImage"))
                    .and_then(Value::as_bool)
                    .unwrap_or(false),
        })
    }
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TopicDigestArtifactReadResult {
    pub status: String,
    #[serde(default)]
    pub payload_hash: String,
    #[serde(default)]
    pub current_hash: String,
    #[serde(default)]
    pub content: Option<TopicDigestArtifactContent>,
    #[serde(default)]
    pub diagnostics: Vec<String>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(tag = "kind", rename_all = "lowercase", deny_unknown_fields)]
pub enum TopicDigestArtifactContent {
    Text {
        text: String,
        #[serde(rename = "mediaType")]
        media_type: String,
    },
    Json {
        value: Value,
    },
}

pub trait TopicDigestArtifactReadPort: Send + Sync {
    fn read(
        &self,
        locator: &str,
        expected_hash: &str,
    ) -> Result<TopicDigestArtifactReadResult, String>;
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum RepresentativeImageReadFailure {
    Transport,
    Invalid,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(tag = "status", rename_all = "snake_case", deny_unknown_fields)]
pub enum RepresentativeImageHostResult {
    Absent {
        diagnostics: Vec<String>,
    },
    Unavailable {
        #[serde(rename = "attachmentKey", default)]
        attachment_key: Option<String>,
        #[serde(default)]
        alt: Option<String>,
        #[serde(default)]
        caption: Option<String>,
        #[serde(rename = "sourceKind", default)]
        source_kind: Option<String>,
        #[serde(default)]
        strategy: Option<String>,
        diagnostics: Vec<String>,
    },
    Available {
        #[serde(rename = "attachmentKey")]
        attachment_key: String,
        #[serde(rename = "mimeType")]
        mime_type: String,
        #[serde(rename = "contentBase64")]
        content_base64: String,
        alt: String,
        caption: String,
        #[serde(default)]
        width: Option<u64>,
        #[serde(default)]
        height: Option<u64>,
        #[serde(rename = "compressedBytes")]
        compressed_bytes: usize,
        #[serde(rename = "sourceKind", default)]
        source_kind: Option<String>,
        #[serde(default)]
        strategy: Option<String>,
        diagnostics: Vec<String>,
    },
}

pub trait RepresentativeImageReadPort: Send + Sync {
    fn read(
        &self,
        library_id: i64,
        note_key: &str,
    ) -> Result<RepresentativeImageHostResult, RepresentativeImageReadFailure>;
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
pub struct RepresentativeImageProjection {
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub attachment_key: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub alt: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub caption: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mime_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub width: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub height: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub compressed_bytes: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source_kind: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub strategy: Option<String>,
    pub diagnostics: Vec<String>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
pub struct TopicPaperDigestResult {
    pub ok: bool,
    pub status: String,
    pub paper_ref: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub note_key: Option<String>,
    pub digest_markdown: String,
    pub recorded_hash: String,
    pub current_hash: String,
    pub source_changed: bool,
    pub diagnostics: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub representative_image: Option<RepresentativeImageProjection>,
}

pub struct TopicPaperDigestApplication {
    artifacts: Arc<dyn TopicDigestArtifactReadPort>,
    representative_images: Arc<dyn RepresentativeImageReadPort>,
}

impl TopicPaperDigestApplication {
    pub fn new(
        artifacts: Arc<dyn TopicDigestArtifactReadPort>,
        representative_images: Arc<dyn RepresentativeImageReadPort>,
    ) -> Self {
        Self {
            artifacts,
            representative_images,
        }
    }

    pub fn resolve(
        &self,
        request: TopicPaperDigestRequest,
    ) -> Result<TopicPaperDigestResult, String> {
        let unavailable = |diagnostics: Vec<String>| TopicPaperDigestResult {
            ok: false,
            status: "unavailable".into(),
            paper_ref: request.paper_ref.clone(),
            note_key: request.note_key.clone(),
            digest_markdown: String::new(),
            recorded_hash: request.recorded_hash.clone(),
            current_hash: String::new(),
            source_changed: false,
            diagnostics,
            representative_image: None,
        };
        let Some(locator) = request.locator.as_deref() else {
            return Ok(unavailable(vec!["digest_unavailable".into()]));
        };
        if request.recorded_hash.is_empty() {
            return Err("invalid_request".into());
        }
        let artifact = self.artifacts.read(locator, &request.recorded_hash)?;
        validate_diagnostics(&artifact.diagnostics, true)
            .map_err(|_| "reverse_host_result_invalid".to_owned())?;
        if artifact.status != "available" {
            return Ok(unavailable(if artifact.diagnostics.is_empty() {
                vec!["digest_unavailable".into()]
            } else {
                artifact.diagnostics
            }));
        }
        let markdown = match artifact.content {
            Some(TopicDigestArtifactContent::Text { text, media_type })
                if matches!(media_type.as_str(), "text/markdown" | "text/plain") =>
            {
                text
            }
            _ => String::new(),
        };
        if markdown.is_empty() {
            return Ok(unavailable(vec!["digest_unavailable".into()]));
        }
        let current_hash = if artifact.current_hash.is_empty() {
            artifact.payload_hash
        } else {
            artifact.current_hash
        };
        let representative_image = if request.include_representative_image {
            match (request.library_id, request.note_key.as_deref()) {
                (Some(library_id), Some(note_key)) => {
                    Some(self.read_representative_image(library_id, note_key))
                }
                _ => None,
            }
        } else {
            None
        }
        .flatten();
        Ok(TopicPaperDigestResult {
            ok: true,
            status: "available".into(),
            paper_ref: request.paper_ref,
            note_key: request.note_key,
            digest_markdown: markdown,
            recorded_hash: request.recorded_hash.clone(),
            source_changed: !request.recorded_hash.is_empty()
                && !current_hash.is_empty()
                && request.recorded_hash != current_hash,
            current_hash,
            diagnostics: artifact.diagnostics,
            representative_image,
        })
    }

    fn read_representative_image(
        &self,
        library_id: i64,
        note_key: &str,
    ) -> Option<RepresentativeImageProjection> {
        match self.representative_images.read(library_id, note_key) {
            Err(RepresentativeImageReadFailure::Transport) => {
                Some(unavailable_image("representative_image_host_read_failed"))
            }
            Err(RepresentativeImageReadFailure::Invalid) => Some(unavailable_image(
                "representative_image_host_result_invalid",
            )),
            Ok(result) => match project_representative_image(result) {
                Ok(result) => result,
                Err(()) => Some(unavailable_image(
                    "representative_image_host_result_invalid",
                )),
            },
        }
    }
}

fn unavailable_image(code: &str) -> RepresentativeImageProjection {
    RepresentativeImageProjection {
        status: "unavailable".into(),
        attachment_key: None,
        alt: None,
        caption: None,
        mime_type: None,
        data_url: None,
        width: None,
        height: None,
        compressed_bytes: None,
        source_kind: None,
        strategy: None,
        diagnostics: vec![code.into()],
    }
}

fn project_representative_image(
    result: RepresentativeImageHostResult,
) -> Result<Option<RepresentativeImageProjection>, ()> {
    match result {
        RepresentativeImageHostResult::Absent { diagnostics } => {
            validate_diagnostics(&diagnostics, true)?;
            if diagnostics.is_empty() {
                Ok(None)
            } else {
                Err(())
            }
        }
        RepresentativeImageHostResult::Unavailable {
            attachment_key,
            alt,
            caption,
            source_kind,
            strategy,
            diagnostics,
        } => {
            validate_diagnostics(&diagnostics, false)?;
            validate_optional_item_key(&attachment_key)?;
            validate_optional_text(&alt, PRESENTATION_MAX_CHARS)?;
            validate_optional_text(&caption, PRESENTATION_MAX_CHARS)?;
            validate_optional_text(&source_kind, SOURCE_METADATA_MAX_CHARS)?;
            validate_optional_text(&strategy, SOURCE_METADATA_MAX_CHARS)?;
            Ok(Some(RepresentativeImageProjection {
                status: "unavailable".into(),
                attachment_key,
                alt: normalized_optional_text(alt),
                caption: normalized_optional_text(caption),
                mime_type: None,
                data_url: None,
                width: None,
                height: None,
                compressed_bytes: None,
                source_kind: normalized_optional_text(source_kind),
                strategy: normalized_optional_text(strategy),
                diagnostics,
            }))
        }
        RepresentativeImageHostResult::Available {
            attachment_key,
            mime_type,
            content_base64,
            alt,
            caption,
            width,
            height,
            compressed_bytes,
            source_kind,
            strategy,
            diagnostics,
        } => {
            validate_diagnostics(&diagnostics, true)?;
            if !valid_item_key(&attachment_key)
                || !valid_mime_type(&mime_type)
                || !valid_required_text(&alt, PRESENTATION_MAX_CHARS)
                || !valid_required_text(&caption, PRESENTATION_MAX_CHARS)
                || width.is_some_and(|value| value == 0 || value > JSON_SAFE_INTEGER_MAX)
                || height.is_some_and(|value| value == 0 || value > JSON_SAFE_INTEGER_MAX)
                || validate_optional_text(&source_kind, SOURCE_METADATA_MAX_CHARS).is_err()
                || validate_optional_text(&strategy, SOURCE_METADATA_MAX_CHARS).is_err()
            {
                return Err(());
            }
            let decoded_bytes = decoded_base64_bytes(&content_base64).ok_or(())?;
            if decoded_bytes == 0
                || decoded_bytes > REPRESENTATIVE_IMAGE_BYTES_MAX
                || decoded_bytes != compressed_bytes
            {
                return Err(());
            }
            Ok(Some(RepresentativeImageProjection {
                status: "available".into(),
                attachment_key: Some(attachment_key),
                alt: Some(alt.trim().into()),
                caption: Some(caption.trim().into()),
                mime_type: Some(mime_type.to_ascii_lowercase()),
                data_url: Some(format!(
                    "data:{};base64,{content_base64}",
                    mime_type.to_ascii_lowercase()
                )),
                width,
                height,
                compressed_bytes: Some(compressed_bytes),
                source_kind: normalized_optional_text(source_kind),
                strategy: normalized_optional_text(strategy),
                diagnostics,
            }))
        }
    }
}

fn valid_item_key(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= 128
        && value.bytes().all(|byte| byte.is_ascii_alphanumeric())
}

fn valid_mime_type(value: &str) -> bool {
    let value = value.to_ascii_lowercase();
    value.len() <= MIME_TYPE_MAX_CHARS
        && value.strip_prefix("image/").is_some_and(|suffix| {
            !suffix.is_empty()
                && suffix.bytes().all(|byte| {
                    byte.is_ascii_lowercase()
                        || byte.is_ascii_digit()
                        || b"!#$&^_.+-".contains(&byte)
                })
        })
}

fn normalized_optional_text(value: Option<String>) -> Option<String> {
    value.map(|value| value.trim().to_owned())
}

fn valid_required_text(value: &str, max_chars: usize) -> bool {
    let trimmed = value.trim();
    !trimmed.is_empty() && trimmed.chars().count() <= max_chars
}

fn validate_optional_text(value: &Option<String>, max_chars: usize) -> Result<(), ()> {
    if value
        .as_deref()
        .is_some_and(|value| !valid_required_text(value, max_chars))
    {
        return Err(());
    }
    Ok(())
}

fn validate_optional_item_key(value: &Option<String>) -> Result<(), ()> {
    if value.as_deref().is_some_and(|value| !valid_item_key(value)) {
        return Err(());
    }
    Ok(())
}

fn validate_diagnostics(diagnostics: &[String], allow_empty: bool) -> Result<(), ()> {
    if diagnostics.len() > DIAGNOSTICS_MAX || (!allow_empty && diagnostics.is_empty()) {
        return Err(());
    }
    if diagnostics
        .iter()
        .any(|value| !valid_required_text(value, DIAGNOSTIC_MAX_CHARS))
    {
        return Err(());
    }
    Ok(())
}

fn decoded_base64_bytes(value: &str) -> Option<usize> {
    let bytes = value.as_bytes();
    if bytes.is_empty() || !bytes.len().is_multiple_of(4) {
        return None;
    }
    let padding = if bytes.ends_with(b"==") {
        2
    } else if bytes.ends_with(b"=") {
        1
    } else {
        0
    };
    let content_len = bytes.len() - padding;
    if bytes[..content_len]
        .iter()
        .any(|byte| !byte.is_ascii_alphanumeric() && !b"+/".contains(byte))
        || bytes[content_len..].iter().any(|byte| *byte != b'=')
        || bytes[..content_len].contains(&b'=')
    {
        return None;
    }
    Some((bytes.len() / 4) * 3 - padding)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Mutex;

    struct ArtifactPort;

    impl TopicDigestArtifactReadPort for ArtifactPort {
        fn read(
            &self,
            _locator: &str,
            _expected_hash: &str,
        ) -> Result<TopicDigestArtifactReadResult, String> {
            Ok(TopicDigestArtifactReadResult {
                status: "available".into(),
                payload_hash: "next".into(),
                current_hash: "next".into(),
                content: Some(TopicDigestArtifactContent::Text {
                    text: "# Digest".into(),
                    media_type: "text/markdown".into(),
                }),
                diagnostics: Vec::new(),
            })
        }
    }

    struct ImagePort {
        calls: Mutex<Vec<(i64, String)>>,
        result:
            Mutex<Option<Result<RepresentativeImageHostResult, RepresentativeImageReadFailure>>>,
    }

    impl RepresentativeImageReadPort for ImagePort {
        fn read(
            &self,
            library_id: i64,
            note_key: &str,
        ) -> Result<RepresentativeImageHostResult, RepresentativeImageReadFailure> {
            self.calls
                .lock()
                .unwrap()
                .push((library_id, note_key.into()));
            self.result.lock().unwrap().take().unwrap()
        }
    }

    fn request(include: bool) -> TopicPaperDigestRequest {
        TopicPaperDigestRequest {
            paper_ref: "1:AAAA1111".into(),
            locator: Some("digest:1".into()),
            recorded_hash: "old".into(),
            library_id: Some(1),
            note_key: Some("NOTE0001".into()),
            include_representative_image: include,
        }
    }

    #[test]
    fn projects_available_image_and_skips_opt_out() {
        let image = Arc::new(ImagePort {
            calls: Mutex::new(Vec::new()),
            result: Mutex::new(Some(Ok(RepresentativeImageHostResult::Available {
                attachment_key: "IMAGE001".into(),
                mime_type: "image/png".into(),
                content_base64: "aGVsbG8=".into(),
                alt: "Figure".into(),
                caption: "Caption".into(),
                width: Some(640),
                height: Some(480),
                compressed_bytes: 5,
                source_kind: Some("attachment".into()),
                strategy: Some("explicit".into()),
                diagnostics: Vec::new(),
            }))),
        });
        let application = TopicPaperDigestApplication::new(Arc::new(ArtifactPort), image.clone());
        let result = application.resolve(request(true)).unwrap();
        assert_eq!(
            result.representative_image.unwrap().data_url.as_deref(),
            Some("data:image/png;base64,aGVsbG8=")
        );
        assert_eq!(*image.calls.lock().unwrap(), vec![(1, "NOTE0001".into())]);

        let skipped = Arc::new(ImagePort {
            calls: Mutex::new(Vec::new()),
            result: Mutex::new(None),
        });
        let application = TopicPaperDigestApplication::new(Arc::new(ArtifactPort), skipped.clone());
        assert!(
            application
                .resolve(request(false))
                .unwrap()
                .representative_image
                .is_none()
        );
        assert!(skipped.calls.lock().unwrap().is_empty());
    }

    #[test]
    fn degrades_transport_and_invalid_image_without_failing_digest() {
        for (failure, code) in [
            (
                RepresentativeImageReadFailure::Transport,
                "representative_image_host_read_failed",
            ),
            (
                RepresentativeImageReadFailure::Invalid,
                "representative_image_host_result_invalid",
            ),
        ] {
            let image = Arc::new(ImagePort {
                calls: Mutex::new(Vec::new()),
                result: Mutex::new(Some(Err(failure))),
            });
            let application = TopicPaperDigestApplication::new(Arc::new(ArtifactPort), image);
            let result = application.resolve(request(true)).unwrap();
            assert!(result.ok);
            assert_eq!(result.representative_image.unwrap().diagnostics, vec![code]);
        }
    }

    #[test]
    fn rejects_invalid_base64_and_oversized_decoded_content() {
        assert_eq!(decoded_base64_bytes("not-base64"), None);
        let oversized = "AAAA".repeat((REPRESENTATIVE_IMAGE_BYTES_MAX / 3) + 2);
        assert!(decoded_base64_bytes(&oversized).unwrap() > REPRESENTATIVE_IMAGE_BYTES_MAX);

        let available = serde_json::json!({
            "status":"available",
            "attachmentKey":"IMAGE001",
            "mimeType":"image/png",
            "contentBase64":"aGVsbG8=",
            "alt":" Figure ",
            "caption":" Caption ",
            "width":640,
            "height":480,
            "compressedBytes":5,
            "sourceKind":" attachment ",
            "strategy":" explicit ",
            "diagnostics":[],
        });
        let projection = project_representative_image(
            serde_json::from_value(available.clone()).expect("available result"),
        )
        .expect("valid projection")
        .expect("available projection");
        assert_eq!(projection.alt.as_deref(), Some("Figure"));
        assert_eq!(projection.source_kind.as_deref(), Some("attachment"));

        let mut unknown = available.clone();
        unknown["unknown"] = Value::Bool(true);
        assert!(serde_json::from_value::<RepresentativeImageHostResult>(unknown).is_err());

        let mut invalid_results = Vec::new();
        let mut invalid_mime = available.clone();
        invalid_mime["mimeType"] = Value::String("text/plain".into());
        invalid_results.push(invalid_mime);
        let mut invalid_size = available.clone();
        invalid_size["compressedBytes"] = Value::from(4);
        invalid_results.push(invalid_size);
        let mut invalid_dimension = available.clone();
        invalid_dimension["width"] = Value::from(JSON_SAFE_INTEGER_MAX + 1);
        invalid_results.push(invalid_dimension);
        let mut excessive_diagnostics = available;
        excessive_diagnostics["diagnostics"] = Value::Array(
            (0..=DIAGNOSTICS_MAX)
                .map(|index| Value::String(format!("diagnostic-{index}")))
                .collect(),
        );
        invalid_results.push(excessive_diagnostics);
        for invalid in invalid_results {
            let result = serde_json::from_value(invalid).expect("typed invalid result");
            assert_eq!(project_representative_image(result), Err(()));
        }
    }
}
