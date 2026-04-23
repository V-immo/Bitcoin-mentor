import { auth } from "@/auth";
import { getDb } from "@/db/db";
import MarcusBot from "@/components/MarcusBot";

export default async function BotsPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;

  let isPro = false;
  if (userId) {
    const db = getDb();
    const user = db.prepare("SELECT is_pro, pro_until FROM users WHERE id = ?").get(parseInt(userId)) as { is_pro: number; pro_until: string } | undefined;
    isPro = user?.is_pro === 1 && (!user.pro_until || user.pro_until >= new Date().toISOString().slice(0, 10));
  }

  return <MarcusBot isPro={isPro} />;
}
