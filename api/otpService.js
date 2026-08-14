const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const nodemailer = require('nodemailer');

const DEFAULT_SMS_KEY = process.env.SMS_PROVIDER_API_KEY || 'w9UmzOtM8nqITAPxhB7VrF0Hy5vN2YlsEuD6JWGeQZoKgSCpckPuYFozj4caLvUDxAZOrgyt5s7NQ3nR';
const DEFAULT_EMAIL_USER = process.env.EMAIL_USER || 'aayushipawar2004@gmail.com';
const DEFAULT_EMAIL_PASS = process.env.EMAIL_PASSWORD || 'wvlwhktvwdjvhmo';

const normalizePhone = (phone) => {
  if (!phone) return '';
  const digits = phone.toString().replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  return `+${digits}`;
};

const createEmailTransporter = () => {
  const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.EMAIL_PORT || '587', 10);
  const user = DEFAULT_EMAIL_USER;
  const pass = DEFAULT_EMAIL_PASS;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: { rejectUnauthorized: false }
  });
};

const sendSMS = async (phone, otp) => {
  const formattedPhone = normalizePhone(phone);
  const apiKey = DEFAULT_SMS_KEY;
  const baseUrl = process.env.SMS_PROVIDER_BASE_URL || 'https://www.fast2sms.com/dev/bulkV2';

  console.log(`[SMS OTP Dispatch] Initiating SMS to ${formattedPhone} via Fast2SMS...`);

  try {
    const response = await axios.post(baseUrl, {
      route: 'otp',
      variables_values: otp,
      numbers: formattedPhone.replace('+91', '')
    }, {
      headers: {
        'authorization': apiKey,
        'Content-Type': 'application/json'
      },
      timeout: 8000
    });

    console.log(`[SMS Service Success] Fast2SMS Response:`, response.data);
    return { success: true, data: response.data };
  } catch (error) {
    const responseData = error.response?.data;
    if (responseData && responseData.status_code === 999) {
      console.warn(`[Fast2SMS Notice] ${responseData.message}`);
    } else {
      console.error(`[SMS Service Notice] ${formattedPhone}:`, responseData || error.message);
    }
    return { success: false, error: responseData || error.message };
  }
};

const sendEmail = async (email, otp, purpose) => {
  const transporter = createEmailTransporter();
  const fromEmail = process.env.EMAIL_FROM || `"SmartCity Portal" <${DEFAULT_EMAIL_USER}>`;
  const purposeTitle = purpose === 'FORGOT_PASSWORD' ? 'Password Reset Verification' : 'Account Registration Verification';

  console.log(`[Email OTP Dispatch] Initiating Email to ${email} via Gmail SMTP...`);

  const htmlContent = `
    <div style="font-family: 'Inter', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
      <div style="background-color: #0f172a; padding: 24px; text-align: center;">
        <h1 style="color: #f59e0b; font-size: 24px; margin: 0; font-weight: 800;">🏛️ SmartCity Civic Portal</h1>
        <p style="color: #94a3b8; font-size: 12px; margin: 4px 0 0 0; text-transform: uppercase; font-weight: 600;">Municipal Governance System</p>
      </div>

      <div style="padding: 32px 24px;">
        <h2 style="color: #0f172a; font-size: 18px; margin-top: 0;">${purposeTitle}</h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.6;">
          You requested a 6-digit Security Verification Code for your SmartCity account. Use the OTP code below to complete your verification:
        </p>

        <div style="background-color: #f8fafc; border: 2px dashed #2563eb; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
          <span style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 700; display: block; margin-bottom: 8px;">Your 6-Digit OTP Code</span>
          <span style="font-family: 'Courier New', monospace; font-size: 36px; font-weight: 900; color: #1d4ed8; letter-spacing: 8px;">${otp}</span>
        </div>

        <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
          ⏱️ <strong>Expiry Notice:</strong> Valid for <strong>5 minutes</strong> only (Single-use).<br/>
          🔒 <strong>Security Warning:</strong> Never share this OTP code with anyone.
        </p>
      </div>

      <div style="background-color: #f1f5f9; padding: 16px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="color: #64748b; font-size: 11px; margin: 0;">
          © ${new Date().getFullYear()} SmartCity Municipal Portal. Automated Notification Service.
        </p>
      </div>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: fromEmail,
      to: email,
      subject: `Your SmartCity Verification Code: ${otp}`,
      html: htmlContent
    });

    console.log(`[Email Service Success] Message sent: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[Email Service Notice] ${email}:`, error.message);
    return { success: false, error: error.message };
  }
};

const generate6DigitOTP = () => {
  const otp = crypto.randomInt(100000, 1000000).toString();
  console.log(`[OTP SYSTEM LOG] Generated 6-Digit OTP: ${otp}`);
  return otp;
};

const hashOTP = async (otp) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(otp, salt);
};

module.exports = {
  normalizePhone,
  generate6DigitOTP,
  hashOTP,
  sendSMS,
  sendEmail
};
