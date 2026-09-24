import { prisma } from "@/lib/prisma";
import MessagesTable, { type MessageRow } from "./MessagesTable";

export const metadata = {
  title: "Messages | Admin",
};

const ROW_LIMIT = 300;

export default async function MessagesPage() {
  const [rows, total, unread] = await Promise.all([
    prisma.contactMessage.findMany({ orderBy: { createdAt: "desc" }, take: ROW_LIMIT }),
    prisma.contactMessage.count(),
    prisma.contactMessage.count({ where: { isRead: false } }),
  ]);

  const messages: MessageRow[] = rows.map((m) => ({
    id: m.id,
    name: m.name,
    email: m.email,
    subject: m.subject,
    message: m.message,
    plan: m.plan,
    isRead: m.isRead,
    emailSent: m.emailSent,
    createdAt: m.createdAt.toISOString(),
  }));

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Messages</h1>
        <p className="text-muted-foreground">
          Everything submitted through the public contact form. Each message is also emailed to the team; reply from your
          inbox and it goes straight to the sender.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="glass-card rounded-2xl p-6">
          <p className="text-sm font-medium text-muted-foreground">Total messages</p>
          <p className="text-2xl font-bold text-foreground mt-1">{total.toLocaleString()}</p>
        </div>
        <div className="glass-card rounded-2xl p-6">
          <p className="text-sm font-medium text-muted-foreground">Unread</p>
          <p className="text-2xl font-bold text-foreground mt-1">{unread.toLocaleString()}</p>
        </div>
      </div>

      <MessagesTable initialMessages={messages} />
    </div>
  );
}
