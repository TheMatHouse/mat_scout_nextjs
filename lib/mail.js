import nodemailer from "nodemailer";
import path from "path";
import { fileURLToPath } from "url";
import { generateTemplate } from "@/mail/template.js";
import { generateEmail } from "@/mail/generateEmail.js";

const generateMailTransporter = () => {
  let transport = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "admin@matscout.com",
      pass: process.env.EMAIL_PASS,
    },
  });

  return transport;
};

export const sendVerificationEmail = async (token, link, profile) => {
  const __filename = fileURLToPath(import.meta.url);

  const __dirname = path.dirname(__filename);

  const transport = generateMailTransporter();

  const { firstName, email } = profile;

  const welcomeMessage = `
  <p>
  Dear ${firstName}, 
  </p>
    <p>
      Welcome to MatScout, your one-stop platform for tracking the performance of all your athletes and competitors in Judo, Brazilian Jiu-Jitsu, and Wrestling. We're thrilled to have you join our community!
    </p>
    <p>
      To fully enjoy the benefits of MatScout, we kindly ask you to verify your email address. By doing so, you'll unlock all the features of a fully verified account, including:
    </p>
    <ul>
      <li>
        Comprehensive tracking of your athletes and competitors' performance
      </li>
      <li>
        Access to exclusive content and tutorials
      </li>
      <li>
        Ability to participate in community discussions
      </li>
      <li>
        Updates on the latest news and events in the grappling world
      </li>
    </ul>
    <p>
      To verify your email, simply click on the link below:
    </p>
    `;
  const welcomeSignature = `
  <p>
      Thank you for joining MatScout. We look forward to supporting you in your grappling journey!
    </p>
    <p>
    Best regards,
    <br /><br />
    The MatScout Team
    </p>
    `;
  transport.sendMail({
    to: email,
    from: process.env.VERIFICATION_EMAIL,
    subject: "Welcome to MatScout! Please Verify Your Email",
    //text: "hello world",
    html: generateTemplate({
      title: "Welcome to MatScout! Please Verify Your Email",
      message: welcomeMessage,
      logo: "cid:logo",
      banner: "cid:welcome",
      link,
      btnTitle: "Verify Your Email",
      signature: welcomeSignature,
    }),
    attachments: [
      {
        fileName: "logo.png",
        path: path.join(__dirname, "../mail/logo.png"),
        cid: "logo",
      },
      {
        fileName: "welcome.png",
        path: path.join(__dirname, "../mail/welcome.png"),
        cid: "welcome",
      },
    ],
  });
};

export const sendTeamCreatedUserInvite = async (email, message) => {
  const transport = generateMailTransporter();

  const subject = `Account created for you at MatScout!`;
  transport.sendMail({
    to: email,
    from: process.env.VERIFICATION_EMAIL,
    subject: subject,
    html: generateEmail({
      message,
      link: process.env.SIGN_IN_URL,
      linkText: `Sign in at `,
      subject: subject,
    }),
  });
};

export const sendForgotPasswordLink = async (link, profile) => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const transport = generateMailTransporter();
  const { email } = profile;
  const message = `We just received a request to reset your password.  Use the link beloow to create a new password.  <br><br> If you did not send this request, it means someone is trying to access your account and you can disregard this email.`;

  async function main() {
    let info = await transport.sendMail({
      to: email,
      from: process.env.VERIFICATION_EMAIL,
      subject: "Reset Password Link",
      //text: "hello world",
      html: generateTemplate({
        title: "Forgot Password",
        message,
        logo: "cid:logo",
        banner: "cid:forget_password",
        link,
        btnTitle: "ResetPassword",
      }),
      attachments: [
        {
          fileName: "logo.png",
          path: path.join(__dirname, "../mail/logo.png"),
          cid: "logo",
        },
        {
          filename: "forget_password.png",
          path: path.join(__dirname, "../mail/forget_password.png"),
          cid: "forget_password",
        },
      ],
    });
  }
  main().catch(console.error);
};

export const sendPassResetSuccessEmail = async (firstName, email) => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const transport = generateMailTransporter();

  const message = `Dear ${firstName}, your password has just been reset successfuly.  You can now sign in with your new password.`;

  transport.sendMail({
    to: email,
    from: process.env.VERIFICATION_EMAIL,
    subject: "Password Reset Successfully!",
    html: generateTemplate({
      title: "Password Reset Successfully",
      message,
      logo: "cid:logo",
      banner: "cid:forget_password",
      link: process.env.SIGN_IN_URL,
      btnTitle: "Sign In",
    }),
    attachments: [
      {
        fileName: "logo.png",
        path: path.join(__dirname, "../mail/logo.png"),
        cid: "logo",
      },
      {
        filename: "forget_password.png",
        path: path.join(__dirname, "../mail/forget_password.png"),
        cid: "forgot_password",
      },
    ],
  });
};

