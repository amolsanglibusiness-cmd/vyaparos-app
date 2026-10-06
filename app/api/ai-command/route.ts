import { NextResponse } from 'next/server';

const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

const SYSTEM_PROMPT = `You are VyaparOS AI Command Parser for an Indian business accounting/POS application.
Understand Marathi (Devanagari), Hindi, English, Hinglish, Marathi-English mixed speech and common ASR errors.
Return ONLY JSON matching the schema.

ROUTE APP means the user wants an app action/query. GENERAL means a general app/features question or greeting.

INTENTS: ADD_TRANSACTION, ADD_CUSTOMER, CREATE_BILL, CHECK_BALANCE, SEND_WHATSAPP, UPDATE_RECORD, DELETE_RECORD, UNKNOWN.

ADD_TRANSACTION: expense/kharch, income/jama/credit, payment received/given, cash in/out, transfers. Extract amount, party_name, type (credit/debit/jama/kharch), note.
ADD_CUSTOMER: explicitly add/create/register a customer. Example "श्रावणी 8055165510 हा कस्टमर अॅड करा" => party_name="श्रावणी", phone_number="8055165510".
CREATE_BILL: sales/invoice/bill; extract all items with name, quantity and unit amount.
CHECK_BALANCE: bank/savings/cash/Galla/Cash in Hand/net worth/account balance queries.
SEND_WHATSAPP: prepare/send/share WhatsApp bill/reminder/message.
UPDATE_RECORD: edit/update/change/save an existing record.
DELETE_RECORD: delete/remove an existing record.
OPEN/search/show/list commands that do not fit another intent use UNKNOWN with normalized_command.

Never invent missing information. Keep unavailable fields null. For GENERAL, answer concisely in the user's language and do not claim an action was performed.`;

const responseSchema = {
  type: 'object',
  properties: {
    intent: { type: 'string', enum: ['ADD_TRANSACTION', 'ADD_CUSTOMER', 'CREATE_BILL', 'CHECK_BALANCE', 'SEND_WHATSAPP', 'UPDATE_RECORD', 'DELETE_RECORD', 'UNKNOWN'] },
    route: { type: 'string', enum: ['APP', 'GENERAL'] },
    normalized_command: { type: ['string', 'null'] },
    answer: { type: ['string', 'null'] },
    party_name: { type: ['string', 'null'] },
    phone_number: { type: ['string', 'null'] },
    amount: { type: ['number', 'null'] },
    type: { type: ['string', 'null'], enum: ['credit', 'debit', 'jama', 'kharch', null] },
    note: { type: ['string', 'null'] },
    items: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, quantity: { type: 'number' }, amount: { type: 'number' } }, required: ['name', 'quantity', 'amount'] } },
  },
  required: ['intent', 'route', 'normalized_command', 'answer', 'party_name', 'phone_number', 'amount', 'type', 'note', 'items'],
};

function clean(value: any) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const intents = responseSchema.properties.intent.enum;
  if (!intents.includes(value.intent)) return null;
  const digits = value.phone_number == null ? '' : String(value.phone_number).replace(/\D/g, '');
  const phone = digits ? digits.slice(-10) : null;
  return {
    intent: value.intent,
    route: value.route === 'GENERAL' ? 'GENERAL' : 'APP',
    normalized_command: typeof value.normalized_command === 'string' ? value.normalized_command.trim() || null : null,
    answer: typeof value.answer === 'string' ? value.answer.trim() || null : null,
    party_name: typeof value.party_name === 'string' ? value.party_name.trim() || null : null,
    phone_number: phone && /^\d{10}$/.test(phone) ? phone : null,
    amount: value.amount == null ? null : Number(value.amount),
    type: value.type == null ? null : String(value.type).toLowerCase(),
    note: typeof value.note === 'string' ? value.note.trim() || null : null,
    items: Array.isArray(value.items) ? value.items : [],
  };
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ ok: false, error: 'GEMINI_API_KEY is not configured.' }, { status: 503 });
  const body = await request.json().catch(() => null) as { text?: unknown } | null;
  if (!body || typeof body.text !== 'string' || !body.text.trim()) return NextResponse.json({ ok: false, error: 'Command text is required.' }, { status: 400 });

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(DEFAULT_MODEL)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(endpoint, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: `${SYSTEM_PROMPT}\n\nUser message:\n${body.text.trim()}` }] }],
      generationConfig: { temperature: 0, responseMimeType: 'application/json', responseSchema },
    }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) return NextResponse.json({ ok: false, error: payload?.error?.message || `Gemini request failed (${response.status}).` }, { status: 502 });
  const raw = payload?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || '').join('').trim() || '';
  try {
    const parsed = JSON.parse(raw.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim());
    const result = clean(parsed);
    if (!result) throw new Error('Invalid VyaparOS command format.');
    return NextResponse.json({ ok: true, model: DEFAULT_MODEL, result });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Invalid Gemini JSON.' }, { status: 502 });
  }
}
