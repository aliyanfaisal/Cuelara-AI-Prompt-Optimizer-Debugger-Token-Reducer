import { formatDate } from "@/lib/blog";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session-user";
import { PasswordForm, ProfileForm } from "./ProfileForms";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const session = (await getSessionUser())!;
  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.id }, select: { name: true, email: true, createdAt: true } });

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-foreground">Profile</h2>
        <p className="text-sm text-muted-foreground">Member since {formatDate(user.createdAt)}.</p>
      </div>
      <ProfileForm name={user.name ?? ""} email={user.email ?? ""} />
      <PasswordForm />
    </div>
  );
}
