import { PACKAGES } from "@/lib/pricing";

/** Shows what a mentor is paid for each service (used in signup popup + profile). */
export const MentorEarningsTable = () => (
  <div className="rounded-lg border border-border overflow-hidden">
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-muted/50 text-left text-muted-foreground">
          <th className="p-2.5 font-medium">Package / Service</th>
          <th className="p-2.5 font-medium text-right">You earn</th>
        </tr>
      </thead>
      <tbody>
        {PACKAGES.map((p) => (
          <tr key={p.key} className="border-t border-border">
            <td className="p-2.5 text-foreground">{p.name}</td>
            <td className="p-2.5 text-right font-semibold text-action">Rs {p.mentorPayout.toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
