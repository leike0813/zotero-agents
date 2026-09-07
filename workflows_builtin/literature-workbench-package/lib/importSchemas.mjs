import {
  validateReferences,
  validateCitation,
  validateScore,
} from "./canonicalLiteratureValidators.mjs";

function validate(value, validator) {
  const valid = validator(value);
  return {
    valid,
    errors: valid
      ? []
      : validator.errors.map(
          (error) => `${error.instancePath || "/"}: ${error.message}`,
        ),
  };
}

export function validateImportedReferencesPayload(value) {
  return validate(value, validateReferences);
}

export function validateImportedCitationPayload(value) {
  return validate(value, validateCitation);
}

function parse(value, validator) {
  const result = validate(value, validator);
  if (!result.valid) {
    const error = new Error(result.errors.join("; "));
    error.code = "invalid_artifact";
    throw error;
  }
  return value;
}

export function parseImportedReferencesArtifact(value) {
  return parse(value, validateReferences);
}

export function parseImportedCitationArtifact(value) {
  return parse(value, validateCitation);
}

export function parseImportedScoreArtifact(value) {
  return parse(value, validateScore);
}
