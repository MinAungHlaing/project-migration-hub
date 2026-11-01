import { useCatalogLanguage } from "@/lib/catalog-language";

export function LanguagePicker({ variant = "light" }: { variant?: "light" | "hero" }) {
  const { language, changeLanguage, t } = useCatalogLanguage();
  const hero = variant === "hero";

  return (
    <>
      <label className="sr-only" htmlFor="catalog-language">{t("language.label")}</label>
      <select
        id="catalog-language"
        value={language}
        onChange={(event) => changeLanguage(event.target.value === "my" ? "my" : "en")}
        aria-label={language === "my" ? "ဘာသာစကား" : "Language"}
        className={`min-h-10 max-w-32 rounded-lg border px-2 text-xs font-medium sm:text-sm ${
          hero ? "border-primary-foreground/30 bg-transparent text-current" : "bg-background"
        }`}
      >
        <option value="en">English</option>
        <option value="my">မြန်မာ</option>
      </select>
    </>
  );
}