export const sendMemberRequestEmail = async (
  manager,
  teamName,
  email,
  reqFirstName,
  reqLastName
) => {
  const transport = generateMailTransporter();

  // const managerName = manager;
  // const team = teamName;
  // const athleteName = reqFirstName + " " + reqLastName;

  const message = `Hello ${manager},</span><div style="padding:20px 0"><span style="padding:1.5rem 0"><p>${reqFirstName} ${reqLastName} has requested to join , ${teamName}.</p>  <p></p> Please sign in to Matscout.com to approve or deny this request.</p>`;
  const subject = `${reqFirstName} ${reqLastName} Requests to Join ${teamName} at MatScout!`;
  const joinSignature =
    "MatScout allows you to keep track of all of your athletes and competitors' performance in one place.";
  transport.sendMail({
    to: email,
    from: process.env.VERIFICATION_EMAIL,
    subject: subject,
    signature: joinSignature,
    html: generateEmail({
      message: message,
      link: process.env.SIGN_IN_URL,
      subject: subject,
    }),
    //html: `<div style="max-width:700px;margin-bottom:1rem;display:flex;align-items:center;gap:10px;font-family:Roboto;font-weight:600;color:#2b2d42"><img src="https://firebasestorage.googleapis.com/v0/b/matscout.appspot.com/o/images%2FTMH_Email_Logo.png?alt=media&token=d1a5ba95-53d7-4b27-ad8c-fd38a441041f" alt="Mat Scout Logo" title="Mat Scout Logo" style="width: 150px"><br><br><span>Team membership request</span></div><div style="padding:1rem 0;border-top:1px solid #e5e5e5;border-bottom:1px solid #e5e5e5;color:#141823;font-size:17px;font-family:Roboto"><span><br>Hello ${manager},</span><div style="padding:20px 0"><span style="padding:1.5rem 0"><p>${reqFirstName} ${reqLastName} has requested to join your team, ${teamName}.</p>  <p></p>Please sign in to MatScout.com handle this request.</p></span></div><p><a href=https://matscout.com style="width:200px;padding:10px 15px;background:#4c649b;color:#fff;text-decoration:none;font-weight:600">Sign in to manage this request</a></p><br><div style="padding-top:20px"><span style="margin:1.5rem 0;color:#898f9c"><p>MatScout allows you to keep track of all of your athletes and competitors' performance in one place.</p></span></div></div>`,
  });
};

export const sendNewTeamMemberEmail = async (
  manager,
  teamName,
  email,
  firstName,
  lastName
) => {
  // const __filename = fileURLToPath(import.meta.url);
  // const __dirname = path.dirname(__filename);

  const transport = generateMailTransporter();

  const message = `Hello ${manager},</span><div style="padding:20px 0"><span style="padding:1.5rem 0"><p>${firstName} ${lastName} just joined your team, ${teamName}.</p>  <p>You can sign in and visit your team page to see your new member and manage their access to your team.</p>`;
  const subject = "New team member at MatScout.com!";
  transport.sendMail({
    to: email,
    from: process.env.VERIFICATION_EMAIL,
    subject: subject,
    html: generateEmail({
      message,
      link: process.env.SIGN_IN_URL,
      subject: subject,
    }),
    //html: `<div style="max-width:700px;margin-bottom:1rem;display:flex;align-items:center;gap:10px;font-family:Roboto;font-weight:600;color:#2b2d42"><img src="https://firebasestorage.googleapis.com/v0/b/matscout.appspot.com/o/images%2FTMH_Email_Logo.png?alt=media&token=d1a5ba95-53d7-4b27-ad8c-fd38a441041f" alt="Mat Scout Logo" title="Mat Scout Logo" style="width: 150px"><br><br><span>New team member</span></div><div style="padding:1rem 0;border-top:1px solid #e5e5e5;border-bottom:1px solid #e5e5e5;color:#141823;font-size:17px;font-family:Roboto"><span><br>Hello ${manager},</span><div style="padding:20px 0"><span style="padding:1.5rem 0"><p>${firstName} ${lastName} just joined your team, ${teamName}.</p>  <p></p>You can sign in and visit your team page to see your new member and manage their access to your team.</p></span></div><p><a href=https://matscout.com style="width:200px;padding:10px 15px;background:#4c649b;color:#fff;text-decoration:none;font-weight:600">Sign in to MatScout.com</a></p><br><div style="padding-top:20px"><span style="margin:1.5rem 0;color:#898f9c"><p>MatScout allows you to keep track of all of your athletes and competitors' performance in one place.</p></span></div></div>`,
  });
};

