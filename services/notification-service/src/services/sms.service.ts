import AfricasTalking from "africastalking";
import dotenv from "dotenv";
dotenv.config();

const at = AfricasTalking({
  apiKey: process.env.AT_API_KEY!,
  username: process.env.AT_USERNAME!,
  environment: process.env.AT_ENV || "sandbox",
});

const sms = at.SMS;

export const sendSMS = async (to: string, message: string) => {
  try {
    const result = await sms.send({ to, message });
    console.log("✅ Africa's Talking SMS:", result);
    return result;
  } catch (err: any) {
    console.error("❌ Africa's Talking Error:", err);
    throw err;
  }
};