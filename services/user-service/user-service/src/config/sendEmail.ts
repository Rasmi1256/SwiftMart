import nodemailer from 'nodemailer';
import { config } from '../config';

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: config.email.port === 465, // true for 465, false for other ports
  auth: {
    user: config.email.user,
    pass: config.email.pass,
  },
});

export const sendEmail = async (options: EmailOptions) => {
  const mailOptions = {
    from: '"SwiftMart Support" <no-reply@swiftmart.com>',
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  };

  const info = await transporter.sendMail(mailOptions);
  console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info)); // URL to preview Ethereal email
};