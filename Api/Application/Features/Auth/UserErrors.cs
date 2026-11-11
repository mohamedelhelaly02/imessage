using Api.Shared.Abstraction;

namespace Api.Application.Features.Auth;

public static class UserErrors
{
    public static Error EmailInUse => Error.Conflict(message: "Email is already in use.");
    public static Error AccountLocked => Error.Validation(message: "Your account has been temporarily locked due to too many failed login attempts. Please try again in 15 minutes.");
    public static Error EmailNotConfirmed => Error.Validation(message: "Email is not confirmed");
    public static Error InvalidEmailConfirmationOtp => Error.Validation(
        "User.INVALID_EMAIL_CONFIRMATION_OTP",
        "The verification code is invalid or has expired.");
    public static Error RegistrationFailed(Dictionary<string, string[]> errors) => Error.Validation("User.REGISTRATION_FAILED", "User registration failed.", errors);
    public static Error RoleAssignmentFailed(Dictionary<string, string[]> errors) => Error.Validation("User.ROLE_ASSIGNMENT_FAILED", "Role assignment failed.", errors);
    public static Error InvalidCredentials => Error.Unauthorized("User.INVALID_CREDENTIALS");
    public static Error InvalidTwoFactorCode => Error.Unauthorized("User.INVALID_TWO_FACTOR_CODE", "The authentication code is invalid.");
    public static Error InvalidPassword => Error.Validation("User.INVALID_PASSWORD", "The current password is incorrect.");
    public static Error InvalidAuthenticatorCode => Error.Validation("User.INVALID_AUTHENTICATOR_CODE", "The authenticator code is invalid.");
    public static Error InvalidPasswordResetToken => Error.Validation("User.INVALID_PASSWORD_RESET_TOKEN", "The password reset link is invalid or has expired.");
    public static Error PasswordResetFailed(Dictionary<string, string[]> errors) => Error.Validation("User.PASSWORD_RESET_FAILED", "Password reset failed.", errors);
    public static Error PasswordChangeFailed(Dictionary<string, string[]> errors) => Error.Validation("User.PASSWORD_CHANGE_FAILED", "Password change failed.", errors);
    public static Error ProfileUpdateFailed(Dictionary<string, string[]> errors) => Error.Validation("User.PROFILE_UPDATE_FAILED", "Profile update failed.", errors);
    public static Error TwoFactorAlreadyEnabled => Error.Conflict("User.TWO_FACTOR_ALREADY_ENABLED", "Two-factor authentication is already enabled.");
    public static Error TwoFactorNotEnabled => Error.Validation("User.TWO_FACTOR_NOT_ENABLED", "Two-factor authentication is not enabled.");

    public static Error UserNotFound => Error.NotFound(message: "The specified user does not exist.");
}
