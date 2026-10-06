const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const DEFAULT_MODEL = 'gemini-2.5-flash';

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
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          quantity: { type: 'number' },
          amount: { type: 'number' },
        },
        required: ['name', 'quantity', 'amount'],
      },
    },
  },
  required: ['intent', 'route', 'normalized_command', 'answer', 'party_name', 'phone_number', 'amount', 'type', 'note', 'items'],
};

const SYSTEM_PROMPT = `You are VyaparOS AI Command Parser for an Indian business accounting/POS application.

LANGUAGE:
Understand Marathi Devanagari, Hindi, English, Hinglish, Marathi-English mixed speech and common speech-to-text/ASR errors. Reply in the user's language when answering GENERAL questions. Preserve names and numbers exactly when possible.

OUTPUT:
Return ONLY valid JSON matching the supplied schema. Never add markdown, comments, or extra keys.

ROUTES:
APP = the user wants to perform, open, edit, delete, save, search, query, or otherwise interact with VyaparOS data/features.
GENERAL = the user asks what the app is, what it can do, how a feature works, a greeting, or another general informational question that does not request an app action.

INTENTS:
ADD_TRANSACTION = money movement such as expense/kharch, income/jama/credit, payment received/given, cash in/out, or transfer.
ADD_CUSTOMER = explicitly add/create/register a customer/party, especially when a name and mobile number are present.
CREATE_BILL = sale/invoice/bill containing items, quantities, prices, totals, discounts or payment terms.
CHECK_BALANCE = asks for account, bank, savings, cash, Galla, Cash in Hand, net worth, or other balance/status.
SEND_WHATSAPP = send/share/prepare a WhatsApp message, bill, reminder, receipt or customer message.
UPDATE_RECORD = edit/update/change/save an existing record or data entry. Use for commands such as edit customer, update phone, change item price, save changes.
DELETE_RECORD = delete/remove an existing customer, supplier, item, transaction, bill, or record.
UNKNOWN = an APP request that cannot be mapped safely to the supported intents.

GENERAL QUESTIONS:
Examples: "app vishesh mahiti", "what can this app do", "या app मध्ये काय करता येते?".
Set route=GENERAL, intent=UNKNOWN, give a concise useful answer in the user's language, and do not claim an action was performed.

ADD_TRANSACTION EXTRACTION:
- Extract amount when present.
- Extract party_name when a customer/supplier/person is named.
- type must be credit/jama for money received/income, or debit/kharch for money paid/expense. Preserve jama/kharch when the user's wording clearly uses those terms.
- note should contain the purpose/item/reason when useful.
- For transfers, describe the transfer in normalized_command/note; do not invent missing source/destination accounts.

ADD_CUSTOMER EXTRACTION:
- Example: "श्रावणी 8055165510 हा कस्टमर अॅड करा" => intent=ADD_CUSTOMER, route=APP, party_name="श्रावणी", phone_number="8055165510".
- Extract a 10-digit Indian mobile number even when spaces, hyphens, "mobile", "phone", "नंबर" or Marathi wording is used.
- Do not put the phone number into party_name.

CREATE_BILL:
- Extract every item as {name, quantity, amount}.
- amount is unit price unless the wording clearly says line-total amount.
- If quantity is omitted, use 1 only when the command clearly names a purchasable/sale item; otherwise use 0 and preserve the missing detail in normalized_command.

DATA MANAGEMENT:
OPEN/search/show/find/list commands are APP actions. If they do not fit a specific intent, use UNKNOWN and put a clear normalized_command.
EDIT/update/change/save existing data => UPDATE_RECORD.
DELETE/remove/hatao/delete record => DELETE_RECORD.
Do not invent record IDs.

MISSING INFORMATION:
Never invent amount, customer name, phone, item, quantity, account, or payment method. Keep unavailable fields null or an empty items array. normalized_command should preserve the command and, when needed, state what is missing.

NORMALIZED_COMMAND:
Create a concise, unambiguous command for the existing VyaparOS local command engine. Preserve Marathi/English meaning and important names/numbers. Do not fabricate details.

ANSWER:
For APP commands, answer may be null or a very short acknowledgement/request for missing information. Do not say an action was completed unless the parser is only interpreting the command; the client performs the action.
`;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function validText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 4000;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function normalizePhone(value: unknown): string | null {
  if (value == null) return null;
  const digits = String(value).replace(/\D/g, '');
  if (!digits) return null;
  const ten = digits.length > 10 ? digits.slice(-10) : digits;
  return /^\d{10}$/.test(ten) ? ten : null;
}

