import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";

export interface BankAccountInput {
  bankName: string;
  accountTitle: string;
  accountNumber: string;
  iban: string;
}

export const emptyBankAccount = (): BankAccountInput => ({ bankName: "", accountTitle: "", accountNumber: "", iban: "" });

interface Props {
  value: BankAccountInput[];
  onChange: (v: BankAccountInput[]) => void;
}

/** Add/remove multiple bank accounts for receiving payouts (mentor signup + profile). */
export const BankAccountsEditor = ({ value, onChange }: Props) => {
  const update = (i: number, field: keyof BankAccountInput, val: string) =>
    onChange(value.map((a, idx) => (idx === i ? { ...a, [field]: val } : a)));
  const add = () => onChange([...value, emptyBankAccount()]);
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-3">
      {value.length === 0 && (
        <p className="text-sm text-muted-foreground">No accounts added yet — add at least one to receive payouts.</p>
      )}
      {value.map((acc, i) => (
        <div key={i} className="rounded-lg border border-border p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Account {i + 1}</span>
            <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 text-red-600 hover:bg-red-50" onClick={() => remove(i)}>
              <Trash2 className="h-3.5 w-3.5" /> Remove
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Input placeholder="Bank (e.g. Meezan / Easypaisa)" value={acc.bankName} onChange={(e) => update(i, "bankName", e.target.value)} />
            <Input placeholder="Account title" value={acc.accountTitle} onChange={(e) => update(i, "accountTitle", e.target.value)} />
            <Input placeholder="Account number" value={acc.accountNumber} onChange={(e) => update(i, "accountNumber", e.target.value)} />
            <Input placeholder="IBAN (optional)" value={acc.iban} onChange={(e) => update(i, "iban", e.target.value)} />
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="gap-1" onClick={add}>
        <Plus className="h-4 w-4" /> Add account
      </Button>
    </div>
  );
};
