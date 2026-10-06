import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase'; // तुमचा Supabase क्ल라이언트

// इन-मेमरी किंवा तात्पुरता OTP स्टोअर (उत्पादनात डेटाबेस टेबल किंवा रेडिस् वापरणे उत्तम, पण सध्या साध्या मॅपने काम चालेल)
export const otpStore = new Map<string, { otp: string; expiresAt: number }>();

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ ok: false, error: 'इमेल पत्ता देणे आवश्यक आहे.' }, { status: 400 });
    }

    // १. युजर सिस्टीममध्ये अस्तित्वात आहे का तपासा (Supabase Auth किंवा प्रोफाईल द्वारे)
    // किंवा थेट ६ अंकी OTP तयार करा
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // १० मिनिटे वैध

    // मेमरीमध्ये OTP सेव्ह करा
    otpStore.set(email.toLowerCase(), { otp, expiresAt });

    // २. Brevo API द्वारे ईमेल पाठवणे
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': process.env.BREVO_API_KEY || '',
      },
      body: JSON.stringify({
        sender: { name: 'VyaparOS Security', email: 'no-reply@vyaparos.app' },
        to: [{ email: email }],
        subject: 'पासवर्ड रिसेट OTP - VyaparOS',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f8fafc; border-radius: 10px;">
            <h2 style="color: #0284c7;">VyaparOS Password Reset</h2>
            <p>तुमचा पासवर्ड रिसेट करण्यासाठी खालील ६ अंकी OTP वापरा:</p>
            <div style="background: #e0f2fe; padding: 15px; font-size: 24px; font-weight: bold; color: #0369a1; text-align: center; letter-spacing: 5px; border-radius: 8px;">
              ${otp}
            </div>
            <p style="margin-top: 15px; font-size: 12px; color: #64748b;">हा OTP १० मिनिटांसाठी वैध आहे. हा कोणासोबतही शेअर करू नका.</p>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.message || 'Brevo द्वारे ईमेल पाठवण्यात अपयश आले.');
    }

    return NextResponse.json({ ok: true, message: 'OTP यशस्वीरित्या पाठवला आहे.' });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || 'तांत्रिक अडचण आली आहे.' }, { status: 500 });
  }
}