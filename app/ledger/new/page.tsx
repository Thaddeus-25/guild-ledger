import PixelPanel from "@/components/PixelPanel";
import TransactionForm from "@/components/TransactionForm";
import { safeReturnPath } from "@/lib/navigation";

// The address can say where to return, e.g. /ledger/new?from=/
export default async function NewEntryPage({ searchParams }: PageProps<"/ledger/new">) {
  const { from } = await searchParams;

  return (
    <>
      <h1 className="page-title">Record an entry</h1>
      <p className="page-subtitle">Add income or an expense to the ledger</p>

      <PixelPanel>
        <TransactionForm returnTo={safeReturnPath(from)} />
      </PixelPanel>
    </>
  );
}
