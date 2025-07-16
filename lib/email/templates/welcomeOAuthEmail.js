export function welcomeOAuthEmail({ to }) {
  return {
    to,
    subject: "Welcome to MatScout!",
    html: `
      <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2 style="color: #2b2d42;">Welcome to <strong>MatScout</strong>!</h2>
          <p style="font-size: 16px; color: #333;">
            Thanks for signing up with your Google or Facebook account. Your profile is ready to go!
          </p>
          <div style="margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_DOMAIN}/dashboard" 
              style="display: inline-block; background-color: #2b2d42; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
              Go to Dashboard
            </a>
          </div>
          <p style="font-size: 14px; color: #666;">
            If you didn't sign up, feel free to ignore this message.
          </p>
        </div>
      </div>
    `,
  };
}
