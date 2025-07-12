// lib/emailTemplates/baseEmailTemplate.js

export function baseEmailTemplate({ title, message }) {
  return `
    <div style="background-color: #f9fafb; padding: 40px 0; font-family: sans-serif; color: #111827;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
        <div style="background-color: #1f2937; padding: 20px; text-align: center;">
          <img src="https://res.cloudinary.com/matscout/image/upload/v1752188084/matScout_email_logo_rx30tk.png" alt="MatScout Logo" style="max-height: 60px;" />
        </div>
        <div style="padding: 30px;">
          <h2 style="margin: 0 0 20px 0; font-size: 20px; color: #111827;">${title}</h2>
          ${message}
          <div style="margin-top: 30px; text-align: center;">
            <a href="https://matscout.com" style="display: inline-block; padding: 10px 20px; background-color: #dc2626; color: white; text-decoration: none; border-radius: 6px;">Login to MatScout</a>
          </div>
        </div>
      </div>
    </div>
  `;
}
