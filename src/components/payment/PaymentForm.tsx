import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Lock, CreditCard, ShieldCheck } from "lucide-react";

interface PaymentFormProps {
  amount: number;
  itemLabel: string;
  onSuccess: () => void;
  submitLabel?: string;
}

type CardBrand = "visa" | "mastercard" | "amex" | "unionpay" | "unknown";

function detectCardBrand(number: string): CardBrand {
  const digits = number.replace(/\s/g, "");
  if (/^4/.test(digits)) return "visa";
  if (/^5[1-5]/.test(digits) || /^2[2-7]/.test(digits)) return "mastercard";
  if (/^3[47]/.test(digits)) return "amex";
  if (/^62/.test(digits)) return "unionpay";
  return "unknown";
}

const brandColors: Record<CardBrand, string> = {
  visa: "#1A1F71",
  mastercard: "#EB001B",
  amex: "#006FCF",
  unionpay: "#D31145",
  unknown: "currentColor",
};

const brandNames: Record<CardBrand, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "Amex",
  unionpay: "UnionPay",
  unknown: "",
};

function CardBrandIcon({ brand, size = 28 }: { brand: CardBrand; size?: number }) {
  if (brand === "visa") {
    return (
      <svg width={size} height={size * 0.64} viewBox="0 0 48 32" fill="none">
        <rect width="48" height="32" rx="4" fill="#1A1F71" />
        <path d="M19.5 21H16.8L18.6 11H21.3L19.5 21ZM14.7 11L12.1 17.9L11.8 16.4L11.8 16.4L10.9 12C10.9 12 10.8 11 9.5 11H5.1L5 11.2C5 11.2 6.5 11.5 8.2 12.5L10.5 21H13.3L17.5 11H14.7ZM35.5 21H38L35.8 11H33.6C32.5 11 32.2 11.8 32.2 11.8L28.2 21H31L31.6 19.3H34.9L35.5 21ZM32.4 17.1L33.9 13L34.7 17.1H32.4ZM29.3 13.8L29.7 11.3C29.7 11.3 28.4 10.8 27 10.8C25.5 10.8 22 11.5 22 14.3C22 17 25.7 17 25.7 18.4C25.7 19.8 22.4 19.5 21.2 18.6L20.8 21.2C20.8 21.2 22.1 21.8 24 21.8C25.9 21.8 29.3 20.7 29.3 18.1C29.3 15.4 25.5 15.2 25.5 13.9C25.5 12.6 28 12.8 29.3 13.8Z" fill="white" />
      </svg>
    );
  }
  if (brand === "mastercard") {
    return (
      <svg width={size} height={size * 0.64} viewBox="0 0 48 32" fill="none">
        <rect width="48" height="32" rx="4" fill="#252525" />
        <circle cx="19" cy="16" r="8" fill="#EB001B" />
        <circle cx="29" cy="16" r="8" fill="#F79E1B" />
        <path d="M24 9.8C25.8 11.2 27 13.4 27 16C27 18.6 25.8 20.8 24 22.2C22.2 20.8 21 18.6 21 16C21 13.4 22.2 11.2 24 9.8Z" fill="#FF5F00" />
      </svg>
    );
  }
  if (brand === "amex") {
    return (
      <svg width={size} height={size * 0.64} viewBox="0 0 48 32" fill="none">
        <rect width="48" height="32" rx="4" fill="#006FCF" />
        <text x="24" y="19" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold" fontFamily="Arial">AMEX</text>
      </svg>
    );
  }
  if (brand === "unionpay") {
    return (
      <svg width={size} height={size * 0.64} viewBox="0 0 48 32" fill="none">
        <rect width="48" height="32" rx="4" fill="#D31145" />
        <text x="24" y="19" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold" fontFamily="Arial">UnionPay</text>
      </svg>
    );
  }
  return <CreditCard className="h-5 w-5 text-muted-foreground" />;
}

