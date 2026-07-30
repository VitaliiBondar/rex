import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/session";
import { getUsers, getUnits } from "@/lib/queries";
import { UserManager } from "./user-manager";
import { UnitManager } from "./unit-manager";

export default async function SettingsPage() {
  const admin = await requireAdmin();
  const [users, units] = await Promise.all([getUsers(), getUnits()]);

  return (
    <>
      <PageHeader title="Налаштування" />
      <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl">
        <UserManager users={users} currentUserId={admin.id} />
        <UnitManager units={units} />
      </div>
    </>
  );
}
