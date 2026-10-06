/**
 * VyaparOS AI Assistant - Central App Vocabulary Dictionary
 *
 * One dictionary is shared by parser + command UI.  Keep Marathi, English,
 * Hinglish and common speech-to-text mistakes here instead of scattering
 * language-specific checks through the assistant.
 */

export type AppVocabularyGroup = {
  token: string;
  aliases: string[];
};

export const APP_VOCABULARY: AppVocabularyGroup[] = [
  { token: 'customer', aliases: ['customer','customers','cust','custmer','cstmr','client','clients','party','parties','कस्टमर','कस्टमर्स','ग्राहक','ग्राहकाचा','ग्राहकाचे','ग्राहकाची','ग्राहकांना','ग्राहकाला','ग्राहकाचे','गिऱ्हाईक','गिऱ्हाईकाचा','पार्टी','पार्टीचा'] },
  { token: 'supplier', aliases: ['supplier','suppliers','suplier','suplyer','vendor','vendors','वेंडर','वेंडर्स','विक्रेता','विक्रेते','पुरवठादार','सप्लायर','सप्लायर्स','सप्लायरचा','पार्टी सप्लायर'] },
  { token: 'pending', aliases: ['pending','pendings','pendig','pendin','pendding','panding','pendng','पेंडिंग','पेंडिग','पेंडीन','पेंडिंगचे','बाकी','बाकीचे','बाकीची','बाकीचा','बाकीपणा','उधारी','उधारीचे','उधारीची','उधारीचा','देणे','देय','थकबाकी','थकलेले','due','dues','outstanding','unpaid','unpaid bills','remaining','balance due','balance pending'] },
  { token: 'bill', aliases: ['bill','bills','bil','beel','bel','invoice','invoices','invois','invoce','invioce','इनव्हॉइस','इनवॉइस','इन्व्हॉइस','बिल','बील','बिले','बीलं','चलन','पावती'] },
  { token: 'show', aliases: ['show','display','view','list','see','find','दाखवा','दाखव','दाखवणे','दाखवून','दाखव मला','पहा','पाहू','पाहिजे','बघा','बघ','सांगा','सांग','द्या','द्या मला','दाखवा ना','दिसवा'] },
  { token: 'search', aliases: ['search','find','look for','lookup','look up','शोध','शोधा','शोधून','सर्च','फाइंड','फाइंड करा','शोधा ना'] },
  { token: 'add', aliases: ['add','create','new','make','जोड','जोडा','जोडणे','अॅड','अ‍ॅड','नवीन','तयार','बनव','बनवा','बनवणे','नोंदवा','नोंद कर','समाविष्ट','घाला','टाका'] },
  { token: 'save', aliases: ['save','saved','record','नोंद','सेव्ह','सेव','जतन','साठव','साठवा','नोंदवा','नोंदणी'] },
  { token: 'edit', aliases: ['edit','update','change','modify','बदल','बदला','सुधार','दुरुस्त','एडिट','अपडेट','बदलून'] },
  { token: 'delete', aliases: ['delete','remove','erase','del','डिलीट','डिलिट','हटवा','काढा','काढून टाका','मिटवा','पुसा'] },
  { token: 'inventory', aliases: ['inventory','inventry','inventori','stock','stocks','stok','stak','stokk','item','items','itm','product','products','इन्व्हेंटरी','इनव्हेंटरी','स्टॉक','साठा','आयटम','आयटम्स','वस्तू','माल','मालाचा','सामान'] },
  { token: 'bank', aliases: ['bank','banks','banking','बँक','बँका','बँकिंग','बॅंक','बॅंकिंग'] },
  { token: 'account', aliases: ['account','accounts','acount','a/c','ac','खाते','खातं','अकाउंट','अकाउंट्स','खात्याचे','खात्यात'] },
  { token: 'cash', aliases: ['cash','cashinhand','cash inhand','cash in hand','cash-hand','रोख','कॅश','कॅश इन हँड','कॅश इन हॅन्ड','हातातील रोख','हातातले पैसे','हातातील पैसे','घरची रोख','घरचा कॅश'] },
  { token: 'galla', aliases: ['galla','gala','galla cash','गल्ला','गल्ल्यात','गल्ल्याचा','गल्ल्यातील','दुकानचा गल्ला','दुकानातील रोख','कॅशबॉक्स','cash box'] },
  { token: 'transaction', aliases: ['transaction','transactions','transction','transection','transctions','tranaction','txn','entry','entries','व्यवहार','ट्रान्झॅक्शन','ट्रान्झॅक्शन्स','ट्रॅन्झॅक्शन','एंट्री','एन्ट्री','नोंद'] },
  { token: 'expense', aliases: ['expense','expenses','expen','expence','expences','spend','spent','spending','खर्च','खर्च झाला','खर्च झाले','खर्चाची','खर्चाचे','खर्चाचा','खर्च कर','खर्च करा'] },
  { token: 'savings', aliases: ['saving','savings','pigmy','rd','recurring deposit','fd','fixed deposit','बचत','सेव्हिंग','सेव्हिंग्स','पिग्मी','आरडी','ठेव','मुदत ठेव'] },
  { token: 'deposit', aliases: ['deposit','deposited','जमा','ठेव','भरले','deposit करा','डिपॉझिट','डिपॉझिट केले','जमा करा','जमा झाले'] },
  { token: 'credit', aliases: ['credit','credited','उधार','उधारी','क्रेडिट','क्रेडीट'] },
  { token: 'receipt', aliases: ['receipt','recepit','reciept','जमा पावती','पावती','रसीद','जमा पावती तयार','payment received'] },
  { token: 'balance', aliases: ['balance','balence','balnce','account balance','net worth','networth','worth','शिल्लक','शिल्लक किती','बॅलन्स','बॅलन्स किती','निव्वळ संपत्ती','नेट वर्थ'] },
  { token: 'income', aliases: ['income','incam','incom','earning','earnings','revenue','receipt','recepit','payment received','received payment','paise mile','पैसे मिळाले','पैसे आले','रुपये आले','रक्कम आली','उत्पन्न','जमा','मिळकत','आवक','कमाई','जमा करा'] },
  { token: 'sale', aliases: ['sale','sales','selling','sell','sold','sel','विक्री','विकले','विकला','विकली','विक्रीची','व्यापार','व्यवसाय','विकला आहे','विकले आहे'] },
  { token: 'purchase', aliases: ['purchase','purchases','purchse','purchas','buy','bought','खरेदी','खरेदीचा','खरेदीचे','खरेदीची','विकत घेतले','विकत घेतला','विकत घेतली','घेतले','घेतला','घेतली'] },
  { token: 'payment', aliases: ['payment','pay','paid','paymant','paymet','receive','received','collection','collect','भरणा','पेमेंट','पेमेन्ट','जमा केले','भरले','दिले','दिली','मिळाले','वसुली','पैसे दिले','पैसे घेतले'] },
  { token: 'transfer', aliases: ['transfer','transfar','transfr','move','shift','हस्तांतरण','हस्तांतर','ट्रान्सफर','हलवा','हलवले','टाका','टाकले','पाठवा','पाठवले'] },
  { token: 'report', aliases: ['report','reports','raport','reprot','अहवाल','रिपोर्ट','रिपोर्ट्स','हिशोब'] },
  { token: 'profit', aliases: ['profit','profitt','नफा','फायदा','नफ्यात'] },
  { token: 'loss', aliases: ['loss','loass','los','तोटा','नुकसान'] },
  { token: 'today', aliases: ['today','to day','आज','आजचा','आजची','आजचे','आजच्या'] },
  { token: 'yesterday', aliases: ['yesterday','yester day','काल','कालचा','कालची','कालचे','कालच्या'] },
  { token: 'week', aliases: ['week','weekly','last week','previous week','आठवडा','आठवड्यात','आठवड्याचा','आठवड्याची','मागील आठवडा','मागचा आठवडा','गेल्या आठवड्यात','मागच्या आठवड्यात'] },
  { token: 'month', aliases: ['month','monthly','this month','current month','महिना','महिन्यात','महिन्याचा','महिन्याची','या महिन्यात','या महिन्याचा'] },
  { token: 'phone', aliases: ['phone','fone','mobile','mobail','moblie','mobl','number','no','contact','फोन','फोन्','मोबाइल','मोबाईल','मोबाईल नंबर','नंबर','क्रमांक','संपर्क'] },
  { token: 'whatsapp', aliases: ['whatsapp','whats app','watsapp','whatsap','व्हॉट्सअॅप','व्हाट्सअॅप','व्हॉट्सअप','व्हॉट्सॲप','वॉट्सअॅप'] },
  { token: 'settings', aliases: ['settings','setting','seting','सेटिंग','सेटिंग्स','सेटिंगमध्ये'] },
  { token: 'dark mode', aliases: ['dark mode','darkmode','dark-mode','darkmod','डार्क मोड','डार्कमोड'] },
  { token: 'app lock', aliases: ['app lock','application lock','applock','app-lock','ap lock','अॅप लॉक','अ‍ॅप लॉक','अॅपलॉक'] },
  { token: 'language', aliases: ['language','langauge','languege','भाषा','लँग्वेज','भाषेची'] },
  { token: 'pos', aliases: ['pos','p o s','point of sale','पीओएस','पॉस'] },
  { token: 'ledger', aliases: ['ledger','ledgar','ledjer','party ledger','लेजर','लेजरचा','खातेवही','उधारी खाते','पार्टी खाते'] },
  { token: 'due', aliases: ['due','dues','outstanding','unpaid','बाकी','बाकीचे','बाकीची','उधारी','थकबाकी','देय'] },
  { token: 'help', aliases: ['help','मदत','सहाय्य','काय करू शकतो','काय काय करू शकतो','मदत करा'] },
  { token: 'open', aliases: ['open','go to','goto','navigate','open page','open screen','उघड','उघडा','उघडणे','ओपन','ओपन कर','ओपन करा','जा','जाऊ','जा पेजवर','पेज उघडा','पेज ओपन','पेज ओपन कर','पेज ओपन करा','स्क्रीन उघडा','स्क्रीन ओपन','स्क्रीन ओपन कर','दाखव पेज','पेज दाखवा','पान उघडा','पान ओपन','पान ओपन कर'] },
  { token: 'page', aliases: ['page','pages','screen','screens','पेज','पान','स्क्रीन','स्क्रीनवर','पेजवर'] },
  { token: 'home', aliases: ['home','homepage','home page','dashboard','main page','मुख्य पान','मुख्य पेज','होम','होम पेज','डॅशबोर्ड','डॅशबोर्ड पेज'] },
  { token: 'transactions page', aliases: ['transactions page','transaction page','व्यवहार पेज','व्यवहाराचे पेज','व्यवहाराचं पेज','व्यवहार स्क्रीन','व्यवहाराचे स्क्रीन','ट्रान्झॅक्शन पेज','ट्रान्झॅक्शन स्क्रीन'] },
  { token: 'banking page', aliases: ['banking page','bank page','bank account page','बँक पेज','बँकिंग पेज','बँकेचे पेज','बँक स्क्रीन','बँकिंग स्क्रीन'] },
  { token: 'inventory page', aliases: ['inventory page','stock page','item page','इन्व्हेंटरी पेज','स्टॉक पेज','आयटम पेज','मालाचे पेज','माल पेज'] },
  { token: 'cash page', aliases: ['cash page','galla page','cash in hand page','कॅश पेज','गल्ला पेज','गल्ल्याचे पेज','कॅश स्क्रीन'] },
  { token: 'ledger page', aliases: ['ledger page','party page','udhari page','लेजर पेज','पार्टी पेज','उधारी पेज','खातेवही पेज'] },
  { token: 'reports page', aliases: ['reports page','report page','अहवाल पेज','रिपोर्ट पेज','रिपोर्ट्स पेज','रिपोर्ट स्क्रीन'] },
  { token: 'settings page', aliases: ['settings page','setting page','सेटिंग पेज','सेटिंग्स पेज','सेटिंग स्क्रीन'] },
  { token: 'pos page', aliases: ['pos page','point of sale page','पीओएस पेज','पॉस पेज','पीओएस स्क्रीन'] },
  { token: 'invoice page', aliases: ['invoice page','bill page','sale page','इनव्हॉइस पेज','बिल पेज','सेल पेज','विक्री पेज'] },
  { token: 'sales history page', aliases: ['sales history page','sale history page','विक्री इतिहास पेज','सेल्स हिस्ट्री पेज','बिल हिस्ट्री पेज'] },
  { token: 'menu page', aliases: ['menu page','menu','मेनू पेज','मेनू'] },
  { token: 'cancel', aliases: ['cancel','stop','close','रद्द','रद्द करा','बंद करा','थांबवा'] },
];