function cleanResult(value: unknown) {
  if (!isRecord(value)) return null;
  const intents = ['ADD_TRANSACTION', 'ADD_CUSTOMER', 'CREATE_BILL', 'CHECK_BALANCE', 'SEND_WHATSAPP', 'UPDATE_RECORD', 'DELETE_RECORD', 'UNKNOWN'];
  const intent = String(value.intent || 'UNKNOWN');
  if (!intents.includes(intent)) return null;

  const route = value.route === 'GENERAL' ? 'GENERAL' : 'APP';
  const amount = value.amount == null ? null : Number(value.amount);
  if (amount != null && (!Number.isFinite(amount) || amount < 0 || amount > 100000000)) return null;

  const type = value.type == null || value.type === '' ? null : String(value.type).toLowerCase();
  if (type && !['credit', 'debit', 'jama', 'kharch'].includes(type)) return null;

  const items = Array.isArray(value.items)
    ? value.items.map((item) => {
        if (!isRecord(item)) return null;
        const name = String(item.name ?? '').trim();
        const quantity = Number(item.quantity ?? 0);
        const itemAmount = Number(item.amount ?? 0);
        return name && Number.isFinite(quantity) && quantity > 0 && Number.isFinite(itemAmount) && itemAmount >= 0
          ? { name, quantity, amount: itemAmount }
          : null;
      }).filter(Boolean)
    : [];

  const partyName = typeof value.party_name === 'string' ? value.party_name.trim() || null : null;
  const phoneNumber = normalizePhone(value.phone_number);

  return {
    intent,
    route,
    normalized_command: typeof value.normalized_command === 'string' ? value.normalized_command.trim() || null : null,
    answer: typeof value.answer === 'string' ? value.answer.trim() || null : null,
    party_name: partyName,
    phone_number: phoneNumber,
    amount,
    type,
    note: typeof value.note === 'string' ? value.note.trim() || null : null,
    items,
  };
}

function extractJsonText(payload: any): string {
  return Array.isArray(payload?.candidates?.[0]?.content?.parts)
    ? payload.candidates[0].content.parts.map((part: { text?: string }) => part?.text || '').join('').trim()
    : '';
}

async function callGemini(apiKey: string, model: string, text: string, structured = true) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const generationConfig: Record<string, unknown> = { temperature: 0, responseMimeType: 'application/json' };
  if (structured) generationConfig.responseSchema = responseSchema;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: `${SYSTEM_PROMPT}\n\nUser message:\n${text.trim()}` }] }],
      generationConfig,
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const apiMessage = isRecord(payload?.error) && typeof payload.error.message === 'string'
      ? payload.error.message
      : `Gemini API request failed (${response.status}).`;
    const error = new Error(apiMessage) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  const raw = extractJsonText(payload);
  if (!raw) throw new Error('Gemini returned an empty response.');

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim());
  } catch {
    throw new Error('Gemini returned invalid JSON.');
  }

  const result = cleanResult(parsed);
  if (!result) throw new Error('Gemini returned an invalid VyaparOS command format.');
  return result;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (!['GET', 'POST'].includes(request.method)) return json({ ok: false, error: 'Only GET and POST are supported.' }, 405);

  const apiKey = (Deno.env.get('GEMINI_API_KEY') || '').trim();
  const model = (Deno.env.get('GEMINI_MODEL') || DEFAULT_MODEL).trim() || DEFAULT_MODEL;
  const authorization = request.headers.get('Authorization') || '';
  if (!authorization.startsWith('Bearer ')) return json({ ok: false, code: 'AUTH_REQUIRED', error: 'Please sign in to VyaparOS before using Gemini AI.' }, 401);

  if (request.method === 'GET') return json({ ok: true, configured: Boolean(apiKey), model, provider: 'Google Gemini via Supabase Edge Function' });
  const body = await request.json().catch(() => null) as { action?: unknown; text?: unknown } | null;
  if (body?.action === 'health') return json({ ok: true, configured: Boolean(apiKey), model, provider: 'Google Gemini via Supabase Edge Function' });
  if (!apiKey) return json({ ok: false, code: 'GEMINI_NOT_CONFIGURED', error: 'GEMINI_API_KEY is missing in Supabase Edge Function Secrets.', model }, 503);
  if (!body || !validText(body.text)) return json({ ok: false, code: 'INVALID_INPUT', error: 'Command text is required.' }, 400);

  try {
    let result;
    try {
      result = await callGemini(apiKey, model, body.text, true);
    } catch (firstError) {
      const status = Number((firstError as Error & { status?: number })?.status || 0);
      // Some Gemini model/API combinations reject structured response schemas.
      // Retry once with JSON MIME only, while keeping the same strict prompt.
      if (status === 400 || status === 404) result = await callGemini(apiKey, model, body.text, false);
      else throw firstError;
    }
    return json({ ok: true, model, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Gemini error.';
    const status = Number((error as Error & { status?: number })?.status || 502);
    return json({ ok: false, code: status === 401 || status === 403 ? 'GEMINI_AUTH_ERROR' : status === 404 ? 'GEMINI_MODEL_ERROR' : 'GEMINI_REQUEST_ERROR', error: message, model }, 502);
  }
});