export const sendTeamApprovedEmail = async (firstName, teamName, email) => {
  const userFirstName = firstName;
  const team = teamName;
  const userEmail = email;

  const transport = generateMailTransporter();

  const message = `Hello ${userFirstName},</span><div style="padding:20px 0"><span style="padding:1.5rem 0"><p>Your request to join the team, ${team} at MatScout.com has been approved.</p>  <p>The coaches of ${team} can now create scouting reports for you.</p>`;
  const subject = "Team membership request approved!";

  transport.sendMail({
    to: userEmail,
    from: process.env.VERIFICATION_EMAIL,
    subject: subject,
    html: generateEmail({
      message,
      link: process.env.SIGN_IN_URL,
      subject: subject,
    }),
  });
};

export const sendDeletedFromTeamEmail = async (firstName, teamName, email) => {
  const transport = generateMailTransporter();

  const message = `Hello ${firstName},</span><div style="padding:20px 0"><span style="padding:1.5rem 0"><p>You have been removed from the team, ${teamName} at MatScout.com.</p>  <p>If you feel this was a mistake, you can try rejoining the team or reach out to the team manager/coach.</p>`;
  const subject = "Removed from team";

  transport.sendMail({
    to: email,
    from: process.env.VERIFICATION_EMAIL,
    subject: subject,
    html: generateEmail({
      message,
      link: process.env.SIGN_IN_URL,
      subject: subject,
    }),
    //html: `<div style="max-width:700px;margin-bottom:1rem;display:flex;align-items:center;gap:10px;font-family:Roboto;font-weight:600;color:#2b2d42"><img src="https://firebasestorage.googleapis.com/v0/b/matscout.appspot.com/o/images%2FTMH_Email_Logo.png?alt=media&token=d1a5ba95-53d7-4b27-ad8c-fd38a441041f" alt="Mat Scout Logo" title="Mat Scout Logo" style="width: 150px"><br><br><span>${subject}</span></div><div style="padding:1rem 0;border-top:1px solid #e5e5e5;border-bottom:1px solid #e5e5e5;color:#141823;font-size:17px;font-family:Roboto"><span><br>${message}</span></div><p><a href=https://matscout.com style="width:200px;padding:10px 15px;background:#4c649b;color:#fff;text-decoration:none;font-weight:600">Sign in to MatScout.com</a></p><br><div style="padding-top:20px"><span style="margin:1.5rem 0;color:#898f9c"><p>MatScout allows you to keep track of all of your athletes and competitors' performance in one place.</p></span></div></div>`,
  });
};

export const sendDeclinedFromTeamEmail = async (firstName, teamName, email) => {
  const transport = generateMailTransporter();

  const message = `Hello ${firstName},</span><div style="padding:20px 0"><span style="padding:1.5rem 0"><p>Your request to join the team, ${teamName} at MatScout.com has been declined by the team manager.</p>  <p>If you feel this was a mistake, you can try rejoining the team or reach out to the team manager/coach.</p>`;
  const subject = "Membership request declined";

  transport.sendMail({
    to: email,
    from: process.env.VERIFICATION_EMAIL,
    subject: subject,
    html: generateEmail({
      message,
      link: process.env.SIGN_IN_URL,
      subject: subject,
    }),
  });
};

export const sendNewScoutReportEmail = async (
  firstName,
  createdByName,
  teamName,
  email
) => {
  const transport = generateMailTransporter();

  const message = `Hello ${firstName},</span><div style="padding:20px 0"><span style="padding:1.5rem 0"><p>You have a new scouting report at MatScout.com.</p><p> The report was created by ${createdByName} from ${teamName}.</p> <p>Log into MatScout.com to view the report.</p>`;
  const subject = "New Scouting Report at MatScout.com";

  transport.sendMail({
    to: email,
    from: process.env.VERIFICATION_EMAIL,
    subject: subject,
    html: generateEmail({
      message,
      link: process.env.SIGN_IN_URL,
      subject: subject,
    }),
  });
};

