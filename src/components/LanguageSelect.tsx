import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguages } from "@/lib/languages";

type Props = {
  value: string;
  onChange: (code: string) => void;
  label: string;
  exclude?: string;
};

export function LanguageSelect({ value, onChange, label, exclude }: Props) {
  const { data: languages = [] } = useLanguages();

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label} className="h-11 flex-1 rounded-xl bg-secondary text-sm font-semibold">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {languages
          .filter((l) => l.code !== exclude)
          .map((l) => (
            <SelectItem key={l.code} value={l.code}>
              {l.flag} {l.name}
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  );
}