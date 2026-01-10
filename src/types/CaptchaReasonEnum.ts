// Doc.: https://docs.cloud.google.com/recaptcha/docs/reference/rest/v1/projects.assessments#invalidreason
export enum CaptchaReasonEnum {
  INVALID_REASON_UNSPECIFIED = "INVALID_REASON_UNSPECIFIED",
  UNKNOWN_INVALID_REASON = "UNKNOWN_INVALID_REASON",
  MALFORMED = "MALFORMED",
  EXPIRED = "EXPIRED",
  DUPE = "DUPE",
  MISSING = "MISSING",
  BROWSER_ERROR = "BROWSER_ERROR",
  UNEXPECTED_ACTION = "UNEXPECTED_ACTION"
}