import { useCallback, useEffect, useState } from "react";

export type CatalogLanguage = "en" | "my";

const STORAGE_KEY = "gtm-catalog-language";
const CHANGE_EVENT = "gtm-catalog-language-change";

const translations: Record<string, readonly [string, string]> = {
  "language.english": ["English", "အင်္ဂလိပ်"],
  "language.burmese": ["မြန်မာ", "မြန်မာ"],
  "language.label": ["Language", "ဘာသာစကား"],
  "nav.catalog": ["Catalog", "ကုန်ပစ္စည်းစာရင်း"],
  "nav.gallery": ["Browse categories", "အမျိုးအစားများ"],
  "nav.rep": ["Field sales", "အရောင်းကိုယ်စားလှယ်"],
  "nav.admin": ["Admin", "စီမံခန့်ခွဲမှု"],
  "catalog.eyebrow": ["GTM product catalog", "GTM ကုန်ပစ္စည်းစာရင်း"],
  "catalog.title": ["Find what you need.", "လိုအပ်တာကို ရှာဖွေပါ။"],
  "catalog.subtitle": ["Browse products, check availability, and build an order.", "ကုန်ပစ္စည်းများကို ကြည့်ရှုပြီး၊ လက်ကျန်စစ်ဆေးကာ အော်ဒါမှာယူပါ။"],
  "catalog.products": ["products", "မျိုး"],
  "catalog.search": ["Search by product name, item ID, category, or barcode", "အမည်၊ ကုန်ပစ္စည်း ID၊ အမျိုးအစား သို့မဟုတ် ဘားကုဒ်ဖြင့် ရှာပါ"],
  "catalog.categories": ["Categories", "အမျိုးအစားများ"],
  "catalog.all": ["All products", "ကုန်ပစ္စည်းအားလုံး"],
  "catalog.inStock": ["In stock", "လက်ကျန်ရှိ"],
  "catalog.outOfStock": ["Out of stock", "လက်ကျန်မရှိ"],
  "catalog.allAvailability": ["Any availability", "လက်ကျန်အားလုံး"],
  "catalog.sort": ["Sort products", "စီစဉ်ရန်"],
  "catalog.recent": ["Recently updated", "အသစ်ပြင်ဆင်ထားသည်"],
  "catalog.default": ["Recommended", "အကြံပြုထားသည်"],
  "catalog.priceLow": ["Price: low to high", "ဈေးနှုန်း: အနည်းမှအများ"],
  "catalog.priceHigh": ["Price: high to low", "ဈေးနှုန်း: အများမှအနည်း"],
  "catalog.nameSort": ["Name: A to Z", "အမည်: က မှ အ"],
  "catalog.showing": ["Showing", "ပြသထားသည်"],
  "catalog.of": ["of", "ခုအနက်"],
  "catalog.clearFilters": ["Clear filters", "စစ်ထုတ်မှုများ ဖယ်ရှားရန်"],
  "catalog.showMore": ["Show more products", "နောက်ထပ်ကုန်ပစ္စည်းများ"],
  "catalog.productNotFound": ["Product not found", "ကုန်ပစ္စည်းမတွေ့ပါ"],
  "catalog.noProductMatch": ["No product matches this item ID. It may have been removed.", "ဤကုန်ပစ္စည်း ID နှင့် ကိုက်ညီသောပစ္စည်းမရှိပါ။ ဖယ်ရှားထားနိုင်သည်။"],
  "catalog.noResults": ["No products found. Try a different search or clear your filters.", "ကုန်ပစ္စည်းမတွေ့ပါ။ ရှာဖွေမှုကို ပြောင်းပါ သို့မဟုတ် စစ်ထုတ်မှုများကို ဖယ်ရှားပါ။"],
  "catalog.galleryTitle": ["Browse by category", "အမျိုးအစားအလိုက် ကြည့်ရန်"],
  "catalog.galleryIntro": ["Choose a category to explore its products.", "ကုန်ပစ္စည်းများကြည့်ရန် အမျိုးအစားတစ်ခုကို ရွေးပါ။"],
  "catalog.gallery": ["Gallery", "ဓာတ်ပုံစာရင်း"],
  "catalog.viewCategory": ["View category", "အမျိုးအစားကြည့်ရန်"],
  "catalog.backToCatalog": ["Back to catalog", "ကုန်ပစ္စည်းစာရင်းသို့ ပြန်ရန်"],
  "catalog.backToGallery": ["Back to categories", "အမျိုးအစားများသို့ ပြန်ရန်"],
  "catalog.unit": ["Unit", "ယူနစ်"],
  "catalog.retail": ["Retail price", "လက်လီဈေး"],
  "catalog.wholesale": ["Wholesale price", "လက်ကားဈေး"],
  "catalog.recentPrices": ["Recent price changes", "မကြာသေးမီက ဈေးနှုန်းပြောင်းလဲမှုများ"],
  "catalog.priceUpdated": ["Price updated", "ဈေးနှုန်းပြင်ဆင်ပြီး"],
  "catalog.added": ["Added", "အသစ်ထည့်ပြီး"],
  "catalog.replaced": ["Replaced", "အစားထိုးပြီး"],
  "catalog.updates": ["Updates", "အသိပေးချက်များ"],
  "catalog.latestUpdates": ["Latest catalog updates", "နောက်ဆုံးပြင်ဆင်မှုများ"],
  "catalog.noUpdates": ["No updates yet.", "အသိပေးချက်မရှိသေးပါ။"],
  "catalog.updatesUnavailable": ["Updates are temporarily unavailable.", "အသိပေးချက်များကို ယာယီကြည့်မရပါ။"],
  "catalog.update": ["Update", "ပြင်ဆင်မှု"],
  "catalog.add": ["Add", "ထည့်ရန်"],
  "catalog.removeOne": ["Remove one", "တစ်ခုလျှော့ရန်"],
  "catalog.addOne": ["Add one", "တစ်ခုတိုးရန်"],
  "order.open": ["Your order", "သင့်အော်ဒါ"],
  "order.empty": ["Add products from the catalog to start an order.", "အော်ဒါစတင်ရန် ကုန်ပစ္စည်းများကို ရွေးထည့်ပါ။"],
  "order.salesRep": ["Sales representative", "အရောင်းကိုယ်စားလှယ်"],
  "order.chooseRep": ["Choose a sales representative", "အရောင်းကိုယ်စားလှယ်ရွေးပါ"],
  "order.outlet": ["Store or outlet name", "ဆိုင်အမည်"],
  "order.outletPlaceholder": ["Enter the store name", "ဆိုင်အမည်ထည့်ပါ"],
  "order.total": ["Order total", "အော်ဒါစုစုပေါင်း"],
  "order.submit": ["Submit order", "အော်ဒါတင်ရန်"],
  "order.sending": ["Sending…", "ပို့နေသည်…"],
  "order.selectRep": ["Please select a sales representative.", "အရောင်းကိုယ်စားလှယ်ကို ရွေးပါ။"],
  "order.outletRequired": ["Store name is required.", "ဆိုင်အမည်ဖြည့်ရန် လိုအပ်သည်။"],
  "order.sent": ["Order submitted", "အော်ဒါတင်ပြီးပါပြီ"],
  "order.confirmation": ["The office can see your order now.", "ရုံးချုပ်မှ သင့်အော်ဒါကို လက်ခံရရှိပါပြီ။"],
  "order.back": ["Continue browsing", "ဆက်လက်ကြည့်ရှုရန်"],
  "order.wholesaleTotal": ["Wholesale total", "လက်ကားစုစုပေါင်း"],
  "order.demoMode": ["Local preview only — this order will not be sent or saved.", "ဤအော်ဒါသည် စမ်းသပ်ကြည့်ရှုရန်သာဖြစ်ပြီး ပို့မည် သို့မဟုတ် သိမ်းမည်မဟုတ်ပါ။"],
  "common.product": ["Product", "ကုန်ပစ္စည်း"],
  "rep.title": ["GTM field sales", "GTM ကွင်းဆင်းအရောင်း"],
  "rep.signIn": ["Sales rep sign in", "အရောင်းကိုယ်စားလှယ် ဝင်ရောက်ရန်"],
  "rep.signInHint": ["Sign in while online once. Your downloaded catalog and queued orders stay on this device.", "အင်တာနက်ရှိချိန် တစ်ကြိမ်ဝင်ပါ။ ဒေါင်းလုဒ်လုပ်ထားသော ကုန်ပစ္စည်းစာရင်းနှင့် အော်ဒါများကို ဤစက်တွင် သိမ်းထားမည်။"],
  "rep.username": ["Username", "အသုံးပြုသူအမည်"],
  "rep.password": ["Password", "စကားဝှက်"],
  "rep.signInDownload": ["Sign in and download catalog", "ဝင်ရောက်ပြီး ကုန်ပစ္စည်းစာရင်း ရယူရန်"],
  "rep.signingIn": ["Signing in…", "ဝင်ရောက်နေသည်…"],
  "rep.connectToSignIn": ["Connect to the internet to sign in for the first time.", "ပထမဆုံးဝင်ရောက်ရန် အင်တာနက်ချိတ်ဆက်ပါ။"],
  "rep.opening": ["Opening offline workspace…", "အော့ဖ်လိုင်းနေရာကို ဖွင့်နေသည်…"],
  "rep.catalogSaved": ["Signed in and catalog saved for offline use.", "ဝင်ရောက်ပြီးပါပြီ။ အော့ဖ်လိုင်းအသုံးပြုရန် ကုန်ပစ္စည်းစာရင်းကို သိမ်းထားသည်။"],
  "rep.refresh": ["Refresh catalog and sync", "ကုန်ပစ္စည်းစာရင်း ပြန်လည်ရယူပြီး ပို့ရန်"],
  "rep.signOut": ["Sign out", "ထွက်ရန်"],
  "rep.signedOut": ["Signed out. Queued orders remain saved on this device.", "ထွက်ပြီးပါပြီ။ စောင့်နေသောအော်ဒါများကို ဤစက်တွင် သိမ်းထားသည်။"],
  "rep.snapshot": ["Snapshot", "စာရင်းဗားရှင်း"],
  "rep.noCatalog": ["No catalog downloaded", "ကုန်ပစ္စည်းစာရင်း မရယူရသေးပါ"],
  "rep.online": ["Online", "အွန်လိုင်း"],
  "rep.offline": ["Offline", "အော့ဖ်လိုင်း"],
  "rep.newOrder": ["New order", "အော်ဒါအသစ်"],
  "rep.queue": ["Queue", "ပို့ရန်စောင့်နေသောအော်ဒါ"],
  "rep.outlet": ["Store or outlet", "ဆိုင်"],
  "rep.selectOutlet": ["Select a saved outlet…", "သိမ်းထားသောဆိုင်ကို ရွေးပါ…"],
  "rep.newOutlet": ["Or enter a new store name", "သို့မဟုတ် ဆိုင်အမည်အသစ်ထည့်ပါ"],
  "rep.searchProducts": ["Search products, IDs, categories…", "ကုန်ပစ္စည်း၊ ID၊ အမျိုးအစားဖြင့် ရှာပါ…"],
  "rep.removeOne": ["Remove one", "တစ်ခုလျှော့ရန်"],
  "rep.addOne": ["Add one", "တစ်ခုတိုးရန်"],
  "rep.signInRequired": ["Sign in and download the catalog before creating an order.", "အော်ဒါမတင်မီ ဝင်ရောက်ပြီး ကုန်ပစ္စည်းစာရင်းကို ရယူပါ။"],
  "rep.addProductFirst": ["Add at least one product to the order.", "အော်ဒါတွင် အနည်းဆုံးကုန်ပစ္စည်းတစ်ခု ထည့်ပါ။"],
  "rep.chooseOutlet": ["Choose a saved outlet or enter its name.", "သိမ်းထားသောဆိုင်ကို ရွေးပါ သို့မဟုတ် ဆိုင်အမည်ထည့်ပါ။"],
  "rep.retailTotal": ["Retail total", "လက်လီစုစုပေါင်း"],
  "rep.itemCount": ["items", "ခု"],
  "rep.saveOrder": ["Save order", "အော်ဒါသိမ်းရန်"],
  "rep.saving": ["Saving…", "သိမ်းနေသည်…"],
  "rep.savedSyncing": ["Order saved. Syncing with the office…", "အော်ဒါသိမ်းပြီးပါပြီ။ ရုံးသို့ ပို့နေသည်…"],
  "rep.savedOffline": ["Order saved on this device. It will sync when you're online.", "အော်ဒါကို ဤစက်တွင် သိမ်းပြီးပါပြီ။ အွန်လိုင်းပြန်ရောက်လျှင် ပို့မည်။"],
  "rep.connectionRestored": ["Connection restored. Syncing queued orders…", "အင်တာနက်ပြန်ရပါပြီ။ စောင့်နေသောအော်ဒါများကို ပို့နေသည်…"],
  "rep.catalogRefreshed": ["Catalog refreshed and queued orders checked.", "ကုန်ပစ္စည်းစာရင်းကို ပြန်ရယူပြီး စောင့်နေသောအော်ဒါများကို စစ်ဆေးပြီးပါပြီ။"],
  "rep.ordersOnDevice": ["Your orders on this device", "ဤစက်ရှိ သင့်အော်ဒါများ"],
  "rep.waitingToSync": ["waiting to sync", "ပို့ရန်စောင့်နေသည်"],
  "rep.syncNow": ["Sync now", "ယခုပို့ရန်"],
  "rep.serverOrder": ["Server order", "ဆာဗာအော်ဒါ"],
  "rep.noOrders": ["No orders have been created on this device.", "ဤစက်တွင် အော်ဒါမရှိသေးပါ။"],
  "rep.queueWarning": ["Orders marked “Needs attention” were rejected by the server. Review the error before taking another action; they are not reported as synced.", "စစ်ဆေးရန်လိုသည်ဟု ဖော်ပြထားသော အော်ဒါများကို ဆာဗာက လက်မခံပါ။ အမှားကိုစစ်ဆေးပါ။ ၎င်းတို့ကို ပို့ပြီးဟု မသတ်မှတ်ပါ။"],
  "rep.offlineNote": ["Offline orders stay on this device until the server confirms receipt.", "ဆာဗာမှ လက်ခံကြောင်းအတည်ပြုသည်အထိ အော့ဖ်လိုင်းအော်ဒါများကို ဤစက်တွင် သိမ်းထားမည်။"],
  "rep.catalogProductsCached": ["products cached.", "မျိုးကို စက်တွင် သိမ်းထားသည်။"],
  "rep.snapshotSaved": ["Catalog saved for offline use.", "အော့ဖ်လိုင်းအသုံးပြုရန် ကုန်ပစ္စည်းစာရင်း သိမ်းပြီးပါပြီ။"],
  "rep.someOrdersSynced": ["orders synced.", "ခု ပို့ပြီးပါပြီ။"],
  "rep.reviewOrders": ["Some orders need attention. Open the order queue to review the server response.", "အော်ဒါအချို့ကို စစ်ဆေးရန်လိုသည်။ ဆာဗာတုံ့ပြန်ချက်ကို ကြည့်ရန် အော်ဒါစာရင်းကို ဖွင့်ပါ။"],
  "rep.oldOrdersMissingRep": ["older orders on this device lack rep attribution. They are preserved but will not sync automatically.", "အော်ဒါဟောင်းများတွင် ကိုယ်စားလှယ်အချက်အလက်မရှိပါ။ သိမ်းထားသော်လည်း အလိုအလျောက်ပို့မည်မဟုတ်ပါ။"],
  "rep.priceMismatch": ["Catalog prices or availability changed since this order was created. The office should review it.", "အော်ဒါတင်ပြီးနောက် ဈေးနှုန်း သို့မဟုတ် လက်ကျန်ပြောင်းလဲသွားသည်။ ရုံးမှ ပြန်လည်စစ်ဆေးသင့်သည်။"],
  "rep.notFound": ["No products match your search.", "ရှာဖွေမှုနှင့် ကိုက်ညီသောကုန်ပစ္စည်းမရှိပါ။"],
  "rep.downloadCatalog": ["Download the catalog while online to start.", "စတင်အသုံးပြုရန် အွန်လိုင်းရှိချိန် ကုန်ပစ္စည်းစာရင်းကို ရယူပါ။"],
  "rep.orderSavedCount": ["order saved", "အော်ဒါ သိမ်းပြီးပါပြီ"],
  "rep.ordersSyncedCount": ["orders synced.", "အော်ဒါ ပို့ပြီးပါပြီ။"],
  "rep.queued": ["Queued", "ပို့ရန်စောင့်နေသည်"],
  "rep.syncing": ["Syncing…", "ပို့နေသည်…"],
  "rep.synced": ["Synced", "ပို့ပြီးပါပြီ"],
  "rep.needsAttention": ["Needs attention", "စစ်ဆေးရန်လိုသည်"],
};

export function translate(language: CatalogLanguage, key: string): string {
  const entry = translations[key];
  return entry ? entry[language === "my" ? 1 : 0] : key;
}

export function useCatalogLanguage() {
  const [language, setLanguage] = useState<CatalogLanguage>("en");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "my") setLanguage(stored);

    const update = (event: Event) => {
      const selected = (event as CustomEvent<CatalogLanguage>).detail;
      if (selected === "en" || selected === "my") setLanguage(selected);
    };
    window.addEventListener(CHANGE_EVENT, update);
    return () => window.removeEventListener(CHANGE_EVENT, update);
  }, []);

  const changeLanguage = useCallback((selected: CatalogLanguage) => {
    localStorage.setItem(STORAGE_KEY, selected);
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: selected }));
    setLanguage(selected);
  }, []);
  const t = useCallback((key: string) => translate(language, key), [language]);

  return { language, changeLanguage, t };
}
