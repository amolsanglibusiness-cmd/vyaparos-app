'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, Mic, MicOff, Send, Sparkles, Volume2, Pencil, Share2, Printer, Receipt, HelpCircle, Languages, UserCircle, Home, FileText, BarChart3, Menu, ShoppingCart, WalletCards, Lightbulb, ChevronRight, ChevronDown, Loader2, BrainCircuit, BookOpen, X, Clock3, Bot } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppData } from './app-data-context';
import { useSettings } from './settings-context';
import { parseAssistantCommand, getAssistantValidationMessage, looksLikeInvoice, extractCustomerName, type AssistantDraft, type AssistantIntent, type AssistantInvoiceDraft } from './ai-command-parser';
import { generateId, GALLA_ID, CASH_IN_HAND_ID } from './mock-data';
import { Capacitor } from '@capacitor/core';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { Contacts } from '@capacitor-community/contacts';
import type { LedgerParty } from './types';
import { normalizeAppVocabulary } from './ai-vocabulary';
import { askGeminiCommand, teachGeminiCommand } from './gemini-command-parser';
import { bankResolutionMessage, hasExplicitBankReference, resolveMoneyAccount } from './ai-finance-rules';
import { findLearnedCommand, getLearnedCommands, markLearnedCommandUsed, saveLearnedCommand, type LearnedCommand } from './ai-command-memory';
import { useAuth } from '@/hooks/use-auth';

