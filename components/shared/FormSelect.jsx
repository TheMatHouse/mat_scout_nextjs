import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function FormSelect({
  label,
  value,
  onChange,
  placeholder,
  options,
}) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <Select
        onValueChange={onChange}
        value={value}
      >
        <SelectTrigger className="w-full h-10 rounded-md border border-gray-600 bg-gray-900 px-3 text-gray-100">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt, i) => (
            <SelectItem
              key={i}
              value={opt.value}
            >
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
