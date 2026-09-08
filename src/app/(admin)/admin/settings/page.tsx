import { getToolSettings } from "./actions";
import SettingsManager from "./SettingsManager";

export const metadata = {
  title: "Settings | Admin",
};

export default async function SettingsPage() {
  const settings = await getToolSettings();

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Platform Settings</h1>
        <p className="text-muted-foreground">Configure limits for public-facing tools.</p>
      </div>

      <SettingsManager initialSettings={settings} />
    </div>
  );
}
