const nodemailer = require('nodemailer');

let transporter;

const getTransporter = () => {
  if (transporter) return transporter;
  const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS } = process.env;
  if (!EMAIL_HOST || !EMAIL_USER || !EMAIL_PASS) {
    throw new Error('Email is not set up. Put EMAIL_HOST, EMAIL_PORT, EMAIL_USER and EMAIL_PASS in backend/.env.');
  }
  transporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port: Number(EMAIL_PORT) || 587,
    secure: Number(EMAIL_PORT) === 465,
    auth: { user: EMAIL_USER, pass: EMAIL_PASS },
  });
  return transporter;
};

const sendMail = ({ to, subject, text, html }) =>
  getTransporter().sendMail({ from: process.env.EMAIL_FROM || process.env.EMAIL_USER, to, subject, text, html });

module.exports = { sendMail };
