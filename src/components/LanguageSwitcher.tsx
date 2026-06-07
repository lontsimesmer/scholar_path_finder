import { Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useLanguage, Language } from "@/i18n/language";

const LanguageSwitcher = () => {
  const { language, setLanguage } = useLanguage();
  const languages: { code: Language; name: string; flag: string }[] = [
    { code: "en", name: language === "fr" ? "Anglais" : "English", flag: "EN" },
    { code: "fr", name: language === "fr" ? "Francais" : "French", flag: "FR" },
  ];

  const currentLang = languages.find((item) => item.code === language);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 rounded-full border border-white/10 bg-white/55 px-3 text-foreground shadow-soft backdrop-blur-sm hover:bg-white/78"
        >
          <Globe size={18} />
          <span className="hidden sm:inline">{currentLang?.flag}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-2xl border-white/70 bg-card/95 shadow-strong backdrop-blur-sm">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={`cursor-pointer rounded-xl ${
              language === lang.code ? "bg-primary/10 text-primary" : ""
            }`}
          >
            <span className="mr-2">{lang.flag}</span>
            {lang.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;