export const PaymentForm = ({ amount, itemLabel, onSuccess, submitLabel }: PaymentFormProps) => {
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const brand = detectCardBrand(cardNumber);
  const digits = cardNumber.replace(/\s/g, "");

  const formatCardNumber = (value: string) => {
    const d = value.replace(/\D/g, "").slice(0, 16);
    return d.replace(/(\d{4})(?=\d)/g, "$1 ");
  };

  const formatExpiry = (value: string) => {
    const d = value.replace(/\D/g, "").slice(0, 4);
    if (d.length >= 3) return `${d.slice(0, 2)}/${d.slice(2)}`;
    return d;
  };

  const isCardValid =
    digits.length === 16 &&
    cardName.trim().length > 0 &&
    expiryDate.length === 5 &&
    cvv.length >= 3;

  const handleSubmit = () => {
    if (!isCardValid) return;
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      onSuccess();
    }, 2200);
  };

  const maskedNumber = digits
    ? `${digits.slice(0, 4)} ${"*".repeat(4)} ${"*".repeat(4)} ${digits.slice(12) || "****"}`
    : "**** **** **** ****";

  return (
    <div className="space-y-5">
      {/* Card Preview */}
      <div className="relative overflow-hidden rounded-xl p-5 h-[180px] bg-gradient-to-br from-[hsl(237,64%,18%)] via-[hsl(237,64%,24%)] to-[hsl(210,80%,20%)] text-white shadow-xl select-none">
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "20px 20px",
        }} />

        <div className="relative z-10 flex flex-col justify-between h-full">
          {/* Top row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-6 rounded bg-gradient-to-br from-yellow-300 to-yellow-500 opacity-90" />
              <div className="w-5 h-5 rounded-full border border-white/30 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full border border-white/40" />
              </div>
            </div>
            <div className="opacity-90">
              {brand !== "unknown" ? (
                <CardBrandIcon brand={brand} size={36} />
              ) : (
                <span className="text-xs tracking-wider text-white/50 uppercase">Card</span>
              )}
            </div>
          </div>

          {/* Number */}
          <div className="font-mono text-lg tracking-[0.2em] text-white/90">
            {maskedNumber}
          </div>

          {/* Bottom row */}
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[9px] uppercase tracking-wider text-white/40 mb-0.5">Cardholder</p>
              <p className="text-sm font-medium tracking-wider text-white/90 uppercase truncate max-w-[180px]">
                {cardName || "YOUR NAME"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] uppercase tracking-wider text-white/40 mb-0.5">Expires</p>
              <p className="text-sm font-mono text-white/90">
                {expiryDate || "MM/YY"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Accepted Cards */}
      <div className="flex items-center justify-center gap-3">
        {(["visa", "mastercard", "unionpay"] as CardBrand[]).map((b) => (
          <div
            key={b}
            className={`transition-opacity ${brand !== "unknown" && brand !== b ? "opacity-30" : "opacity-100"}`}
          >
            <CardBrandIcon brand={b} size={32} />
          </div>
        ))}
        <span className="text-[10px] text-muted-foreground ml-1">Accepted</span>
      </div>

      {/* Form Fields */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="pay-cardName" className="text-xs font-medium">
            Cardholder Name
          </Label>
          <Input
            id="pay-cardName"
            placeholder="As it appears on your card"
            value={cardName}
            onChange={(e) => setCardName(e.target.value)}
            className="h-11"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="pay-cardNumber" className="text-xs font-medium">
            Card Number
          </Label>
          <div className="relative">
            <Input
              id="pay-cardNumber"
              placeholder="0000 0000 0000 0000"
              value={cardNumber}
              onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
              maxLength={19}
              className="h-11 pr-14 font-mono tracking-wider"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {brand !== "unknown" ? (
                <CardBrandIcon brand={brand} size={24} />
              ) : (
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="pay-expiry" className="text-xs font-medium">
              Expiry Date
            </Label>
            <Input
              id="pay-expiry"
              placeholder="MM/YY"
              value={expiryDate}
              onChange={(e) => setExpiryDate(formatExpiry(e.target.value))}
              maxLength={5}
              className="h-11 font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pay-cvv" className="text-xs font-medium">
              CVV
            </Label>
            <Input
              id="pay-cvv"
              placeholder="***"
              type="password"
              value={cvv}
              onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
              maxLength={4}
              className="h-11 font-mono"
            />
          </div>
        </div>
      </div>

      {/* Security badges */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
        <div className="flex items-center gap-1.5">
          <Lock className="h-3.5 w-3.5" />
          <span>256-bit SSL Encrypted</span>
        </div>
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>PCI DSS Compliant</span>
        </div>
      </div>

      {/* Submit */}
      <Button
        variant="action"
        size="lg"
        className="w-full text-base h-12"
        disabled={!isCardValid || isProcessing}
        onClick={handleSubmit}
      >
        {isProcessing ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Processing...
          </span>
        ) : (
          submitLabel || `Pay Rs ${amount.toLocaleString()}`
        )}
      </Button>

      {!isCardValid && digits.length > 0 && (
        <p className="text-xs text-center text-muted-foreground">
          Fill in all card details to continue
        </p>
      )}
    </div>
  );
};
