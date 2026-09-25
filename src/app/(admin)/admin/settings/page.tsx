import { getToolSettings } from "./actions";
import { getApiKeysGrouped, getModelConfig } from "./api-key-actions";
import { getOpenRouterModelMode } from "@/lib/openrouter-mode";
import SettingsTabs from "./SettingsTabs";

export const metadata = {
  title: "Settings | Admin",
};

export default async function SettingsPage() {
  const [settings, apiKeys, openRouterMode, modelConfig] = await Promise.all([
    getToolSettings(),
    getApiKeysGrouped(),
    getOpenRouterModelMode(),
    getModelConfig(),
  ]);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Platform Settings</h1>
        <p className="text-muted-foreground">Configure limits and API key pools for public-facing tools.</p>
      </div>

      <SettingsTabs initialSettings={settings} initialKeys={apiKeys} initialOpenRouterMode={openRouterMode} initialModelConfig={modelConfig} />
    </div>
  );
}