declare global {
  interface Window {
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
}

const money = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

export function AIAssistantPage() {
  const { language, setLanguage, isDarkMode, toggleDarkMode, setAppLockEnabled, businessProfile } = useSettings();
  const { bankAccounts, gallaBalance, cashInHandBalance, addBankAccount, addTransaction, addInvoice, addLedgerParty, deleteLedgerParty, addLedgerEntry, updateInventoryItem, addInventoryItem, deleteInventoryItem, getAccountLabel, transactions, ledgerParties, ledgerEntries, invoices, inventoryItems } = useAppData();
  const { user } = useAuth();
  const [learnedCommands, setLearnedCommands] = useState<LearnedCommand[]>([]);
  const [showTeach, setShowTeach] = useState(false);
  const [teachPhrase, setTeachPhrase] = useState('');
  const [teachMeaning, setTeachMeaning] = useState('');
  const [teaching, setTeaching] = useState(false);
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [draft, setDraft] = useState<AssistantIntent | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const [pendingCommand, setPendingCommand] = useState<string>('');
  const [savedInvoice, setSavedInvoice] = useState<AssistantInvoiceDraft['invoice'] | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; role: 'user' | 'assistant'; text: string }>>([
    { id: 'welcome', role: 'assistant', text: 'नमस्कार! मी VyaparOS AI Assistant आहे. तुमच्या व्यवसायासाठी command द्या.' },
  ]);
  const recognitionRef = useRef<any>(null);
  const textRef = useRef('');
  const nativeListenersRef = useRef<any[]>([]);
  const autoParseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLearnedCommands(getLearnedCommands(user?.id));
  }, [user?.id]);

  const refreshLearnedCommands = () => setLearnedCommands(getLearnedCommands(user?.id));

  const learnCommand = async (phrase: string, explanation: string) => {
    const cleanPhrase = phrase.trim();
    const cleanExplanation = explanation.trim();
    if (!cleanPhrase || !cleanExplanation) {
      toast.error(language === 'mr' ? 'Command आणि त्याचा अर्थ दोन्ही द्या.' : 'Enter both the command and its meaning.');
      return;
    }
    setTeaching(true);
    try {
      const gemini = await teachGeminiCommand(cleanPhrase, cleanExplanation);
      const canonical = gemini.canonicalCommand || cleanExplanation;
      const saved = saveLearnedCommand({
        phrase: cleanPhrase,
        canonicalCommand: canonical,
        explanation: cleanExplanation,
      }, user?.id);
      setLearnedCommands(prev => [saved, ...prev.filter(x => x.phrase.toLowerCase() !== cleanPhrase.toLowerCase())].slice(0, 200));
      setTeachPhrase('');
      setTeachMeaning('');
      setShowTeach(false);
      setAnswer(language === 'mr'
        ? `“${cleanPhrase}” ही command शिकवली आहे. पुढे हीच command दिल्यावर “${canonical}” प्रमाणे काम करेल.`
        : `Learned “${cleanPhrase}”. Next time it will run as “${canonical}”.`);
      toast.success(language === 'mr' ? 'नवीन command सेव्ह झाली.' : 'New command saved.');
    } finally {
      setTeaching(false);
    }
  };

  const tryAutoTeach = async (value: string): Promise<boolean> => {
    const match = value.match(/^(?:शिकवा|शिकव|teach|learn)\s*[:\-]?\s*[“"]?(.+?)[”"]?\s+(?:म्हणजे|याचा अर्थ|याचा मतलब|means|means that)\s+(.+)$/i);
    if (!match) return false;
    await learnCommand(match[1], match[2]);
    return true;
  };

    const browserSpeechSupported = useMemo(() => typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition), []);
  const [nativeSpeech, setNativeSpeech] = useState(false);

  const lastChatAnswerRef = useRef<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!answer || answer === lastChatAnswerRef.current) return;
    lastChatAnswerRef.current = answer;
    setChatMessages(prev => [...prev, { id: generateId('ai-chat'), role: 'assistant', text: answer }]);
  }, [answer]);

  useEffect(() => {
    // IMPORTANT: scroll only the chat panel, never the document/page.
    // A fixed composer overlays the bottom, so leave a permanent gap below
    // the last message and scroll after React has painted the new answer.
    const scrollChatToBottom = () => {
      const container = chatScrollRef.current;
      if (!container) return;
      container.scrollTo({
        top: Math.max(0, container.scrollHeight - container.clientHeight),
        behavior: 'smooth',
      });
    };

    const frame1 = requestAnimationFrame(() => {
      const frame2 = requestAnimationFrame(scrollChatToBottom);
      window.setTimeout(scrollChatToBottom, 180);
      return frame2;
    });

    return () => cancelAnimationFrame(frame1);
  }, [chatMessages, processing, draft]);

  useEffect(() => {
    let active = true;
    if (!Capacitor.isNativePlatform()) return;
    void SpeechRecognition.available().then((result) => { if (active) setNativeSpeech(Boolean(result.available)); }).catch(() => { if (active) setNativeSpeech(false); });
    return () => { active = false; };
  }, []);

  const supported = nativeSpeech || browserSpeechSupported;

  const updateText = (value: string, autoParse = false) => {
    // Do not trim while the user is typing: trimming here removes the trailing
    // space after a word, so the next word gets joined to it. Trim only when
    // parsing/saving the final command.
    const next = value;
    textRef.current = next;
    setText(next);

    // Android native speech recognition can deliver the final transcript without
    // reliably delivering the listeningState=stopped callback.  Therefore the
    // command engine is also triggered from the last partial transcript.
    if (autoParse && next) {
      if (autoParseTimerRef.current) clearTimeout(autoParseTimerRef.current);
      autoParseTimerRef.current = setTimeout(() => {
        const command = textRef.current.trim();
        if (command) {
          const result = parseAssistantCommand(command, bankAccounts, inventoryItems);
          if (result) {
            setDraft(result);
            setHistory((prev) => [command, ...prev.filter((item) => item !== command)].slice(0, 10));
          }
        }
      }, 900);
    }
  };

  useEffect(() => () => {
    if (autoParseTimerRef.current) clearTimeout(autoParseTimerRef.current);
    recognitionRef.current?.stop?.();
    nativeListenersRef.current.forEach((listener) => listener?.remove?.());
    nativeListenersRef.current = [];
  }, []);

  // Shared Marathi/English/Hinglish vocabulary lives in ai-vocabulary.ts.
  // Keep command logic here focused on intent and app actions.

  const localDateKey = (value: string | Date) => {
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const cleanTransactions = useMemo(
    () => transactions.filter((t) => t.category !== 'Automatic Galla Income' && !t.description.startsWith('[AUTO-GALLA-INCOME]')),
    [transactions]
  );

  // Match party names even when the user mixes English and Marathi script,
  // e.g. saved name "Amol" + query "अमोलचे pending bill दाखवा".
  const transliterateMarathi = (value: string) => {
    const map: Record<string, string> = {
      'अ':'a','आ':'aa','इ':'i','ई':'ee','उ':'u','ऊ':'oo','ऋ':'ri','ए':'e','ऐ':'ai','ओ':'o','औ':'au',
      'क':'k','ख':'kh','ग':'g','घ':'gh','ङ':'n','च':'ch','छ':'chh','ज':'j','झ':'jh','ञ':'n',
      'ट':'t','ठ':'th','ड':'d','ढ':'dh','ण':'n','त':'t','थ':'th','द':'d','ध':'dh','न':'n',
      'प':'p','फ':'ph','ब':'b','भ':'bh','म':'m','य':'y','र':'r','ल':'l','व':'v','श':'sh','ष':'sh','स':'s','ह':'h',
      'ळ':'l','क्ष':'ksh','ज्ञ':'dny','त्र':'tr','श्र':'shr',
      'ा':'a','ि':'i','ी':'i','ु':'u','ू':'u','ृ':'ri','े':'e','ै':'ai','ो':'o','ौ':'au','ं':'n','ः':'h','ँ':'n','्':'',
    };
    return value.toLowerCase().split('').map((ch) => map[ch] ?? ch).join('')
      .replace(/aa+/g, 'a').replace(/ee+/g, 'i').replace(/ii+/g, 'i').replace(/oo+/g, 'u')
      .replace(/[^a-z0-9]/g, '');
  };

  const normalizePartyQuery = (value: string) => value.toLowerCase()
    .replace(/['’]s\b/g, ' ')
    .replace(/(?:चा|ची|चे|चाॅ|च्या|चे\b|यांचा|यांची|यांचे|च्या)\b/gi, ' ')
    .replace(/(?:चा|ची|चे|च्या)\s*$/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const findPartyInQuestion = (q: string) => {
    const lower = normalizePartyQuery(q);
    const queryPhonetic = transliterateMarathi(lower);
    return [...ledgerParties]
      .filter((p) => {
        const name = normalizePartyQuery(p.name);
        const nameLower = name.toLowerCase();
        if (lower.includes(nameLower)) return true;
        const namePhonetic = transliterateMarathi(name);
        return !!namePhonetic && queryPhonetic.includes(namePhonetic);
      })
      .sort((a, b) => b.name.length - a.name.length)[0] ?? null;
  };

  const partyBalance = (partyId: string) => {
    const rows = ledgerEntries.filter((e) => e.partyId === partyId);
    return rows.filter((e) => e.type === 'Given').reduce((s, e) => s + Number(e.amount || 0), 0)
      - rows.filter((e) => e.type === 'Received').reduce((s, e) => s + Number(e.amount || 0), 0);
  };

  const getPeriod = (q: string) => {
    const now = new Date();
    const today = localDateKey(now);
    if (/(काल|कालचा|कालची|कालचे|कालच्या|yesterday)/i.test(q)) {
      const d = new Date(now); d.setDate(d.getDate() - 1);
      return { label: language === 'mr' ? 'काल' : 'Yesterday', from: localDateKey(d), to: localDateKey(d) };
    }
    if (/(मागील आठवडा|मागचा आठवडा|गेल्या आठवड्यात|मागच्या आठवड्यात|last week|previous week)/i.test(q)) {
      const d = new Date(now);
      const day = d.getDay() || 7;
      d.setDate(d.getDate() - day - 6);
      const from = localDateKey(d);
      d.setDate(d.getDate() + 6);
      return { label: language === 'mr' ? 'मागील आठवडा' : 'Last week', from, to: localDateKey(d) };
    }
    if (/(या महिन्यात|या महिन्याचा|या महिन्याची|this month|current month|महिन्यात|या महिन्याचे)/i.test(q)) {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      return { label: language === 'mr' ? 'या महिन्यात' : 'This month', from: localDateKey(from), to: today };
    }
    if (/(आज|today)/i.test(q)) return { label: language === 'mr' ? 'आज' : 'Today', from: today, to: today };
    return null;
  };

  const findPartyExactOrPartial = (name: string, type?: 'Customer' | 'Supplier') => {
    const n = name.trim().toLowerCase();
    return [...ledgerParties]
      .filter((p) => !type || p.type === type)
      .filter((p) => p.name.toLowerCase() === n || p.name.toLowerCase().includes(n) || n.includes(p.name.toLowerCase()))
      .sort((a, b) => b.name.length - a.name.length)[0] ?? null;
  };

  const makeParty = (name: string, type: 'Customer' | 'Supplier', phone = ''): LedgerParty => ({
    id: generateId('lp'), name: name.trim(), businessContactNumber: '', type, phone: phone.replace(/\D/g, '').slice(-10), email: '', address: '', photoUrl: null,
    upiId: '', openingBalance: 0, gstin: '', notes: '', createdAt: new Date().toISOString(),
  });

  const extractAmountSafe = (value: string) => {
    const normalized = value.replace(/[०-९]/g, d => String('०१२३४५६७८९'.indexOf(d)));
    const m = normalized.match(/(?:₹|rs\.?|inr\.?|रु\.?|रुपये?)?\s*(\d[\d,]*(?:\.\d+)?)/i);
    return m ? Number(m[1].replace(/,/g, '')) : 0;
  };

  const executeDirectCommand = async (value: string): Promise<boolean> => {
    const q = value.toLowerCase().replace(/[?？!।]/g, ' ').replace(/\s+/g, ' ').trim();
    const normalizedQ = normalizeAppVocabulary(value);
    const has = (...terms: string[]) => terms.some(t => q.includes(t.toLowerCase()) || normalizedQ.includes(t.toLowerCase()));

    // MONEY ACTIONS MUST BE RESOLVED BEFORE ANALYTICS.
    // Example: “आज 500 रुपये खर्च झाले बँकेतून” is an expense command,
    // not a “today expense total” question.
    const amount = extractAmountSafe(value);
    const isMoneyAction = amount > 0 && has(
      'खर्च', 'expense', 'वजा', 'debit', 'debit झाले', 'paid', 'payment', 'पेमेंट',
      'जमा', 'income', 'credit', 'मिळाले', 'received', 'दिले', 'दिला', 'दिली', 'भरले', 'भरला', 'भरली'
    );
    const isIncomeAction = has('जमा', 'income', 'credit', 'मिळाले', 'received', 'दिले', 'दिला', 'दिली', 'भरले', 'भरला', 'भरली');
    const isExpenseAction = has('खर्च', 'expense', 'वजा', 'debit', 'paid', 'payment', 'पेमेंट');
    if (isMoneyAction && (isIncomeAction || isExpenseAction)) {
      const income = isIncomeAction && !isExpenseAction;
      const resolution = resolveMoneyAccount(value, bankAccounts, income);
      if (!resolution.ok) {
        setAnswer(bankResolutionMessage(resolution, language));
        setDraft(null);
        return true;
      }
      const transaction = {
        kind: 'transaction' as const,
        type: income ? 'Income' as const : 'Expense' as const,
        amount,
        category: income ? 'General' : 'General Expense',
        description: value.trim(),
        date: localDateKey(new Date()),
        tag: 'Shop / Business' as const,
        sourceAccountId: resolution.accountId,
        destAccountId: null,
        isFromGalla: resolution.accountId === GALLA_ID,
      };
      setPendingCommand(value.trim());
      setDraft(transaction);
      setAnswer(null);
      return true;
    }

    // Add customer/supplier directly from AI.
    const addPartyIntent = has('customer','ग्राहक','supplier','पुरवठादार','विक्रेता') && has('add','अॅड','जोड','तयार','create','बनव');
    if (addPartyIntent) {
      const type: 'Customer'|'Supplier' = has('supplier','पुरवठादार','विक्रेता') ? 'Supplier' : 'Customer';
      let name = '';
      const patterns = [
        /(?:customer|ग्राहक|supplier|पुरवठादार|विक्रेता)\s*(?:नाव|name)?\s*[:\-]?\s*([^,\n]+?)(?:\s+(?:मोबाइल|मोबाईल|फोन|mobile|phone)\s*[:\-]?\s*\d{10})?(?:\s|$)/i,
        /(?:add|अॅड|जोड|create|बनव)\s+(?:customer|ग्राहक|supplier|पुरवठादार|विक्रेता)\s+([^,\n]+)/i,
        /(.+?)\s+(?:नावाचा|नावाची|नावाचे)\s+(?:customer|ग्राहक|supplier|पुरवठादार|विक्रेता)/i,
      ];
      for (const p of patterns) { const m = value.match(p); if (m?.[1]) { name = m[1].replace(/(?:मोबाइल|मोबाईल|फोन|mobile|phone).*$/i,'').trim(); break; } }
      if (!name) {
        const existing = findPartyInQuestion(q);
        if (existing) name = existing.name;
      }
      const phoneMatch = value.match(/(?:मोबाइल|मोबाईल|फोन|mobile|phone)\s*(?:नंबर|number)?\s*[:\-]?\s*(\d[\d\s-]{8,})/i);
      const phone = phoneMatch?.[1]?.replace(/\D/g,'').slice(-10) || '';
      if (!name || name.length < 2) {
        setAnswer(language === 'mr' ? `${type === 'Customer' ? 'Customer' : 'Supplier'} चे नाव स्पष्ट सांगा. उदाहरण: “अमोल हत्तरगीकर नावाचा customer add करा, मोबाइल 9876543210.”` : `Please specify the ${type.toLowerCase()} name.`);
        return true;
      }
      if (phone && phone.length !== 10) { setAnswer(language === 'mr' ? 'मोबाइल नंबर 10 अंकांचा असावा.' : 'Mobile number must contain 10 digits.'); return true; }
      if (findPartyExactOrPartial(name, type)) { setAnswer(language === 'mr' ? `${name} हा ${type === 'Customer' ? 'customer' : 'supplier'} आधीच सेव्ह आहे.` : `${name} is already saved.`); return true; }
      const party = makeParty(name, type, phone); addLedgerParty(party);
      setAnswer(language === 'mr' ? `${party.name} ${type === 'Customer' ? 'customer' : 'supplier'} म्हणून सेव्ह केला. ${party.phone ? `मोबाइल: ${party.phone}` : ''}` : `${party.name} was saved as a ${type.toLowerCase()}.`);
      return true;
    }

    // Delete customer/supplier. Keep it explicit because deletion is destructive.
    if (has('customer','ग्राहक','supplier','पुरवठादार','विक्रेता') && has('delete','डिलीट','काढ','हटव','remove')) {
      const party = findPartyInQuestion(q);
      if (!party) { setAnswer(language === 'mr' ? 'कोणता customer/supplier काढायचा ते नावासह सांगा.' : 'Tell me the customer or supplier name to delete.'); return true; }
      deleteLedgerParty(party.id);
      setAnswer(language === 'mr' ? `${party.name} काढण्याची विनंती केली आहे. हा party इतर नोंदींमध्ये वापरला असेल तर app त्याचे deletion रोखेल.` : `Delete requested for ${party.name}. The app will prevent deletion if it is used by other records.`);
      return true;
    }

    // Import/search a phone contact and create a customer.
    if (has('contact','कॉन्टॅक्ट','कॉन्टॅक्ट लिस्ट','संपर्क') && has('customer','ग्राहक','add','जोड','शोध','search')) {
      const term = value.replace(/.*?(?:customer|ग्राहक|contact|कॉन्टॅक्ट|संपर्क)\s*/i,'').replace(/(?:मधून|मधून|यादीतून|list मधून|शोधून|search|add|अॅड|जोड|करा|करायचा|करायचे)/gi,' ').trim();
      try {
        if (!Capacitor.isNativePlatform()) {
          setAnswer(language === 'mr' ? 'Contacts मधून थेट शोधण्यासाठी Android app मध्ये Contacts permission द्या. Web वर browser Contacts Picker उपलब्ध असल्यास तोच वापरला जाईल.' : 'Use the Android app with Contacts permission, or a browser that supports Contacts Picker.');
          return true;
        }
        const permission = await Contacts.requestPermissions();
        if (permission.contacts !== 'granted' && permission.contacts !== 'limited') { setAnswer(language === 'mr' ? 'Contacts permission मिळाली नाही.' : 'Contacts permission was not granted.'); return true; }
        const result = await Contacts.getContacts({ projection: { name: true, phones: true, emails: true, postalAddresses: true } });
        const rows = result.contacts.map(c => ({
          name: [c.name?.given,c.name?.middle,c.name?.family].filter(Boolean).join(' ') || c.name?.display || '',
          phone: c.phones?.find(p => p.number)?.number || '',
          email: c.emails?.find(e => e.address)?.address || '',
          address: (() => { const a=c.postalAddresses?.find(x=>x.street||x.city||x.region||x.postcode); return [a?.street,a?.city,a?.region,a?.postcode].filter(Boolean).join(', '); })(),
        })).filter(c => c.name || c.phone);
        const needle = term.replace(/^(customer|ग्राहक)\s*/i,'').trim().toLowerCase();
        const c = rows.find(x => !needle || `${x.name} ${x.phone}`.toLowerCase().includes(needle));
        if (!c) { setAnswer(language === 'mr' ? 'Contacts मध्ये असा संपर्क सापडला नाही.' : 'No matching contact was found.'); return true; }
        const party = makeParty(c.name, 'Customer', c.phone); party.email=c.email; party.address=c.address;
        if (findPartyExactOrPartial(c.name, 'Customer')) { setAnswer(language === 'mr' ? `${c.name} आधीच customer म्हणून सेव्ह आहे.` : `${c.name} is already saved as a customer.`); return true; }
        addLedgerParty(party);
        setAnswer(language === 'mr' ? `${c.name} Contacts मधून शोधून customer म्हणून add केला. मोबाइल: ${party.phone}` : `${c.name} was imported from Contacts and added as a customer. Phone: ${party.phone}`);
        return true;
      } catch { setAnswer(language === 'mr' ? 'Contacts उघडताना अडचण आली. Contacts permission तपासा.' : 'Could not access Contacts. Check Contacts permission.'); return true; }
    }
    // Inventory commands: stock, selling price, low-stock and deletion.
    if (has('low stock', 'low-stock', 'कमी स्टॉक', 'कमी स्टॉक दाखवा', 'लो स्टॉक')) {
      const low = inventoryItems.filter((i) => Number(i.stock) <= Number(i.minStock));
      setAnswer(low.length
        ? (language === 'mr' ? `Low Stock: ${low.map((i) => `${i.name} (${i.stock} ${i.unit})`).join(', ')}.` : `Low stock: ${low.map((i) => `${i.name} (${i.stock} ${i.unit})`).join(', ')}.`)
        : (language === 'mr' ? 'सध्या कोणताही item minimum stock खाली नाही.' : 'No item is currently at or below minimum stock.'));
      return true;
    }
    if (has('stock', 'स्टॉक', 'साठा') && !has('add', 'अॅड', 'जोड', 'update', 'बदल', 'किंमत', 'price', 'selling')) {
      const item = inventoryItems.filter(i => q.includes(i.name.toLowerCase())).sort((a,b)=>b.name.length-a.name.length)[0];
      if (!item) { setAnswer(language === 'mr' ? 'Stock पाहण्यासाठी item चे नाव स्पष्ट सांगा. उदाहरण: “पेनचा stock किती आहे?”' : 'Tell me the item name to check stock.'); return true; }
      setAnswer(language === 'mr' ? `${item.name}: ${item.stock} ${item.unit} stock आहे. Minimum stock ${item.minStock} ${item.unit}.` : `${item.name}: ${item.stock} ${item.unit} in stock. Minimum stock is ${item.minStock} ${item.unit}.`);
      return true;
    }
    const stockAddMatch = value.match(/(?:stock|स्टॉक|साठा)\s*(?:मध्ये|मध्ये)?\s*(\d+)\s*(?:नग|pcs|pieces|units|युनिट)?\s*(?:add|अॅड|जोड|वाढवा|करा)?/i);
    const itemQtyMatch = value.match(/(?:^|\s)(\d+)\s*(?:नग|pcs|pieces|units|युनिट)\s*(?:add|अॅड|जोड|वाढवा|करा)/i);
    if ((stockAddMatch || itemQtyMatch) && has('add','अॅड','जोड','वाढवा','करा')) {
      const qty = Number(stockAddMatch?.[1] || itemQtyMatch?.[1] || 0);
      const item = inventoryItems.filter(i => q.includes(i.name.toLowerCase())).sort((a,b)=>b.name.length-a.name.length)[0];
      if (!item) { setAnswer(language === 'mr' ? 'कोणत्या item चा stock वाढवायचा ते नावासह सांगा.' : 'Tell me which item stock to increase.'); return true; }
      updateInventoryItem({ ...item, stock: Math.max(0, item.stock + qty) });
      setAnswer(language === 'mr' ? `${item.name} चा stock ${qty} ${item.unit} ने वाढवला. नवीन stock: ${item.stock + qty} ${item.unit}.` : `${item.name} stock increased by ${qty}. New stock: ${item.stock + qty} ${item.unit}.`);
      return true;
    }
    if (has('selling price', 'sell price', 'विक्री किंमत', 'selling', 'किंमत बदल') && has('price','किंमत','₹','रुपये')) {
      const amount = Number(extractAmountSafe(value));
      const item = inventoryItems.filter(i => q.includes(i.name.toLowerCase())).sort((a,b)=>b.name.length-a.name.length)[0];
      if (!item || !amount) { setAnswer(language === 'mr' ? 'Selling price बदलण्यासाठी item चे नाव आणि नवीन किंमत सांगा. उदाहरण: “पेनचा selling price ₹25 करा.”' : 'Tell me the item name and new selling price.'); return true; }
      updateInventoryItem({ ...item, sellingPrice: amount });
      setAnswer(language === 'mr' ? `${item.name} ची selling price ₹${amount} केली.` : `${item.name} selling price updated to ₹${amount}.`);
      return true;
    }
    if (has('delete item','remove item','item delete','item काढ','आयटम काढ','आयटम डिलीट') ) {
      const item = inventoryItems.filter(i => q.includes(i.name.toLowerCase())).sort((a,b)=>b.name.length-a.name.length)[0];
      if (!item) { setAnswer(language === 'mr' ? 'काढायचा item चे नाव सांगा.' : 'Tell me the item name to delete.'); return true; }
      deleteInventoryItem(item.id);
      setAnswer(language === 'mr' ? `${item.name} delete करण्याची विनंती केली आहे.` : `Delete requested for ${item.name}.`);
      return true;
    }

    // Bank commands: create account with validation and show balances/deposits.
    if (has('bank account','बँक खाते','बँक अकाउंट') && has('add','अॅड','जोड','तयार','create')) {
      const bankNames = ['hdfc','sbi','state bank','icici','axis','kotak','yes bank','bank of baroda','bob','canara','union bank','idfc','indusind'];
      const bankName = bankNames.find(n => q.includes(n)) || '';
      const accountNo = (value.match(/(?:account|अकाउंट|खाते|a\/c)\s*(?:number|no|नंबर)?\s*[:\-]?\s*(\d{8,18})/i)?.[1] || '');
      const ifsc = (value.match(/\b([A-Z]{4}0[A-Z0-9]{6})\b/i)?.[1] || '').toUpperCase();
      const upi = value.match(/(?:upi|यूपीआय)\s*(?:id)?\s*[:\-]?\s*([\w.\-]+@[\w.\-]+)/i)?.[1] || '';
      if (!bankName || !accountNo || !ifsc) {
        setAnswer(language === 'mr' ? 'Bank account जोडण्यासाठी Bank name, Account number आणि IFSC सांगा. UPI ID असल्यास तोही सांगू शकता. उदाहरण: “HDFC account number 1234567890 IFSC HDFC0001234 UPI amol@okhdfc add करा.”' : 'To add a bank account, provide bank name, account number and IFSC. UPI ID is optional.');
        return true;
      }
      if (bankAccounts.some(a => a.accountNumber === accountNo)) { setAnswer(language === 'mr' ? 'हा account number आधीच सेव्ह आहे.' : 'This account number is already saved.'); return true; }
      const account = { id: generateId('bank'), bankName: bankName.toUpperCase(), accountHolderName: businessProfile.ownerName || 'User', accountNumber: accountNo, ifscCode: ifsc, accountType: has('current') ? 'Current' as const : 'Savings' as const, balance: 0, upiId: upi, createdAt: new Date().toISOString() };
      addBankAccount(account);
      setAnswer(language === 'mr' ? `${account.bankName} ${account.accountType} account सेव्ह केला. Account ending ${account.accountNumber.slice(-4)}${upi ? `, UPI ${upi}` : ''}.` : `${account.bankName} ${account.accountType} account saved. Account ending ${account.accountNumber.slice(-4)}.`);
      return true;
    }
    if (has('bank accounts','bank account list','बँक खाती','बँक अकाउंट दाखवा','माझे bank')) {
      setAnswer(bankAccounts.length ? bankAccounts.map(a => `${a.bankName} ${a.accountType} • ****${a.accountNumber.slice(-4)} • ${money(a.balance)}${a.upiId ? ` • UPI ${a.upiId}` : ''}`).join('\n') : (language === 'mr' ? 'कोणतेही bank account सेव्ह केलेले नाही.' : 'No bank accounts are saved.'));
      return true;
    }
    if (has('आज', 'today', 'काल', 'yesterday') && (has('bank','बँक') || bankAccounts.some(a => q.includes(a.bankName.toLowerCase()))) && has('जमा','deposit','मिळाले','income')) {
      const period = getPeriod(q) || { label: 'आज', from: localDateKey(new Date()), to: localDateKey(new Date()) };
      const bank = bankAccounts.find(a => q.includes(a.bankName.toLowerCase()));
      if (!bank) { setAnswer(language === 'mr' ? 'कोणत्या bank account बद्दल विचारत आहात ते नाव सांगा.' : 'Tell me the bank name.'); return true; }
      const total = cleanTransactions.filter(t => t.type === 'Income' && t.sourceAccountId === bank.id && localDateKey(t.createdAt || t.date) >= period.from && localDateKey(t.createdAt || t.date) <= period.to).reduce((s,t)=>s+Number(t.amount||0),0);
      setAnswer(language === 'mr' ? `${bank.bankName}: ${period.label} मध्ये ${money(total)} जमा झाले.` : `${bank.bankName}: ${money(total)} was deposited ${period.label.toLowerCase()}.`);
      return true;
    }

    // Cash transfer between Galla and Cash in Hand.
    if (has('galla','गल्ला') && has('cash in hand','कॅश इन हँड','हातातील रोख') && has('transfer','ट्रान्सफर','टाका','टाकले','द्या','दे')) {
      const amount = extractAmountSafe(value);
      if (!amount) { setAnswer(language === 'mr' ? 'Transfer साठी रक्कम स्पष्ट सांगा. उदाहरण: “गल्ल्यातून ₹2000 Cash in Hand मध्ये टाका.”' : 'Tell me the transfer amount.'); return true; }
      const txn = { id: generateId('txn'), type: 'Transfer' as const, amount, category: 'Transfer', description: 'Galla to Cash in Hand', date: localDateKey(new Date()), tag: 'Shop / Business' as const, sourceAccountId: GALLA_ID, destAccountId: CASH_IN_HAND_ID, isFromGalla: true, createdAt: new Date().toISOString() };
      if (addTransaction(txn)) setAnswer(language === 'mr' ? `₹${amount} Galla मधून Cash in Hand मध्ये transfer केले.` : `₹${amount} transferred from Galla to Cash in Hand.`);
      return true;
    }
    if (has('आज गल्ल्यात','आज गल्ला','galla cash','गल्ल्यात किती','galla balance')) {
      const periodRows = cleanTransactions.filter(t => t.type === 'Expense' || t.type === 'Income');
      const today = localDateKey(new Date());
      const net = periodRows.filter(t => localDateKey(t.createdAt || t.date) === today && (t.sourceAccountId === GALLA_ID || t.destAccountId === GALLA_ID)).reduce((s,t)=>s + (t.type === 'Income' ? Number(t.amount||0) : -Number(t.amount||0)),0);
      setAnswer(language === 'mr' ? `आज Galla मधील व्यवहारांचा निव्वळ बदल ${money(net)} आहे. Dashboard/Cash मध्ये actual Galla balance पाहता येईल.` : `Today's Galla transaction net change is ${money(net)}. See Cash for the actual Galla balance.`);
      return true;
    }

    // Specific party balance and supplier list.
    const namedParty = findPartyInQuestion(q);
    if (namedParty && namedParty.type === 'Customer' && has('उधारी','बाकी','due','outstanding','balance')) {
      const balance = Math.max(0, partyBalance(namedParty.id));
      setAnswer(language === 'mr' ? `${namedParty.name} यांची सध्याची उधारी ${money(balance)} आहे.` : `${namedParty.name}'s current outstanding due is ${money(balance)}.`);
      return true;
    }
    if (has('सर्व suppliers','all suppliers','सगळे supplier','supplier दाखवा','पुरवठादार दाखवा')) {
      const suppliers = ledgerParties.filter(p=>p.type==='Supplier');
      setAnswer(suppliers.length ? suppliers.map(p=>`${p.name}${p.phone ? ` — ${p.phone}` : ''}`).join('\n') : (language === 'mr' ? 'कोणतेही supplier सेव्ह केलेले नाहीत.' : 'No suppliers are saved.'));
      return true;
    }
    if (has('गल्ल्यात किती cash','गल्ल्यात किती','actual galla','galla balance')) {
      setAnswer(language === 'mr' ? `Galla balance: ${money(gallaBalance)}.` : `Galla balance: ${money(gallaBalance)}.`);
      return true;
    }
    if (has('cash in hand किती','हातात किती cash','cash in hand balance')) {
      setAnswer(language === 'mr' ? `Cash in Hand balance: ${money(cashInHandBalance)}.` : `Cash in Hand balance: ${money(cashInHandBalance)}.`);
      return true;
    }

    // Party payments / balances / lists.
    if (has('सर्व customers','all customers','सगळे customer','ग्राहक दाखवा','customers दाखवा')) {
      const customers = ledgerParties.filter(p=>p.type==='Customer');
      setAnswer(customers.length ? customers.map(p=>`${p.name}${p.phone ? ` — ${p.phone}` : ''} — बाकी ${money(Math.max(0, partyBalance(p.id)))}`).join('\n') : (language === 'mr' ? 'कोणतेही customer सेव्ह केलेले नाहीत.' : 'No customers are saved.'));
      return true;
    }
    const paymentAmount = extractAmountSafe(value);
    if (paymentAmount && has('ने आज','ने','paid','दिले','दिला','भरले','जमा केले','payment') && (has('customer','ग्राहक') || findPartyInQuestion(q))) {
      const party = findPartyInQuestion(q);
      if (!party || party.type !== 'Customer') { setAnswer(language === 'mr' ? 'Payment साठी customer चे नाव स्पष्ट सांगा.' : 'Tell me the customer name for the payment.'); return true; }
      const balance = partyBalance(party.id);
      if (balance <= 0) { setAnswer(language === 'mr' ? `${party.name} यांची सध्या उधारी नाही.` : `${party.name} has no outstanding due.`); return true; }
      if (paymentAmount > balance) { setAnswer(language === 'mr' ? `${party.name} ची बाकी ${money(balance)} आहे; ${money(paymentAmount)} जास्त आहे. योग्य रक्कम सांगा.` : `${party.name} owes ${money(balance)}; the payment is higher.`); return true; }
      const paymentResolution = hasExplicitBankReference(value) || has('cash in hand','कॅश इन हँड','हातातील रोख','galla','गल्ला')
        ? resolveMoneyAccount(value, bankAccounts, true)
        : { ok: true as const, accountId: GALLA_ID, label: 'Galla', kind: 'galla' as const };
      if (!paymentResolution.ok) {
        setAnswer(bankResolutionMessage(paymentResolution, language));
        return true;
      }
      addLedgerEntry({ id: generateId('ledger'), partyId: party.id, type: 'Received', amount: paymentAmount, description: 'Payment received via AI', date: localDateKey(new Date()), createdAt: new Date().toISOString() });
      addTransaction({ id: generateId('txn'), type: 'Income', amount: paymentAmount, category: 'Business Revenue', description: `Payment received — ${party.name}`, date: localDateKey(new Date()), tag: 'Shop / Business', sourceAccountId: paymentResolution.accountId, destAccountId: null, isFromGalla: paymentResolution.accountId === GALLA_ID, createdAt: new Date().toISOString() });
      setAnswer(language === 'mr' ? `${party.name} कडून ${money(paymentAmount)} ${paymentResolution.label} मध्ये जमा नोंदवले. उरलेली उधारी ${money(balance-paymentAmount)}.` : `Recorded ${money(paymentAmount)} from ${party.name} into ${paymentResolution.label}. Remaining due ${money(balance-paymentAmount)}.`);
      return true;
    }

    // Bills and sales lookup.
    if (has('pending bills','pending bill','बाकी बिल','बाकीचे बिल','बाकीची बिले','पेंडिंग बिल','पेंडिंग बिले','उधारीचे बिल','उधारीची बिले')) {
      const party = findPartyInQuestion(q);
      const rows = invoices.filter(inv => Number(inv.balanceDue||0)>0 && (!party || (inv.customerId===party.id || inv.customerName.toLowerCase()===party.name.toLowerCase())));
      setAnswer(rows.length
        ? rows.map(inv=>`${inv.invoiceNumber} • ${inv.customerName} • बाकी ${money(Number(inv.balanceDue||0))} • ${inv.date}`).join('\n')
        : (party
          ? (language === 'mr' ? `${party.name} यांचे pending bill सापडले नाही.` : `No pending bills found for ${party.name}.`)
          : (language === 'mr' ? 'Pending bill सापडले नाही. ग्राहकाचे नाव स्पष्ट सांगा.' : 'No pending bills found. Please specify the customer name.')));
      return true;
    }
    if (has('आजची sales','today sales','आजच्या विक्री','आजचे bill','आजची bills')) {
      const today = localDateKey(new Date());
      const rows = invoices.filter(inv => localDateKey(inv.createdAt || inv.date) === today);
      const total = rows.reduce((s,inv)=>s+Number(inv.total||0),0);
      setAnswer(language === 'mr' ? `आज ${rows.length} sales/bills आहेत. एकूण ${money(total)}.` : `Today there are ${rows.length} sales/bills totaling ${money(total)}.`);
      return true;
    }
    if (has('day book','daybook','day book सांग','डे बुक')) {
      const today = localDateKey(new Date());
      const rows = cleanTransactions.filter(t=>localDateKey(t.createdAt || t.date)===today);
      setAnswer(rows.length ? rows.map(t=>`${t.type} • ${money(Number(t.amount||0))} • ${t.description}`).join('\n') : (language === 'mr' ? 'आज Day Book मध्ये व्यवहार नाहीत.' : 'No transactions in today\'s Day Book.'));
      return true;
    }
    if (has('profit loss','profit and loss','नफा तोटा','नफा-तोटा')) {
      const period = getPeriod(q) || { label: language === 'mr' ? 'आज' : 'Today', from: localDateKey(new Date()), to: localDateKey(new Date()) };
      const rows = cleanTransactions.filter(t=>{const d=localDateKey(t.createdAt||t.date);return d>=period.from&&d<=period.to;});
      const income=rows.filter(t=>t.type==='Income').reduce((s,t)=>s+Number(t.amount||0),0); const expense=rows.filter(t=>t.type==='Expense').reduce((s,t)=>s+Number(t.amount||0),0); const net=income-expense;
      setAnswer(language === 'mr' ? `${period.label}: उत्पन्न ${money(income)}, खर्च ${money(expense)}, ${net>=0?'नफा':'तोटा'} ${money(Math.abs(net))}.` : `${period.label}: income ${money(income)}, expenses ${money(expense)}, ${net>=0?'profit':'loss'} ${money(Math.abs(net))}.`);
      return true;
    }
    if (has('मागील आठवड्यात किती खर्च','last week expenses','गेल्या आठवड्यात खर्च')) {
      const period=getPeriod('मागील आठवडा')!; const total=cleanTransactions.filter(t=>t.type==='Expense'&&localDateKey(t.createdAt||t.date)>=period.from&&localDateKey(t.createdAt||t.date)<=period.to).reduce((s,t)=>s+Number(t.amount||0),0);
      setAnswer(language === 'mr' ? `मागील आठवड्यातील खर्च ${money(total)}.` : `Last week's expenses were ${money(total)}.`); return true;
    }

    // Ambiguous dark-mode command: never guess whether the user wants it on or off.
    if (has('dark mode', 'डार्क मोड', 'darkmode') && !has('चालू', 'on', 'enable', 'enabled', 'बंद', 'off', 'disable', 'disabled')) {
      setAnswer(language === 'mr'
        ? `Dark mode सध्या ${isDarkMode ? 'चालू' : 'बंद'} आहे. तुम्हाला तो चालू करायचा आहे की बंद करायचा?`
        : `Dark mode is currently ${isDarkMode ? 'on' : 'off'}. Do you want me to turn it on or turn it off?`);
      return true;
    }

    // Settings and navigation actions.
    if (has('मराठी करा','मराठी कर','marathi करा','marathi कर','marathi language','language marathi','switch to marathi','change language to marathi','app भाषा मराठी कर','app language marathi','भाषा marathi')) { setLanguage('mr'); setAnswer('भाषा मराठी केली.'); return true; }
    if (has('english करा','इंग्लिश करा','इंग्लिश कर','इंग्रजी करा','इंग्रजी कर','english कर','english करा','english language','language english','switch to english','change language to english','app भाषा इंग्लिश कर','app language english','भाषा english','भाषा इंग्लिश')) { setLanguage('en'); setAnswer('Language changed to English.'); return true; }
    if (has('dark mode चालू','dark mode on','डार्क मोड चालू')) { if (!isDarkMode) toggleDarkMode(); setAnswer(language === 'mr' ? 'Dark mode चालू केला.' : 'Dark mode enabled.'); return true; }
    if (has('dark mode बंद','dark mode off','डार्क मोड बंद')) { if (isDarkMode) toggleDarkMode(); setAnswer(language === 'mr' ? 'Dark mode बंद केला.' : 'Dark mode disabled.'); return true; }
    if (has('app lock चालू','app lock on','लॉक चालू')) { setAppLockEnabled(true); setAnswer(language === 'mr' ? 'App Lock चालू करण्याची प्रक्रिया सुरू केली. Settings मध्ये PIN सेट करा.' : 'App Lock was enabled; set the PIN in Settings.'); return true; }
    if (has('business details','business information','व्यवसायाची माहिती','माझे business details')) { const b=businessProfile; setAnswer(language === 'mr' ? `Business: ${b.businessName}\nOwner: ${b.ownerName}\nMobile: ${b.phone || 'सेव्ह नाही'}\nEmail: ${b.email || 'सेव्ह नाही'}\nGSTIN: ${b.gstin || 'सेव्ह नाही'}` : `Business: ${b.businessName}\nOwner: ${b.ownerName}\nPhone: ${b.phone || 'Not saved'}\nEmail: ${b.email || 'Not saved'}\nGSTIN: ${b.gstin || 'Not saved'}`); return true; }

    // Quick navigation: AI can open the relevant app module.
    const routes: Array<[string[], string, string]> = [
      [['home'], '/', 'Home'],
      [['inventory page','inventory'], '/inventory', 'Inventory'],
      [['banking page','banking','bank','account'], '/banking', 'Banking'],
      [['cash page','cash','galla'], '/cash', 'Cash'],
      [['ledger page','ledger','party ledger','due'], '/ledger', 'Ledger'],
      [['reports page','report','reports'], '/reports', 'Reports'],
      [['settings page','settings'], '/settings', 'Settings'],
      [['pos page','pos'], '/pos', 'POS'],
      [['invoice page','sale','invoice','bill'], '/invoice', 'Sale / Invoice'],
      [['sales history page'], '/sales-history', 'Sales History'],
      [['transactions page','transaction','transactions'], '/transactions', 'Transactions'],
      [['menu page'], '/menu', 'Menu'],
    ];
    // Navigation is intentionally based on the shared vocabulary dictionary.
    // This lets Marathi, English, Hinglish and speech-to-text variants work:
    // "व्यवहार पेज ओपन कर", "transaction page open", "पेज उघडा", etc.
    if (has('open','page','screen')) {
      const route = routes.find(([terms]) => terms.some(t => has(t)));
      if (route) { window.location.href = route[1]; return true; }
    }

    return false;
  };

  const answerQuestion = (raw: string) => {
    const q = raw.toLowerCase().replace(/[?？!।]/g, ' ').replace(/\s+/g, ' ').trim();
    const normalizedQ = normalizeAppVocabulary(raw);
    const hasAny = (...terms: string[]) => terms.some((term) => q.includes(term.toLowerCase()) || normalizedQ.includes(term.toLowerCase()));
    let response: string | null = null;

    // Greetings should always get a friendly response, rather than being treated as an error.
    if (/^(हॅलो|हलो|हाय|हॅाय|नमस्कार|hello|hi|hey)(\s|$)/i.test(q)) {
      response = language === 'mr'
        ? 'नमस्कार! मी VyaparOS AI Assistant आहे. तुम्ही मला व्यवहार, ग्राहक, उधारी, बिल, रिपोर्ट, नफा-तोटा किंवा इतर app कामाबद्दल बोलून किंवा टाइप करून सांगू शकता.'
        : 'Hello! I am the VyaparOS AI Assistant. You can ask me about transactions, customers, dues, bills, reports, profit and loss, or other app tasks by voice or typing.';
    }

    // Sales/business total for yesterday: "कालचा व्यापार किती झाला आहे?"
    // Use saved invoices as the sales source so this works even when the user
    // does not use the word transaction/income/expense.
    if (!response && hasAny('कालचा व्यापार', 'कालचा व्यवसाय', 'कालची विक्री', 'काल किती व्यापार', 'yesterday sales', 'yesterday business', 'yesterday trade')) {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      const yesterday = localDateKey(d);
      const rows = invoices.filter((inv) => localDateKey(inv.createdAt || inv.date) === yesterday);
      const total = rows.reduce((sum, inv) => sum + Number(inv.total || 0), 0);
      const paid = rows.reduce((sum, inv) => sum + Math.max(0, Number(inv.total || 0) - Number(inv.balanceDue || 0)), 0);
      const pending = rows.reduce((sum, inv) => sum + Math.max(0, Number(inv.balanceDue || 0)), 0);
      response = language === 'mr'
        ? `कालचा व्यापार ${money(total)} झाला. एकूण ${rows.length} बिल/विक्री झाली. जमा ${money(paid)} आणि बाकी ${money(pending)}.`
        : `Yesterday's business was ${money(total)}. There were ${rows.length} bills/sales. Received ${money(paid)} and pending ${money(pending)}.`;
    }

    // Analytics: today / yesterday / month / previous week.
    const asksAnalytics = hasAny('व्यवहार', 'transaction', 'खर्च', 'expense', 'उत्पन्न', 'income', 'मिळाले', 'नफा', 'profit', 'तोटा', 'loss', 'तुलना', 'compare') && !hasAny('तुलना', 'compare', 'आज काल', 'आज आणि काल', 'today yesterday');
    if (!response && asksAnalytics) {
      const period = getPeriod(q);
      if (period) {
        const rows = cleanTransactions.filter((t) => {
          const d = localDateKey(t.createdAt || t.date);
          return d >= period.from && d <= period.to;
        });
        const income = rows.filter((t) => t.type === 'Income').reduce((s, t) => s + Number(t.amount || 0), 0);
        const expense = rows.filter((t) => t.type === 'Expense').reduce((s, t) => s + Number(t.amount || 0), 0);
        const net = income - expense;
        const count = rows.length;
        if (hasAny('किती व्यवहार', 'number of transactions', 'transactions किती', 'व्यवहार किती')) {
          response = language === 'mr'
            ? `${period.label}: एकूण ${count} व्यवहार झाले. उत्पन्न ${money(income)} आणि खर्च ${money(expense)} आहे.`
            : `${period.label}: ${count} transactions. Income ${money(income)} and expenses ${money(expense)}.`;
        } else if (hasAny('खर्च', 'expense')) {
          response = language === 'mr' ? `${period.label}: एकूण खर्च ${money(expense)} झाला.` : `${period.label}: total expenses were ${money(expense)}.`;
        } else if (hasAny('मिळाले', 'उत्पन्न', 'income')) {
          response = language === 'mr' ? `${period.label}: एकूण उत्पन्न ${money(income)} झाले.` : `${period.label}: total income was ${money(income)}.`;
        } else {
          response = language === 'mr'
            ? `${period.label}: उत्पन्न ${money(income)}, खर्च ${money(expense)}, ${net >= 0 ? 'नफा' : 'तोटा'} ${money(Math.abs(net))}.`
            : `${period.label}: income ${money(income)}, expenses ${money(expense)}, ${net >= 0 ? 'profit' : 'loss'} ${money(Math.abs(net))}.`;
        }
      }
    }

    // Combined period summaries: answer both money-in and money-out when explicitly requested.
    if (!response && (hasAny('मागील आठवड्यात','गेल्या आठवड्यात','last week','previous week')) && hasAny('खर्च','expense') && hasAny('मिळाले','उत्पन्न','income','जमा')) {
      const period=getPeriod('मागील आठवडा')!;
      const rows=cleanTransactions.filter(t=>{const d=localDateKey(t.createdAt||t.date);return d>=period.from&&d<=period.to;});
      const income=rows.filter(t=>t.type==='Income').reduce((s,t)=>s+Number(t.amount||0),0);
      const expense=rows.filter(t=>t.type==='Expense').reduce((s,t)=>s+Number(t.amount||0),0);
      setAnswer(language==='mr'?`मागील आठवडा: मिळाले ${money(income)}, खर्च ${money(expense)}, निव्वळ फरक ${money(income-expense)}.`:`Last week: received ${money(income)}, spent ${money(expense)}, net difference ${money(income-expense)}.`);
    }

    // Today vs yesterday / this month vs previous month comparison.
    if (!response && hasAny('तुलना', 'compare', 'आज काल', 'आज आणि काल', 'today yesterday')) {
      const now = new Date();
      const today = localDateKey(now);
      const y = new Date(now); y.setDate(y.getDate() - 1);
      const yesterday = localDateKey(y);
      const calc = (from: string, to: string) => {
        const rows = cleanTransactions.filter((t) => { const d = localDateKey(t.createdAt || t.date); return d >= from && d <= to; });
        return {
          count: rows.length,
          income: rows.filter((t) => t.type === 'Income').reduce((s, t) => s + Number(t.amount || 0), 0),
          expense: rows.filter((t) => t.type === 'Expense').reduce((s, t) => s + Number(t.amount || 0), 0),
        };
      };
      const a = calc(today, today), b = calc(yesterday, yesterday);
      response = language === 'mr'
        ? `आज: ${a.count} व्यवहार, उत्पन्न ${money(a.income)}, खर्च ${money(a.expense)}.\nकाल: ${b.count} व्यवहार, उत्पन्न ${money(b.income)}, खर्च ${money(b.expense)}.\nफरक: उत्पन्न ${money(a.income - b.income)}, खर्च ${money(a.expense - b.expense)}.`
        : `Today: ${a.count} transactions, income ${money(a.income)}, expenses ${money(a.expense)}.\nYesterday: ${b.count} transactions, income ${money(b.income)}, expenses ${money(b.expense)}.\nDifference: income ${money(a.income - b.income)}, expenses ${money(a.expense - b.expense)}.`;
    }

    // Highest customer credit/udhari.
    if (!response && hasAny('जास्त उधारी', 'सर्वात जास्त उधारी', 'highest due', 'most due', 'जास्त बाकी', 'कोणाची उधारी')) {
      const customers = ledgerParties.filter((p) => p.type === 'Customer').map((p) => ({ party: p, balance: partyBalance(p.id) })).filter((x) => x.balance > 0).sort((a, b) => b.balance - a.balance);
      if (!customers.length) response = language === 'mr' ? 'सध्या कोणत्याही ग्राहकाची उधारी बाकी दिसत नाही.' : 'No customer credit balance is currently recorded.';
      else response = language === 'mr' ? `सर्वात जास्त उधारी: ${customers[0].party.name} — ${money(customers[0].balance)} बाकी.` : `Highest customer due: ${customers[0].party.name} — ${money(customers[0].balance)} outstanding.`;
    }

    // Customer phone lookup.
    if (!response && hasAny('मोबाइल', 'मोबाईल', 'फोन', 'mobile', 'phone', 'number') && hasAny('ग्राहक', 'customer', 'party', 'पार्टी')) {
      const party = findPartyInQuestion(q);
      if (!party) response = language === 'mr' ? 'मोबाइल नंबर पाहण्यासाठी ग्राहकाचे नाव स्पष्ट सांगा. उदाहरण: “अमोल हत्तरगीकर यांचा मोबाइल नंबर काय आहे?”' : 'Tell me the customer name to find the saved mobile number.';
      else response = party.phone ? `${party.name} — ${party.phone}` : `${party.name} साठी मोबाइल नंबर सेव्ह केलेला नाही.`;
    }

    // Pending customer bill -> open WhatsApp with a prefilled message. The user still presses Send.
    if (!response && hasAny('whatsapp', 'व्हॉट्सअॅप', 'व्हाट्सअॅप') && hasAny('pending', 'बाकी', 'उधारी', 'बिल')) {
      const party = findPartyInQuestion(q);
      if (!party) {
        response = language === 'mr' ? 'WhatsApp करण्यासाठी ग्राहकाचे नाव स्पष्ट सांगा. उदाहरण: “अमोलचे pending bill WhatsApp करा.”' : 'Tell me the customer name, for example: “Send Amol’s pending bill on WhatsApp.”';
      } else if (!party.phone) {
        response = `${party.name} साठी मोबाइल नंबर सेव्ह केलेला नाही. आधी ग्राहकाचा मोबाइल नंबर सेव्ह करा.`;
      } else {
        const pending = invoices.filter((inv) => {
          const sameCustomer = (inv.customerId && inv.customerId === party.id) || inv.customerName.toLowerCase() === party.name.toLowerCase();
          return sameCustomer && Number(inv.balanceDue || 0) > 0;
        });
        const totalDue = pending.reduce((sum, inv) => sum + Number(inv.balanceDue || 0), 0);
        if (totalDue <= 0) response = `${party.name} यांचे pending bill सध्या दिसत नाही.`;
        else {
          const phone = party.phone.replace(/\D/g, '');
          const waPhone = phone.length === 10 ? `91${phone}` : phone;
          const billLines = pending.slice(0, 10).map((inv) => `${inv.invoiceNumber}: ${money(Number(inv.balanceDue || 0))}`).join('\n');
          const message = `नमस्कार ${party.name},\n\nआपले ${pending.length} pending bill आहे. एकूण बाकी: ${money(totalDue)}.\n${billLines}\n\nकृपया बाकी रक्कम भरण्याची कृपया नोंद घ्या. धन्यवाद.`;
          const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`;
          if (typeof window !== 'undefined') window.open(waUrl, '_blank', 'noopener,noreferrer');
          response = `${party.name} यांचे pending bill ${money(totalDue)} आहे. WhatsApp संदेश तयार करून उघडला आहे. **फक्त Send दाबा.**`;
        }
      }
    }

    if (!response && hasAny('ग्राहक', 'customer') && hasAny('add', 'अॅड', 'जोड', 'करायचा', 'करायची', 'करायचे')) response = 'ग्राहक अॅड करण्यासाठी Ledger / Parties मध्ये जा → Add Party निवडा → Customer निवडा → नाव, मोबाइल, पत्ता आणि GST Details भरा → Save करा. हे काम तुम्ही मला बोलून किंवा टाइप करून सांगू शकता.';
    else if (!response && hasAny('supplier', 'पुरवठादार', 'विक्रेता') && hasAny('add', 'अॅड', 'जोड', 'करायचा', 'करायची', 'करायचे')) response = 'Supplier अॅड करण्यासाठी Ledger / Parties मध्ये जा → Add Party निवडा → Supplier निवडा → नाव, मोबाइल, पत्ता आणि आवश्यक GST Details भरा → Save करा. हे काम तुम्ही मला बोलून किंवा टाइप करून सांगू शकता.';
    else if (!response && hasAny('invoice', 'बिल', 'इनव्हॉइस') && hasAny('कसा', 'कसे', 'तयार', 'बनव', 'करायचा', 'करायचे')) response = 'Invoice तयार करण्यासाठी Sale उघडा → Customer निवडा → Items जोडा → payment माहिती भरा → Save करा. तुम्ही मला ग्राहकाचे नाव, item आणि रक्कम सांगितली तरी मी invoice draft तयार करून दाखवू शकतो. हे काम तुम्ही मला बोलून किंवा टाइप करून सांगू शकता.';
    else if (!response && hasAny('inventory', 'स्टॉक', 'आयटम', 'item') && hasAny('add', 'अॅड', 'जोड', 'करायचा', 'करायचे')) response = 'Inventory मध्ये Add Item निवडा → item name, category, unit, purchase price, selling price, current stock आणि minimum stock भरा → हवे असल्यास photo व Show on POS सेट करा → Save करा. हे काम तुम्ही मला बोलून किंवा टाइप करून सांगू शकता.';
    else if (!response && hasAny('bank account', 'bank', 'बँक', 'खाते') && hasAny('add', 'अॅड', 'जोड', 'करायचा', 'करायचे', 'कसे')) response = 'Bank & Savings मध्ये Add New Bank निवडा → Savings किंवा Current account निवडा → Bank name, account number, IFSC, UPI ID आणि opening balance भरा → Save करा. हे काम तुम्ही मला बोलून किंवा टाइप करून सांगू शकता.';
    else if (!response && ((hasAny('galla', 'गल्ला') && hasAny('cash in hand', 'हातातील रोख', 'घरची रोख', 'कॅश इन हँड')) || hasAny('फरक', 'difference'))) response = 'Galla म्हणजे दुकानातील cash box म्हणजेच दुकानाचा गल्ला. Cash in Hand म्हणजे तुमच्याकडे हातात किंवा घर/जवळील ठिकाणी असलेली रोख रक्कम. दोन्ही स्वतंत्र balances आहेत. हे काम तुम्ही मला बोलून किंवा टाइप करून विचारू शकता.';
    else if (!response && hasAny('transaction', 'ट्रान्झॅक्शन', 'व्यवहार') && hasAny('कसा', 'कसे', 'add', 'अॅड', 'करायचा', 'करायचे')) response = 'Transaction मध्ये Income, Expense, Savings आणि Transfer करता येतात. तुम्ही मला “आज 500 रुपये खर्च झाला” किंवा “आज 5000 विक्री झाली” असे बोलून किंवा टाइप करून सांगू शकता. मी आधी समजलेली entry दाखवेन आणि Save Entry केल्यावर सेव्ह करेन. हे काम तुम्ही मला बोलून किंवा टाइप करून सांगू शकता.';
    else if (!response && hasAny('report', 'रिपोर्ट', 'अहवाल') && hasAny('कुठे', 'कसा', 'कसे', 'मिळेल', 'मिळतात')) response = 'Reports विभागात Day Book, Profit & Loss, charts आणि exports मिळतात. तुम्ही मला कोणता report हवा आहे ते बोलून किंवा टाइप करून सांगू शकता.';
    else if (!response && hasAny('party ledger', 'party', 'ledger', 'पार्टी', 'लेजर') && hasAny('कसे', 'कसा', 'वापर', 'करायचा', 'करायचे')) response = 'Party Ledger मध्ये Customer किंवा Supplier निवडा. त्या party चे Given / Received entries, balance आणि transaction history पाहता येते. Add Party किंवा Edit मधून माहिती बदलता येते. हे काम तुम्ही मला बोलून किंवा टाइप करून सांगू शकता.';
    else if (!response && hasAny('settings', 'सेटिंग', 'सेटिंग्स') && hasAny('काय', 'कसे', 'करता', 'मिळते', 'मिळतात')) response = 'Settings मध्ये profile, business information, language, dark mode, signature/stamp, transaction categories, app preferences आणि उपलब्ध security/app-lock settings व्यवस्थापित करता येतात. हे काम तुम्ही मला बोलून किंवा टाइप करून विचारू शकता.';
    else if (!response && hasAny('pos') && hasAny('कसा', 'कसे', 'वापर', 'करायचा', 'करायचे')) response = 'POS मध्ये POS साठी उपलब्ध items निवडा → quantity/cart तयार करा → Customer/payment माहिती निवडा → Sale Save करा. Cash payment असल्यास sale ची रक्कम Galla मध्ये जाते. हे काम तुम्ही मला बोलून किंवा टाइप करून सांगू शकता.';
    else if (!response && hasAny('delete', 'डिलीट', 'हटव') && hasAny('transaction', 'entry', 'व्यवहार')) response = 'Transaction history मध्ये संबंधित entry चे menu उघडा आणि Edit किंवा Delete निवडा. दुसऱ्या record मध्ये वापरलेल्या माहितीवर सुरक्षितता लागू आहे. हे काम तुम्ही मला बोलून किंवा टाइप करून सांगू शकता.';
    else if (!response && hasAny('help', 'मदत', 'काय काय', 'तू काय', 'काय करू शकतोस')) response = 'मी VyaparOS मध्ये transactions, Expense/Income/Savings/Transfer, Sale invoice, ग्राहक/Supplier, उधारी, मोबाइल नंबर, pending bill WhatsApp, POS, Reports आणि नफा-तोटा याबद्दल माहिती देऊ शकतो. हे काम तुम्ही मला बोलून किंवा टाइप करून सांगू शकता.';

    if (response) {
      setAnswer(response);
      setDraft(null);
      return true;
    }

    // If the user clearly refers to an app feature but the sentence is not
    // understood, ask about that feature instead of giving a generic error.
    const featureHints: Array<[string[], string, string]> = [
      [['customer','ग्राहक'], 'customer', 'ग्राहक'],
      [['supplier','पुरवठादार','विक्रेता'], 'supplier', 'supplier'],
      [['inventory','स्टॉक','item','आयटम'], 'inventory', 'inventory'],
      [['bank','बँक','account','खाते'], 'bank', 'bank account'],
      [['cash','galla','गल्ला','cash in hand','कॅश इन हँड'], 'cash', 'cash / Galla'],
      [['bill','invoice','इनव्हॉइस'], 'bill', 'bill/invoice'],
      [['transaction','व्यवहार','ट्रान्झॅक्शन'], 'transaction', 'transaction'],
      [['report','reports','रिपोर्ट','अहवाल'], 'report', 'report'],
      [['ledger','लेजर','उधारी','बाकी'], 'ledger', 'ledger / उधारी'],
      [['pos'], 'pos', 'POS'],
      [['settings','सेटिंग','सेटिंग्स'], 'settings', 'settings'],
      [['app lock','अॅप लॉक','लॉक'], 'app lock', 'App Lock'],
      [['whatsapp','व्हॉट्सअॅप','व्हाट्सअॅप'], 'whatsapp', 'WhatsApp'],
    ];
    const feature = featureHints.find(([terms]) => terms.some((term) => q.includes(term) || normalizedQ.includes(term.toLowerCase())));
    if (feature) {
      const label = feature[2];
      setAnswer(language === 'mr'
        ? `तुम्ही ${label} संबंधी विचारत आहात असे दिसते, पण नेमके काय करायचे ते समजले नाही. कृपया स्पष्ट सांगा — उदाहरणार्थ “${feature[1] === 'customer' ? 'अमोलचा मोबाइल नंबर द्या' : feature[1] === 'inventory' ? 'पेनचा stock किती आहे?' : feature[1] === 'bill' ? 'अमोलचे pending bill दाखवा' : feature[1] === 'transaction' ? 'आज ₹500 खर्च झाला' : feature[1] === 'bank' ? 'माझे bank accounts दाखवा' : feature[1] === 'report' ? 'कालचा व्यापार किती झाला?' : 'याबद्दल काय करायचे ते सांगा'}”.`
        : `I can see that you are asking about ${label}, but I did not understand the exact task. Please tell me what you want to do, for example: “${feature[1] === 'customer' ? 'Give me Amol’s mobile number' : feature[1] === 'inventory' ? 'How much pen stock is there?' : feature[1] === 'bill' ? 'Show Amol’s pending bill' : feature[1] === 'transaction' ? 'Record ₹500 expense today' : feature[1] === 'bank' ? 'Show my bank accounts' : feature[1] === 'report' ? 'How much was yesterday’s business?' : 'Tell me what you want to do with it'}”.`);
      return true;
    }
    return false;
  };

  const parseCommand = async (raw: string) => {
    const value = raw.trim();
    if (!value) return;

    setChatMessages(prev => [...prev, { id: generateId('user-chat'), role: 'user', text: value }]);
    setLastCommand(value);
    textRef.current = '';
    setText('');
    setAnswer(null);
    setProcessing(true);

    try {
      // “शिकवा ... म्हणजे ...” creates a persistent shortcut.
      if (await tryAutoTeach(value)) return;

      // Learned commands remain higher priority than the generic parser.
      const learned = findLearnedCommand(value, user?.id);
      if (learned) {
        markLearnedCommandUsed(learned.id, user?.id);
        refreshLearnedCommands();
        setAnswer(language === 'mr'
          ? `शिकवलेली command वापरत आहे: “${learned.phrase}”`
          : `Using learned command: “${learned.phrase}”`);
        const learnedResult = parseAssistantCommand(learned.canonicalCommand, bankAccounts, inventoryItems);
        if (learnedResult) {
          setDraft(learnedResult);
          setPendingCommand(value);
          setHistory(prev => [value, ...prev.filter(item => item !== value)].slice(0, 10));
          return;
        }
      }

      // Invoice commands are resolved before generic payment commands.
      if (looksLikeInvoice(value)) {
        const invoiceResult = parseAssistantCommand(value, bankAccounts, inventoryItems);
        if (invoiceResult && 'invoice' in invoiceResult) {
          setDraft(invoiceResult);
          setPendingCommand(value);
          setHistory(prev => [value, ...prev.filter(item => item !== value)].slice(0, 10));
          return;
        }
      }

      // IMPORTANT: deterministic finance rules run BEFORE Gemini/analytics.
      // This prevents “आज 500 रुपये खर्च झाले बँकेतून” from becoming
      // “आजचा खर्च किती?” and returning ₹0.
      if (await executeDirectCommand(value)) {
        setHistory(prev => [value, ...prev.filter(item => item !== value)].slice(0, 10));
        return;
      }

      let geminiFailure: string | null = null;
      if (typeof navigator === 'undefined' || navigator.onLine) {
        const gemini = await askGeminiCommand(value);
        if (gemini.result) {
          if (gemini.result.route === 'GENERAL' && gemini.result.answer) {
            setAnswer(gemini.result.answer);
            setHistory(prev => [value, ...prev.filter(item => item !== value)].slice(0, 10));
            return;
          }
          if (gemini.result.normalized_command) {
            const normalized = gemini.result.normalized_command;
            if (await executeDirectCommand(normalized)) {
              setHistory(prev => [value, ...prev.filter(item => item !== value)].slice(0, 10));
              return;
            }
            if (answerQuestion(normalized)) {
              setHistory(prev => [value, ...prev.filter(item => item !== value)].slice(0, 10));
              return;
            }
            const geminiResult = parseAssistantCommand(normalized, bankAccounts, inventoryItems);
            if (geminiResult) {
              setDraft(geminiResult);
              setPendingCommand(value);
              setHistory(prev => [value, ...prev.filter(item => item !== value)].slice(0, 10));
              return;
            }
          }
        } else if (gemini.error) {
          geminiFailure = gemini.error;
        }
      }

      // Local fallback.
      if (answerQuestion(value)) {
        setHistory(prev => [value, ...prev.filter(item => item !== value)].slice(0, 10));
        return;
      }

      const result = parseAssistantCommand(value, bankAccounts, inventoryItems);
      if (result) {
        setDraft(result);
        setPendingCommand(value);
        setHistory(prev => [value, ...prev.filter(item => item !== value)].slice(0, 10));
        return;
      }

      const validation = getAssistantValidationMessage(value, language);
      const message = validation || (language === 'mr'
        ? 'ही command मला समजली नाही. कृपया स्पष्टपणे सांगा की काय करायचे आहे. उदाहरण: “आज Cash in Hand मधून ₹1500 बटाटा खरेदी केला.”'
        : 'I did not understand this command. Please clearly tell me what you want to do.');
      setAnswer(message);
      setDraft(null);
      if (geminiFailure && typeof navigator !== 'undefined' && navigator.onLine) {
        toast.error(language === 'mr' ? `Gemini online AI उपलब्ध नाही: ${geminiFailure}` : `Gemini online AI is unavailable: ${geminiFailure}`);
      } else {
        toast.error(message);
      }
    } finally {
      setProcessing(false);
    }
  };

  const voiceSessionRef = useRef(false);
  const nativeStartRef = useRef<(() => Promise<void>) | null>(null);

  const startVoice = async () => {
    if (!supported) {
      toast.error(language === 'mr' ? 'या डिव्हाइसवर Voice उपलब्ध नाही.' : 'Voice input is not available on this device.');
      return;
    }

    voiceSessionRef.current = true;

    if (Capacitor.isNativePlatform() && nativeSpeech) {
      const startNative = async () => {
        if (!voiceSessionRef.current) return;
        try {
          const permission = await SpeechRecognition.checkPermissions();
          if (permission.speechRecognition !== 'granted') {
            const requested = await SpeechRecognition.requestPermissions();
            if (requested.speechRecognition !== 'granted') {
              voiceSessionRef.current = false;
              setListening(false);
              toast.error(language === 'mr' ? 'Microphone permission द्या.' : 'Please allow microphone permission.');
              return;
            }
          }

          setListening(true);
          await SpeechRecognition.start({
            language: language === 'mr' ? 'mr-IN' : 'en-IN',
            maxResults: 5,
            partialResults: true,
            popup: false,
          });
        } catch {
          if (voiceSessionRef.current) {
            voiceSessionRef.current = false;
            setListening(false);
            toast.error(language === 'mr' ? 'Voice सुरू करता आले नाही.' : 'Could not start voice input.');
          }
        }
      };

      nativeStartRef.current = startNative;
      nativeListenersRef.current.forEach((listener) => listener?.remove?.());
      nativeListenersRef.current = [];

      const partialHandle = await SpeechRecognition.addListener('partialResults', (data) => {
        const matches = Array.isArray(data.matches) ? data.matches : [];
        const transcript = matches.filter((v: unknown) => typeof v === 'string').join(' ').trim();
        if (transcript) updateText(transcript, false);
      });
      const stateHandle = await SpeechRecognition.addListener('listeningState', (data) => {
        if (data.status !== 'stopped') return;
        setListening(false);
        if (voiceSessionRef.current) {
          // Android often stops recognition after a short pause. Restart it so
          // the user can speak a complete sentence without losing the first part.
          window.setTimeout(() => { void nativeStartRef.current?.(); }, 180);
        } else {
          partialHandle.remove();
          stateHandle.remove();
          nativeListenersRef.current = [];
          const command = textRef.current.trim();
          if (command) parseCommand(command);
        }
      });
      nativeListenersRef.current = [partialHandle, stateHandle];
      void startNative();
      return;
    }

    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new Recognition();
    recognition.lang = language === 'mr' ? 'mr-IN' : 'en-IN';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onstart = () => setListening(true);
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results).map((r: any) => r[0]?.transcript || '').join('');
      updateText(transcript, false);
    };
    recognition.onerror = (event: any) => {
      if (event?.error === 'aborted' && voiceSessionRef.current) return;
      if (voiceSessionRef.current) toast.error(language === 'mr' ? 'Voice समजला नाही. पुन्हा बोला.' : 'I could not understand the voice. Please try again.');
    };
    recognition.onend = () => {
      if (voiceSessionRef.current) {
        window.setTimeout(() => { try { recognition.start(); } catch {} }, 180);
        return;
      }
      setListening(false);
      const command = textRef.current.trim();
      if (command) parseCommand(command);
    };
    recognitionRef.current = recognition;
    try { recognition.start(); } catch { setListening(false); voiceSessionRef.current = false; }
  };

  const stopVoice = async () => {
    voiceSessionRef.current = false;
    if (Capacitor.isNativePlatform() && nativeSpeech) {
      try { await SpeechRecognition.stop(); } catch {}
      setListening(false);
      window.setTimeout(() => {
        const command = textRef.current.trim();
        if (command) parseCommand(command);
        nativeListenersRef.current.forEach((listener) => listener?.remove?.());
        nativeListenersRef.current = [];
      }, 450);
      return;
    }
    try { recognitionRef.current?.stop?.(); } catch {}
    setListening(false);
    window.setTimeout(() => {
      const command = textRef.current.trim();
      if (command) parseCommand(command);
    }, 150);
  };

  const parse = () => parseCommand(textRef.current || text);

  const save = () => {
    if (!draft) return;
    try {
      if ('invoice' in draft) {
        const invoice = { ...draft.invoice, items: [...draft.invoice.items] };
        const party = findPartyExactOrPartial(draft.customerName, 'Customer');
        if (party) {
          invoice.customerId = party.id;
          invoice.customerName = party.name;
          invoice.customerPhone = party.phone;
          invoice.customerAddress = party.address;
        } else if (draft.customerName !== 'Walk-in Customer') {
          // Do not silently create a customer from an ambiguous name.
          const created = makeParty(draft.customerName, 'Customer');
          addLedgerParty(created);
          invoice.customerId = created.id;
          invoice.customerName = created.name;
        }
        if (invoice.paymentMethod !== 'Cash' && invoice.paymentMethod !== 'Credit/Pending') {
          const paymentCommand = pendingCommand || invoice.description || '';
          if (hasExplicitBankReference(paymentCommand) || !invoice.paymentAccountId) {
            const resolution = resolveMoneyAccount(paymentCommand, bankAccounts, true);
            if (!resolution.ok) {
              setAnswer(bankResolutionMessage(resolution, language));
              return;
            }
            invoice.paymentAccountId = resolution.accountId;
          }
        }
        addInvoice(invoice);

        // Keep AI-created invoices consistent with the normal Sale flow: reduce matched stock,
        // create customer ledger entries for credit, and record received money in the selected account.
        for (const raw of invoice.items) {
          if (!raw.inventoryItemId) continue;
          const item = inventoryItems.find(i => i.id === raw.inventoryItemId);
          if (item) updateInventoryItem({ ...item, stock: Math.max(0, item.stock - Math.max(0, Number(raw.quantity) || 0)) });
        }
        if (invoice.customerId && Number(invoice.balanceDue || 0) > 0) {
          addLedgerEntry({ id: generateId('ledger'), partyId: invoice.customerId, type: 'Given', amount: Number(invoice.balanceDue || 0), description: `${invoice.invoiceNumber} — Receivable`, date: invoice.date, createdAt: new Date().toISOString() });
        }
        const received = Math.max(0, Number(invoice.total || 0) - Number(invoice.balanceDue || 0));
        if (invoice.customerId && received > 0) {
          addLedgerEntry({ id: generateId('ledger'), partyId: invoice.customerId, type: 'Received', amount: received, description: `${invoice.invoiceNumber} — Payment Received`, date: invoice.date, createdAt: new Date().toISOString() });
        }
        if (received > 0) {
          const sourceAccountId = invoice.paymentMethod === 'Cash' ? GALLA_ID : invoice.paymentAccountId;
          if (sourceAccountId) {
            addTransaction({ id: generateId('txn'), type: 'Income', amount: received, category: 'Business Revenue', description: `Invoice ${invoice.invoiceNumber} — ${invoice.customerName}`, date: invoice.date, tag: 'Shop / Business', sourceAccountId, destAccountId: null, isFromGalla: sourceAccountId === 'galla', createdAt: new Date().toISOString() });
          }
        }
        setSavedInvoice(invoice);
        setDraft(null);
        setPendingCommand('');
        setAnswer(language === 'mr' ? `बिल ${invoice.invoiceNumber} तयार करून सेव्ह केले. ${invoice.paymentMethod === 'UPI' ? 'UPI payment नोंदवले आहे.' : ''}` : `Invoice ${invoice.invoiceNumber} was created and saved.`);
        toast.success(language === 'mr' ? 'Invoice save झाला.' : 'Invoice saved successfully.');
        return;
      }
      const transaction = { ...draft, id: generateId('txn'), createdAt: new Date().toISOString() };
      const ok = addTransaction(transaction);
      if (!ok) throw new Error('Transaction was not accepted');

      // Natural Marathi receipt command support: update the customer ledger too.
      if (transaction.type === 'Income' && /(?:जमा|दिले|दिला|दिली|भरले|भरला|भरली|payment received|received)/i.test(transaction.description)) {
        const partyName = extractCustomerName(transaction.description);
        if (partyName) {
          const party = findPartyExactOrPartial(partyName, 'Customer');
          if (party) {
            addLedgerEntry({
              id: generateId('ledger'),
              partyId: party.id,
              type: 'Received',
              amount: Number(transaction.amount),
              description: `AI Payment Received — ${party.name}`,
              date: transaction.date,
              createdAt: new Date().toISOString(),
            });
          }
        }
      }

      toast.success(language === 'mr' ? 'Entry यशस्वीपणे save झाली.' : 'Entry saved successfully.');
      setDraft(null); setPendingCommand(''); setAnswer(null); textRef.current = ''; setText('');
    } catch {
      toast.error(language === 'mr' ? 'Entry save झाली नाही. कृपया पुन्हा प्रयत्न करा.' : 'Entry could not be saved. Please try again.');
    }
  };

  const shareInvoice = async (invoice: AssistantInvoiceDraft['invoice']) => {
    const msg = `${invoice.invoiceNumber}\nCustomer: ${invoice.customerName}\nTotal: ${money(invoice.total)}\nItem: ${invoice.items[0]?.product.name || ''}`;
    try {
      if (navigator.share) await navigator.share({ title: invoice.invoiceNumber, text: msg });
      else await navigator.clipboard.writeText(msg);
      toast.success(language === 'mr' ? 'Invoice share करण्यासाठी तयार आहे.' : 'Invoice details ready to share.');
    } catch {}
  };

  const printInvoice = (invoice: AssistantInvoiceDraft['invoice']) => {
    const item = invoice.items[0];
    const w = window.open('', '_blank', 'width=800,height=900');
    if (!w) { toast.error('Print window उघडता आली नाही.'); return; }
    const printHtml = `<html><head><title>${invoice.invoiceNumber}</title><style>body{font-family:Arial;padding:32px;color:#111}h1{margin-bottom:4px}.row{display:flex;justify-content:space-between;border-bottom:1px solid #ddd;padding:10px 0}.total{font-size:20px;font-weight:700}</style></head><body><h1>SALE INVOICE</h1><div>Invoice No: ${invoice.invoiceNumber}</div><div>Date: ${invoice.date}</div><div class="row"><span>Customer</span><b>${invoice.customerName}</b></div><div class="row"><span>${item?.product.name || 'Item'} × ${item?.quantity || 1}</span><b>${money(invoice.total)}</b></div><div class="row total"><span>Total</span><span>${money(invoice.total)}</span></div></body></html>`;
    w.document.open();
    w.document.close();
    w.document.documentElement.innerHTML = printHtml;

    w.document.close(); w.focus(); w.print();
  };

  const editInvoice = (invoice: AssistantInvoiceDraft['invoice']) => {
    window.location.href = `/invoice?edit=${encodeURIComponent(invoice.id)}`;
  };

  const firstName = (businessProfile.ownerName || 'User').trim().split(/\s+/)[0] || 'User';
  const recentCommand = history[0];
  const quickCommands = [
    { title: language === 'mr' ? 'विक्री नोंदवा' : 'Record Sale', sub: language === 'mr' ? 'नवीन विक्री / व्यवहार' : 'Add a new sale / transaction', icon: ShoppingCart, tone: 'emerald', command: language === 'mr' ? 'आजची विक्री नोंदवा' : 'Record today sale' },
    { title: language === 'mr' ? 'इनव्हॉइस तयार करा' : 'Create Invoice', sub: language === 'mr' ? 'प्रोफेशनल बिल तयार करा' : 'Generate a professional invoice', icon: FileText, tone: 'violet', command: language === 'mr' ? 'नवीन invoice तयार करा' : 'Create a new invoice' },
    { title: language === 'mr' ? 'खर्च जोडा' : 'Add Expense', sub: language === 'mr' ? 'व्यवसायाचा खर्च नोंदवा' : 'Track a business expense', icon: WalletCards, tone: 'amber', command: language === 'mr' ? 'आजचा खर्च नोंदवा' : 'Add today expense' },
    { title: language === 'mr' ? 'रिपोर्ट पहा' : 'View Reports', sub: language === 'mr' ? 'विक्री, नफा आणि रिपोर्ट' : 'Check sales, profit & more', icon: BarChart3, tone: 'blue', command: language === 'mr' ? 'आजचा Day Book दाखवा' : 'Show today report' },
  ] as const;

  const runQuickCommand = (command: string) => {
    updateText(command);
    window.setTimeout(() => void parseCommand(command), 0);
  };

  const responseVisible = Boolean(lastCommand || answer || draft || processing);

  return (
    <div className="vy-ai-page min-h-[100dvh] text-slate-100">
      <div className="vy-ai-shell mx-auto flex min-h-[100dvh] w-full max-w-2xl flex-col">

        {/* =====================================================
            HEADER
        ====================================================== */}
        <header className="vy-ai-header sticky top-0 z-30 border-b backdrop-blur">
          <div className="flex h-[68px] items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => window.history.length > 1 ? window.history.back() : (window.location.href = '/')}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 lg:hidden"
                aria-label="Back"
              >
                <ArrowLeft size={19} />
              </button>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-sm">
                <span className="text-xl font-black text-white">V</span>
              </div>

              <div>
                <h1 className="text-[17px] font-bold">VyaparOS</h1>
                <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  AI Assistant
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-2 text-xs text-gray-600 sm:flex">
                <Clock3 size={14} />
                {new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date())}
              </div>

              <button
                type="button"
                onClick={() => setShowTeach(true)}
                className="flex h-10 items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-2.5 text-xs font-semibold text-indigo-700 shadow-sm"
                title={language === 'mr' ? 'Local AI ला शिकवा' : 'Teach Local AI'}
              >
                <BookOpen size={16} />
                <span className="hidden sm:inline">{language === 'mr' ? 'Local AI ला शिकवा' : 'Teach AI'}</span>
              </button>

              <button
                type="button"
                onClick={() => setLanguage(language === 'mr' ? 'en' : 'mr')}
                className="flex h-10 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-2.5 text-xs sm:px-3 sm:text-sm shadow-sm"
              >
                <Languages size={17} />
                {language === 'mr' ? 'मराठी' : 'English'}
                <ChevronDown size={14} />
              </button>
            </div>
          </div>

        </header>

        {/* =====================================================
            CHAT MODE — ANSWERS ABOVE COMMAND BAR
        ====================================================== */}
        <main className="h-[calc(100dvh-68px)] min-h-0 px-3 pb-28 pt-3">
          <div ref={chatScrollRef} className="vy-ai-chat h-full min-h-0 overflow-y-auto overscroll-contain rounded-2xl border px-4 pb-3 pt-5 shadow-sm scroll-smooth">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <Sparkles size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold">VyaparOS AI</p>
              <p className="text-xs text-gray-500">{language === 'mr' ? 'तुमची business assistant' : 'Your business assistant'}</p>
            </div>
          </div>

          <div className="space-y-4">
            {chatMessages.map((message) => {
              const userMessage = message.role === 'user';
              return (
                <div key={message.id} className={`flex items-end gap-2 ${userMessage ? 'justify-end' : 'justify-start'}`}>
                  {!userMessage && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-blue-600 shadow-sm">
                      <Bot size={15} />
                    </div>
                  )}
                  <div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-6 ${userMessage ? 'rounded-br-md bg-blue-600 text-white' : 'rounded-bl-md border border-gray-200 bg-white text-gray-800 shadow-sm'}`}>
                    <div className={`mb-1 text-[10px] font-semibold ${userMessage ? 'text-blue-100' : 'text-blue-600'}`}>
                      {userMessage ? (language === 'mr' ? 'तुम्ही' : 'You') : 'VyaparOS AI'}
                    </div>
                    <div className="whitespace-pre-line">{message.text}</div>
                  </div>
                  {userMessage && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200 text-gray-600">
                      <UserCircle size={15} />
                    </div>
                  )}
                </div>
              );
            })}

            {processing && (
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-blue-600 shadow-sm">
                  <Bot size={15} />
                </div>
                <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-gray-200 bg-white px-4 py-3 shadow-sm">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-500" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-500 [animation-delay:120ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-500 [animation-delay:240ms]" />
                </div>
              </div>
            )}
          </div>

          {draft && (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Check className="h-5 w-5 text-emerald-600" />
                {language === 'mr' ? 'मी हे समजलो:' : 'I understood:'}
              </div>
              {'kind' in draft && draft.kind === 'invoice' ? (
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl bg-gray-50 p-3"><span className="text-gray-500">Customer</span><div className="mt-1 font-semibold text-gray-900">{draft.customerName}</div></div>
                  <div className="rounded-xl bg-gray-50 p-3"><span className="text-gray-500">Total</span><div className="mt-1 font-semibold text-gray-900">{money(draft.invoice.total)}</div></div>
                </div>
              ) : (
                <div className="mt-3 space-y-2 rounded-xl bg-gray-50 p-3 text-sm">
                  <div className="flex justify-between gap-3"><span className="text-gray-500">Type</span><b>{draft.type}</b></div>
                  <div className="flex justify-between gap-3"><span className="text-gray-500">Amount</span><b>{money(draft.amount)}</b></div>
                  <div className="flex justify-between gap-3"><span className="text-gray-500">Account</span><b className="text-right">{getAccountLabel(draft.sourceAccountId)}</b></div>
                  <div className="pt-1"><span className="text-gray-500">Description</span><div className="mt-1 font-medium">{draft.description}</div></div>
                </div>
              )}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => setDraft(null)} className="border-gray-200 bg-white text-gray-700">Cancel</Button>
                <Button onClick={save} className="bg-emerald-600 text-white hover:bg-emerald-700"><Check className="mr-1 h-4 w-4" />{language === 'mr' ? 'सेव्ह करा' : 'Save Entry'}</Button>
              </div>
            </div>
          )}

          <div ref={chatEndRef} className="h-2 w-full shrink-0" aria-hidden="true" />
          </div>
        </main>

        {/* =====================================================
            FIXED COMMAND BAR
        ====================================================== */}
        <div className="fixed bottom-0 left-0 right-0 z-40">
          <div className="vy-ai-composer-wrap mx-auto max-w-2xl border-t px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-3 backdrop-blur">
            <div className="vy-ai-composer flex items-center gap-2 rounded-2xl border p-1.5">
              <button
                type="button"
                onClick={() => { if (listening) { void stopVoice(); } else { void startVoice(); } }}
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-gray-600 shadow-sm ${listening ? 'text-blue-600 ring-2 ring-blue-100' : ''}`}
                aria-label="Voice input"
              >
                {listening ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
              <input
                value={text}
                onChange={(e) => updateText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); parse(); } }}
                placeholder={language === 'mr' ? 'तुमची command लिहा...' : 'Type your command...'}
                className="vy-ai-input min-w-0 flex-1 bg-transparent px-1 text-sm outline-none"
              />
              <button
                type="button"
                onClick={parse}
                disabled={!text.trim() || processing}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white transition hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400"
                aria-label="Send"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* =====================================================
            LOCAL AI TEACH MODAL
        ====================================================== */}
        {showTeach && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/65 p-0 backdrop-blur-sm sm:items-center sm:p-4">
            <div className="vy-ai-teach-modal w-full max-w-lg rounded-t-3xl p-5 shadow-2xl sm:rounded-3xl">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><BookOpen size={21} /></div>
                  <div>
                    <h2 className="font-bold">{language === 'mr' ? 'Local AI ला शिकवा' : 'Teach Local AI'}</h2>
                    <p className="text-xs text-gray-500">{language === 'mr' ? 'नवीन command कायमची सेव्ह करा' : 'Save a new command for future use'}</p>
                  </div>
                </div>
                <button type="button" onClick={() => setShowTeach(false)} className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500"><X size={18} /></button>
              </div>

              <label className="mb-2 block text-sm font-medium text-gray-700">{language === 'mr' ? 'नवीन command' : 'New command'}</label>
              <input
                value={teachPhrase}
                onChange={(e) => setTeachPhrase(e.target.value)}
                placeholder="उदा. माझा उधारी हिशोब"
                className="mb-4 h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10"
              />

              <label className="mb-2 block text-sm font-medium text-gray-700">{language === 'mr' ? 'या command चा अर्थ / काय करायचे?' : 'What should this command do?'}</label>
              <textarea
                value={teachMeaning}
                onChange={(e) => setTeachMeaning(e.target.value)}
                rows={4}
                placeholder="उदा. अमोलचे pending bill दाखवा"
                className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10"
              />

              <div className="mt-3 rounded-xl bg-blue-50 p-3 text-xs leading-5 text-blue-700">
                <strong>उदाहरण:</strong><br />“माझा उधारी हिशोब”<br />म्हणजे “अमोलचे pending bill दाखवा”
              </div>

              <div className="mt-5 flex gap-2">
                <Button disabled={teaching || !teachPhrase.trim() || !teachMeaning.trim()} onClick={() => void learnCommand(teachPhrase, teachMeaning)} className="h-12 flex-1 bg-indigo-600 text-white hover:bg-indigo-700">
                  <BookOpen className="mr-2 h-4 w-4" />{teaching ? 'शिकत आहे…' : 'Memory मध्ये सेव्ह करा'}
                </Button>
                <Button variant="outline" onClick={() => setShowTeach(false)} className="h-12 border-gray-200">रद्द</Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