const DEV_DIGITS = '०१२३४५६७८९';

const normalizeBase = (value: string) => value
  .toLowerCase()
  .replace(/[०-९]/g, d => String(DEV_DIGITS.indexOf(d)))
  .replace(/[’']/g, '')
  .replace(/[?？!।,，;；:：(){}\[\]"“”‘’]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const latinWord = /^[a-z0-9]+$/i;

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const old = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = old;
    }
  }
  return row[b.length];
}

function matchesAlias(base: string, alias: string): boolean {
  const a = normalizeBase(alias);
  if (!a) return false;
  if (base.includes(a)) return true;
  if (!latinWord.test(a) || a.length < 4) return false;
  const words = base.split(' ');
  const maxDistance = a.length >= 5 ? 1 : 0;
  return words.some(word => {
    if (word.length < 4 || Math.abs(word.length - a.length) > maxDistance) return false;
    // Avoid semantic collisions such as pending -> spending (one inserted 's').
    if (word.endsWith('ing') && a.endsWith('ing')) return false;
    return levenshtein(word, a) <= maxDistance;
  });
}

/** Normalize user/voice text while preserving the original text at the front. */
export function normalizeAppVocabulary(value: string): string {
  const base = normalizeBase(value);
  const canonical: string[] = [base];
  // Longer aliases first reduces collisions such as "bill page" -> bill + page.
  const groups = [...APP_VOCABULARY].sort((a, b) => Math.max(...b.aliases.map(x => x.length)) - Math.max(...a.aliases.map(x => x.length)));
  for (const group of groups) {
    if (group.aliases.some(alias => matchesAlias(base, alias))) canonical.push(group.token);
  }
  return canonical.join(' ');
}

export function hasAppVocabulary(value: string, ...tokens: string[]): boolean {
  const normalized = normalizeAppVocabulary(value);
  return tokens.some(token => normalized.includes(token.toLowerCase()));
}

export function vocabularyAliases(token: string): string[] {
  return APP_VOCABULARY.find(group => group.token === token)?.aliases ?? [];
}
