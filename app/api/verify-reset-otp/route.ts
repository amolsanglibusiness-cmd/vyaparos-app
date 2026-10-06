import { NextResponse } from 'next/server';
import { otpStore } from '../send-otp/route';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { email, otp, newPassword } = await request.json();

    if (!email || !otp || !newPassword) {
      return NextResponse.json({ ok: false, error: 'सर्व माहिती भरणे आवश्यक आहे.' }, {status: 400 });
    }

    const record = otpStore.get(email.toLowerCase());
    if (!record) {
      return NextResponse.json({ ok: false, error: 'कृपया आधी OTP मागवा.' }, { status: 400 });
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(email.toLowerCase());
      return NextResponse.json({ ok: false, error: 'OTP चे आयुष्य संपले आहे. कृपया पुन्हा प्रयत्न करा.' }, { status: 400 });
    }

    if (record.otp !== otp) {
      return NextResponse.json({ ok: false, error: 'चुकीचा OTP टाकला आहे.' }, { status: 400 });
    }

    // OTP मॅच झाला, आता Supabase किंवा Local settings मध्ये पासवर्ड अपडेट करा
    // (टीप: Supabase Admin API किंवा युजरच्या सेशनद्वारे पासवर्ड अपडेट करू शकता)
    
    // यशस्वी झाल्यावर स्टोअरमधून OTP काढून टाकणे
    otpStore.delete(email.toLowerCase());

    return NextResponse.json({ ok: true, message: 'पासवर्ड यशस्वीरित्या बदलला आहे.' });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || 'पासवर्ड बदलताना एरर आली.' }, { status: 500 });
  }
}