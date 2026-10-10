# VyaparOS — Main / Sub Business अपडेट

## लागू करणे
1. Supabase SQL Editor उघडा.
2. आधीचे आवश्यक migrations लागू झाले आहेत याची खात्री करा.
3. `SUPABASE_BUSINESS_HIERARCHY_20261010.sql` पूर्ण चालवा.
4. नवीन source code GitHub/Vercel वर deploy करा.

## या अपडेटमध्ये
- Business list मध्ये Main Business / Sub Business ओळख आणि owner नाव/प्रोफाइल फोटो (उपलब्ध असल्यास) दाखवण्याची सोय.
- Add Business मध्ये Main Business किंवा Sub Business निवडण्याची सोय.
- Sub Business ला Main Business शी जोडण्यासाठी SQL/RPC.
- Sub Business असलेला Main Business delete होण्यापासून app आणि database trigger स्तरावर संरक्षण.
- Menu पेज उघडे असताना bottom Menu बटन पुन्हा दाबल्यास मागील पेजवर परतणे.

## महत्त्वाची नोंद
`business_shared_bank_accounts` ही explicit bank-sharing साठी database registry तयार केली आहे. मात्र सध्याच्या या बदलात bank account share/unshare निवडण्यासाठी UI आणि shared account दुसऱ्या business च्या bank list मध्ये प्रत्यक्ष mirror करण्याचा पूर्ण flow जोडलेला नाही. त्यामुळे ही ZIP deploy केल्यावर shared bank feature पूर्ण कार्यरत आहे असे समजू नका; त्यासाठी पुढील code change आणि Supabase RPC integration आवश्यक आहे. विद्यमान shared-bank transaction RPCs असतील तर त्यांचे behavior या migration ने बदललेले नाही.
