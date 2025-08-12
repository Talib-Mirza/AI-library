def build_verification_email(verify_url: str, user_name: str) -> str:
    return f"""
    <html>
      <body style='font-family: Arial, sans-serif; background: #f9fafb; padding: 24px;'>
        <table width='100%' cellspacing='0' cellpadding='0' style='max-width: 560px; margin: auto; background: #ffffff; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.06)'>
          <tr>
            <td>
              <h2 style='margin: 0 0 12px; color: #111827;'>Verify your email</h2>
              <p style='margin: 0 0 16px; color: #374151;'>Hi {user_name or 'there'}, thanks for registering with Thesyx. Please confirm your email address to activate your account.</p>
              <p style='margin: 0 0 24px;'>
                <a href='{verify_url}' style='display: inline-block; background: #2563eb; color: #fff; padding: 12px 16px; border-radius: 8px; text-decoration: none;'>Verify Email</a>
              </p>
              <p style='margin: 0; color: #6b7280; font-size: 12px;'>If the button doesn’t work, copy and paste this link into your browser:</p>
              <p style='margin: 8px 0 0; color: #2563eb; word-break: break-all; font-size: 12px;'>{verify_url}</p>
            </td>
          </tr>
        </table>
      </body>
    </html>
    """

def build_password_reset_email(reset_url: str, user_name: str) -> str:
    return f"""
    <html>
      <body style='font-family: Arial, sans-serif; background: #f9fafb; padding: 24px;'>
        <table width='100%' cellspacing='0' cellpadding='0' style='max-width: 560px; margin: auto; background: #ffffff; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.06)'>
          <tr>
            <td>
              <h2 style='margin: 0 0 12px; color: #111827;'>Reset your password</h2>
              <p style='margin: 0 0 16px; color: #374151;'>Hi {user_name or 'there'}, we received a request to reset your Thesyx password. Click the button below to continue.</p>
              <p style='margin: 0 0 24px;'>
                <a href='{reset_url}' style='display: inline-block; background: #2563eb; color: #fff; padding: 12px 16px; border-radius: 8px; text-decoration: none;'>Reset Password</a>
              </p>
              <p style='margin: 0; color: #6b7280; font-size: 12px;'>If you did not request a password reset, you can safely ignore this email.</p>
            </td>
          </tr>
        </table>
      </body>
    </html>
    """


def build_subscription_welcome_email(user_name: str) -> str:
    return f"""
    <html>
      <body style='font-family: Arial, sans-serif; background: #f9fafb; padding: 24px;'>
        <table width='100%' cellspacing='0' cellpadding='0' style='max-width: 560px; margin: auto; background: #ffffff; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.06)'>
          <tr>
            <td>
              <h2 style='margin: 0 0 12px; color: #111827;'>Welcome to Pro 🎉</h2>
              <p style='margin: 0 0 16px; color: #374151;'>Hi {user_name or 'there'}, thanks for subscribing to Thesyx Pro! Your higher limits are now unlocked. We’re excited to have you.</p>
              <p style='margin: 0 0 8px; color: #374151;'>Tips to get started:
                <ul>
                  <li>Upload books and ask questions with enhanced limits</li>
                  <li>Use TTS with increased monthly minutes</li>
                  <li>Track usage and renewal in your Profile</li>
                </ul>
              </p>
              <p style='margin: 8px 0 0; color: #6b7280; font-size: 12px;'>Need help? Just reply to this email.</p>
            </td>
          </tr>
        </table>
      </body>
    </html>
    """


def build_subscription_cancellation_email(user_name: str) -> str:
    return f"""
    <html>
      <body style='font-family: Arial, sans-serif; background: #f9fafb; padding: 24px;'>
        <table width='100%' cellspacing='0' cellpadding='0' style='max-width: 560px; margin: auto; background: #ffffff; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.06)'>
          <tr>
            <td>
              <h2 style='margin: 0 0 12px; color: #111827;'>We’re sorry to see you go</h2>
              <p style='margin: 0 0 16px; color: #374151;'>Hi {user_name or 'there'}, your Thesyx Pro subscription has been canceled. We’re grateful you tried us out.</p>
              <p style='margin: 0 0 8px; color: #374151;'>We’d really appreciate your feedback—what could we improve?</p>
              <p style='margin: 0; color: #6b7280; font-size: 12px;'>You can resubscribe anytime in Pricing or from “Manage Billing”.</p>
            </td>
          </tr>
        </table>
      </body>
    </html>
    """ 