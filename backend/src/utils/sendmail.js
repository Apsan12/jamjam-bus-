import nodemailer from "nodemailer";

export const sendMail = async (to, subject, htmlContent) => {
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    secure: false,
    port: 587,
    tls: { rejectUnauthorized: false },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    html: htmlContent, // ✅ directly use the passed HTML
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Email sent successfully");
  } catch (error) {
    console.error("Error sending email:", error);
  }
};

export const welcomeEmailTemplate = (username, verifyLink) => {
  return `
  <div style="max-width: 600px; margin: auto; background: rgba(249, 249, 249, 0.52); 
              border-radius: 12px; padding: 30px; 
              font-family: Arial, sans-serif; color: #333; line-height: 1.6;
              box-shadow: 0 4px 12px rgba(0,0,0,0.1);">

    <!-- Logo -->
    <div style="text-align: center; margin-bottom: 20px;">
      <img src="https://img.icons8.com/color/96/bus.png" alt="GoBus Logo" style="width:80px; height:80px;" />
    </div>

    <!-- Heading -->
    <h2 style="color: #2b6cb0; text-align: center; margin-bottom: 10px;">
      Welcome to GoBus, ${username}!
    </h2>

    <!-- Divider -->
    <hr style="border: none; border-top: 2px solid #eee; margin: 20px 0;" />

    <!-- Body -->
    <p style="font-size: 15px; text-align: center;">
      We’re excited to have you onboard 🎉  
      With <strong>GoBus</strong>, you can easily book bus tickets, track routes, 
      and enjoy a smooth travel experience.
    </p>

    <p style="font-size: 15px; text-align: center;">
      Start exploring and make your next journey easier with us.  
      We’re here to ensure every trip is <strong>safe, smooth, and comfortable</strong>.
    </p>

    <!-- Button -->
    <div style="text-align: center; margin-top: 25px;">
      <a href="${verifyLink}" target="_blank"
         style="display:inline-block; padding: 12px 24px; 
                background-color:#2b6cb0; color:#fff; 
                text-decoration:none; border-radius:8px; 
                font-size: 16px; font-weight: bold;">
        Verify Email
      </a>
    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 30px; font-size: 14px; color: #555;">
      <p>Safe travels,</p>
      <p><strong>The GoBus Team</strong></p>
    </div>
  </div>
  `;
};

export const resetPasswordTemplate = (username, resetLink) => {
  return `
  <div style="max-width: 600px; margin: auto; background: rgba(249, 249, 249, 0.52); 
              border-radius: 12px; padding: 30px; 
              font-family: Arial, sans-serif; color: #333; line-height: 1.6;
              box-shadow: 0 4px 12px rgba(0,0,0,0.1);"> 
    <!-- Logo -->
    <div style="text-align: center; margin-bottom: 20px;">
      <img src="https://img.icons8.com/color/96/bus.png" alt="GoBus Logo" style="width:80px; height:80px;" />
    </div>            
    <!-- Heading -->
    <h2 style="color: #2b6cb0; text-align: center; margin-bottom: 10px;">
      Password Reset Request  
    </h2>
    <!-- Divider -->  
    <hr style="border: none; border-top: 2px solid #eee; margin: 20px 0;" />
    <!-- Body -->
    <p style="font-size: 15px; text-align: center;">  To reset your password, please click the button below:  </p>
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
    <!-- Footer -->
    <div style="text-align: center; margin-top: 30px; font-size: 14px; color: #555;">   
      <p>Safe travels,</p>
      <p><strong>The GoBus Team</strong></p>
    </div>
  </div>
  `;
};
