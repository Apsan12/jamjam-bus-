import nodemailer from "nodemailer";

/* Reusable transporter */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/* Helpers */
const isValidRecipient = (to) =>
  typeof to === "string" && to.includes("@") && !/[<>]/.test(to);

const toCurrency = (n) =>
  typeof n === "number" ? n.toFixed(2) : String(n ?? "");

const formatDate = (d) => {
  const dt = d instanceof Date ? d : new Date(d);
  return isNaN(dt) ? "" : dt.toDateString();
};

/* sendMail – supports object or legacy signature */
export const sendMail = async (arg1, subject, htmlContent, textContent) => {
  let to, html, text, subj;

  if (typeof arg1 === "object" && arg1 !== null) {
    ({ to, subject: subj, html, text } = arg1);
  } else {
    to = arg1;
    subj = subject;
    html = htmlContent;
    text = textContent;
  }

  if (!isValidRecipient(to)) {
    throw new Error("Invalid recipient email address");
  }
  if (!subj || !html) {
    throw new Error("Missing subject or html content");
  }

  const from = `"GoBus" <${process.env.EMAIL_USER}>`;

  try {
    await transporter.sendMail({
      from,
      to,
      subject: subj,
      html,
      text,
    });
    // console.log("Email sent");
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};

/* Theming note: HTML layout kept as in your original templates. */

/* Welcome email (HTML only, legacy-compatible) */
export const welcomeEmailTemplate = (username, verifyLink) => {
  return `
  <div style="max-width: 600px; margin: auto; background: rgba(249, 249, 249, 0.52); 
              border-radius: 12px; padding: 30px; 
              font-family: Arial, sans-serif; color: #333; line-height: 1.6;
              box-shadow: 0 4px 12px rgba(0,0,0,0.1);">

    <div style="text-align: center; margin-bottom: 20px;">
      <img src="https://img.icons8.com/color/96/bus.png" alt="GoBus Logo" style="width:80px; height:80px;" />
    </div>

    <h2 style="color: #2b6cb0; text-align: center; margin-bottom: 10px;">
      Welcome to GoBus, ${username}!
    </h2>

    <hr style="border: none; border-top: 2px solid #eee; margin: 20px 0;" />

    <p style="font-size: 15px; text-align: center;">
      We’re excited to have you onboard 🎉  
      With <strong>GoBus</strong>, you can easily book bus tickets, track routes, 
      and enjoy a smooth travel experience.
    </p>

    <p style="font-size: 15px; text-align: center;">
      Start exploring and make your next journey easier with us.  
      We’re here to ensure every trip is <strong>safe, smooth, and comfortable</strong>.
    </p>

    <div style="text-align: center; margin-top: 25px;">
      <a href="${verifyLink}" target="_blank"
         style="display:inline-block; padding: 12px 24px; 
                background-color:#2b6cb0; color:#fff; 
                text-decoration:none; border-radius:8px; 
                font-size: 16px; font-weight: bold;">
        Verify Email
      </a>
    </div>

    <div style="text-align: center; margin-top: 30px; font-size: 14px; color: #555;">
      <p>Safe travels,</p>
      <p><strong>The GoBus Team</strong></p>
    </div>
  </div>
  `;
};

/* Reset password (HTML only, legacy-compatible) */
export const resetPasswordTemplate = (username, resetLink) => {
  return `
  <div style="max-width: 600px; margin: auto; background: rgba(249, 249, 249, 0.52); 
              border-radius: 12px; padding: 30px; 
              font-family: Arial, sans-serif; color: #333; line-height: 1.6;
              box-shadow: 0 4px 12px rgba(0,0,0,0.1);"> 
    <div style="text-align: center; margin-bottom: 20px;">
      <img src="https://img.icons8.com/color/96/bus.png" alt="GoBus Logo" style="width:80px; height:80px;" />
    </div>
    <h2 style="color: #2b6cb0; text-align: center; margin-bottom: 10px;">
      Password Reset Request
    </h2>
    <hr style="border: none; border-top: 2px solid #eee; margin: 20px 0;" />
    <p style="font-size: 15px; text-align: center;">To reset your password, please click the button below:</p>
    <div style="text-align: center; margin-top: 25px;">
      <a href="${resetLink}" target="_blank"
         style="display:inline-block; padding: 12px 24px; 
                background-color:#2b6cb0; color:#fff; 
                text-decoration:none; border-radius:8px; 
                font-size: 16px; font-weight: bold;">
        Reset Password
      </a>
    </div>
    <p style="font-size: 15px; text-align: center; margin-top: 20px;">
      If you did not request a password reset, please ignore this email.  
      This link will expire in 15 minutes.
    </p>
    <div style="text-align: center; margin-top: 30px; font-size: 14px; color: #555;">
      <p>Safe travels,</p>
      <p><strong>The GoBus Team</strong></p>
    </div>
  </div>
  `;
};

/* Booking confirmation:
   - If called as bookingConfirmationTemplate(username, details) -> returns HTML (legacy)
   - If called as bookingConfirmationTemplate({ name, bookingRef, bus, route, travelDate, seatNumbers, totalPrice })
     -> returns { subject, html, text } (preferred)
*/
export const bookingConfirmationTemplate = (arg1, arg2) => {
  if (typeof arg1 === "object" && !arg2) {
    // Preferred object form -> { subject, html, text }
    const {
      name = "Customer",
      bookingRef = "",
      bus = "",
      route = "",
      travelDate,
      seatNumbers = [],
      totalPrice = 0,
    } = arg1 || {};

    const dateStr = formatDate(travelDate);
    const seatList = Array.isArray(seatNumbers)
      ? seatNumbers.join(", ")
      : String(seatNumbers ?? "");
    const totalStr = toCurrency(totalPrice);

    const subject = `Your booking ${bookingRef}`;
    const text = `Hi ${name}, your booking ${bookingRef} for ${bus} on ${dateStr} is confirmed. Route: ${route}. Seats: ${seatList}. Total: $${totalStr}`;
    const html = `
    <div style="max-width: 600px; margin: auto; background: rgba(249, 249, 249, 0.52);  
                border-radius: 12px; padding: 30px; 
                font-family: Arial, sans-serif; color: #333; line-height: 1.6; 
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="https://img.icons8.com/color/96/bus.png" alt="GoBus Logo" style="width:80px; height:80px;" />
      </div>
      <h2 style="color: #2b6cb0; text-align: center; margin-bottom: 10px;">
        Booking Confirmation
      </h2>
      <hr style="border: none; border-top: 2px solid #eee; margin: 20px 0;" />
      <p style="font-size: 15px; text-align: center;">
        Thank you for booking with GoBus, ${name}! 🎉
      </p>
      <p style="font-size: 15px; text-align: center;">
        Here are your booking details:
      </p>
      <ul style="font-size: 15px; list-style: none; padding: 0;">
        <li><strong>Reference:</strong> ${bookingRef}</li>
        <li><strong>Bus:</strong> ${bus}</li>
        <li><strong>Route:</strong> ${route}</li>
        <li><strong>Travel Date:</strong> ${dateStr}</li>
        <li><strong>Seat Numbers:</strong> ${seatList}</li>
        <li><strong>Total Price:</strong> $${totalStr}</li>
      </ul>
      <div style="text-align: center; margin-top: 30px; font-size: 14px; color: #555;">
        <p>Safe travels,</p>
        <p><strong>The GoBus Team</strong></p>
      </div>
    </div>
    `;

    return { subject, html, text };
  }

  // Legacy 2-arg form -> HTML string only
  const username = arg1;
  const bookingDetails = arg2 || {};
  const seatList = Array.isArray(bookingDetails.seatNumbers)
    ? bookingDetails.seatNumbers.join(", ")
    : String(bookingDetails.seatNumbers ?? "");
  const dateStr = formatDate(bookingDetails.travelDate);
  const totalStr = toCurrency(bookingDetails.totalPrice);

  return `
  <div style="max-width: 600px; margin: auto; background: rgba(249, 249, 249, 0.52);  
              border-radius: 12px; padding: 30px;  
              font-family: Arial, sans-serif; color: #333; line-height: 1.6; 
              box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 20px;">
      <img src="https://img.icons8.com/color/96/bus.png" alt="GoBus Logo" style="width:80px; height:80px;" />
    </div>
    <h2 style="color: #2b6cb0; text-align: center; margin-bottom: 10px;">
      Booking Confirmation
    </h2>
    <hr style="border: none; border-top: 2px solid #eee; margin: 20px 0;" />
    <p style="font-size: 15px; text-align: center;">
      Thank you for booking with GoBus, ${username}! 🎉
    </p>
    <p style="font-size: 15px; text-align: center;">
      Here are your booking details:
    </p>
    <ul style="font-size: 15px; list-style: none; padding: 0;">
      <li><strong>Bus:</strong> ${bookingDetails.bus ?? ""}</li>
      <li><strong>Route:</strong> ${bookingDetails.route ?? ""}</li>
      <li><strong>Travel Date:</strong> ${dateStr}</li>
      <li><strong>Seat Numbers:</strong> ${seatList}</li>
      <li><strong>Total Price:</strong> $${totalStr}</li>
    </ul>
    <div style="text-align: center; margin-top: 30px; font-size: 14px; color: #555;">
      <p>Safe travels,</p>
      <p><strong>The GoBus Team</strong></p>
    </div>
  </div>
  `;
};
