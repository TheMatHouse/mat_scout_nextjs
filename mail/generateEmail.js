export const generateEmail = ({ message, subject, link, linkText }) => {
  return `
    <div style="max-width:700px;margin-bottom:1rem;display:flex;align-items:center;gap:10px;font-family:Roboto;font-weight:600;color:#2b2d42">
      <img src="https://firebasestorage.googleapis.com/v0/b/matscout.appspot.com/o/images%2Fmat_scout_logo.jpg?alt=media&token=1c2bb1a5-cb72-4396-affc-990480ecada6" alt="Mat Scout Logo" title="Mat Scout Logo" style="width: 120px">
      <br><br>
      <span>${subject}</span>
    </div>
    <div style="padding:1rem 0;border-top:1px solid #e5e5e5;border-bottom:1px solid #e5e5e5;color:#141823;font-size:17px;font-family:Roboto">
      <span><br>${message}</span>
    </div>
    <p>
      <a href="${link}" style="
        text-decoration: none;
        display: inline-block;
        color: #ffffff;
        background-color: #101;
        border-radius: 4px;
        width: auto;
        border-top: 1px solid #101;
        font-weight: undefined;
        border-right: 1px solid #101;
        border-bottom: 1px solid #101;
        border-left: 1px solid #101;
        padding-top: 5px;
        padding-bottom: 5px;
        font-family: Arial, Helvetica Neue,
          Helvetica, sans-serif;
        font-size: 14px;
        text-align: center;
        mso-border-alt: none;
        word-break: keep-all;
      "
      target="_blank"
    >
    <span
      style="
        padding-left: 8px;
        padding-right: 8px;
        font-size: 14px;
        display: inline-block;
        letter-spacing: normal;
      "
      >
      <span
        style="
          word-break: break-word;
          line-height: 18px;
        "
        >${linkText ? linkText : "Sign in to"} MatScout.com</span></span></a>
    </p>
    <p>Welcome to the team! We look forward to helping you achieve your goals.</p>
        <p>Best regards</p>
        <p>The MatScout Team</p>
    <br>
    <div style="padding-top:20px">
      <span style="margin:1.5rem 0;color:#898f9c">
        <p>
        MatScout allows you to keep track of all of your athletes and competitors' performance in one place.
        </p>
      </span>
    </div>
  </div>`;
};