export const sendNewFamilyMemberScoutReportEmail = async (
  parentName,
  athleteFirstName,
  createdByName,
  teamName,
  email
) => {
  const transport = generateMailTransporter();

  const message = `Hello ${parentName},</span><div style="padding:20px 0"><span style="padding:1.5rem 0"><p>There is a new scouting report for ${athleteFirstName}, at MatScout.com.</p><p> The report was created by ${createdByName} from ${teamName}.</p> <p>Log into MatScout.com to view the report.</p>`;
  const subject = "New Scouting Report at MatScout.com";

  transport.sendMail({
    to: email,
    from: process.env.VERIFICATION_EMAIL,
    subject: subject,
    html: generateEmail({
      message,
      link: process.env.SIGN_IN_URL,
      subject: subject,
    }),
  });
};

export const sendInviteWithScoutingReportEmail = async (
  coachFirstName,
  athleteFirstName,
  athleteLastName,
  coachEmail,
  reportId
) => {
  const transport = generateMailTransporter();
  const message = `Hello ${coachFirstName},</span><div style="padding:20px 0"><span style="padding:1.5rem 0"><p>${athleteFirstName} ${athleteLastName} has invited you to join MatScout.com and has given you access to a scouting report.</p> <p>Log into MatScout.com to view the report.</p>`;
  const subject = "You have been invited to join MatScout.com";

  transport.sendMail({
    to: coachEmail,
    from: process.env.VERIFICATION_EMAIL,
    subject: subject,
    html: generateEmail({
      message,
      link: `${process.env.SIGN_UP_URL}?rID=${reportId}`,
      linkText: `Sign Up at `,
      subject: subject,
    }),
  });
};

export const sendAdminContactUs = async (messageType) => {
  const transport = generateMailTransporter();
  const message = `Hello Admin,</span><div style="padding:20px 0"><span style="padding:1.5rem 0"><p>A new, ${messageType}, message has been sent from the contact us page at MatScout.com</p> <p>Log into MatScout.com to view the message in the admin section.</p>`;
  const subject = `New ${messageType} message at MatScout.com`;

  transport.sendMail({
    to: "admin@matscout.com",
    cc: "judo2000@comcast.net, rcolema3@gmail.com",
    from: process.env.VERIFICATION_EMAIL,
    subject: subject,
    html: generateEmail({
      message,
      link: `${process.env.SIGN_IN_URL}?forward=/admin?type=listMessages`,
      linkText: `Sign Up at `,
      subject: subject,
    }),
  });
};

export const respondToContactMessage = async (email, subject, message) => {
  const transport = generateMailTransporter();

  transport.sendMail({
    to: email,
    from: process.env.VERIFICATION_EMAIL,
    subject: subject,
    html: generateEmail({
      message,
      link: process.env.SIGN_IN_URL,
      linkText: `Sign in at `,
      subject: subject,
    }),
  });
};

// export const sendForgotPasswordLink = async (link, profile) => {
//   const { email } = profile;
//   const __filename = fileURLToPath(import.meta.url);

//   const __dirname = path.dirname(__filename);

//   const message = `We just received a request to reset your password.  Use the link beloow to create a new password.  <br><br> If you did not send this request, it means someone is trying to access your account and you can disregard this email.`;

//   async function main() {
//     let transporter = nodemailer.createTransport({
//       host: "smtp.comcast.net",
//       port: 587,
//       secure: false,
//       auth: {
//         user: "judo2000@comcast.net",
//         pass: process.env.EMAIL_PASS,
//       },
//     });

//     let info = await transporter.sendMail({
//       from: `"MatScout" <judo2000@comcast.net>`,
//       to: email,
//       subject: "Password Reset Successfully!",
//       text: "Hello world?",
//       html: generateTemplate({
//         title: "Forgot Password",
//         message,
//         logo: "cid:logo",
//         banner: "cid:forget_password",
//         link,
//         btnTitle: "ResetPassword",
//       }),
//       attachments: [
//         {
//           fileName: "logo.png",
//           path: path.join(__dirname, "../mail/logo.png"),
//           cid: "logo",
//         },
//         {
//           filename: "forget_password.png",
//           path: path.join(__dirname, "../mail/forget_password.png"),
//           cid: "forget_password",
//         },
//       ],
//     });
//   }
//   main().catch(console.errors);
// };
