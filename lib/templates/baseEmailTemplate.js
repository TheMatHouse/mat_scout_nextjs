export function baseEmailTemplate({ title, message }) {
  return `
    <div style="font-family: Arial, sans-serif; padding: 20px; background: #f7f7f7;">
      <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
        <div style="background-color: #2b2d42; padding: 16px;">
          <h2 style="color: #ffffff; margin: 0;">MatScout</h2>
        </div>
        <div style="padding: 24px;">
          <h3 style="margin-top: 0; color: #333;">${title}</h3>
          <p style="color: #555; line-height: 1.6;">${message}</p>
        </div>
        <div style="background-color: #f1f1f1; padding: 16px; text-align: center; color: #888;">
          <small>&copy; ${new Date().getFullYear()} MatScout. All rights reserved.</small>
        </div>
      </div>
    </div>
  `;
}
