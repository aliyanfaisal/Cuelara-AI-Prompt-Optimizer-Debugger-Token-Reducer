"use client";

import { useState } from "react";
import { Sliders, KeyRound, CreditCard } from "lucide-react";
import SettingsManager from "./SettingsManager";
import ApiKeysManager from "./ApiKeysManager";
import PaddleSettingsManager from "./PaddleSettingsManager";
import type { ToolSettings } from "./actions";
import type { ApiKeyRow, ModelConfig } from "./api-key-actions";
import type { PaddleSettingsView } from "./paddle-actions";
import type { Provider } from "@/lib/providers";
import type { OpenRouterModelMode } from "@/lib/openrouter-mode";

type Tab = "limits" | "keys" | "payments";

export default function SettingsTabs({
  initialSettings,
  initialKeys,
  initialOpenRouterMode,
  initialModelConfig,
  initialPaddleSettings,
}: {
  initialSettings: ToolSettings;
  initialKeys: Record<Provider, ApiKeyRow[]>;
  initialOpenRouterMode: OpenRouterModelMode;
  initialModelConfig: ModelConfig;
  initialPaddleSettings: PaddleSettingsView;
}) {
  const [tab, setTab] = useState<Tab>("limits");

  return (
    <div>
      <div className="flex items-center gap-2 mb-8 border-b border-border">
        <button
          onClick={() => setTab("limits")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
            tab === "limits" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Sliders className="w-4 h-4" />
          Tool Limits
        </button>
        <button
          onClick={() => setTab("keys")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
            tab === "keys" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <KeyRound className="w-4 h-4" />
          API Keys
        </button>
        <button
          onClick={() => setTab("payments")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
            tab === "payments" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Payments
        </button>
      </div>

      {tab === "limits" ? (
        <SettingsManager initialSettings={initialSettings} />
      ) : tab === "keys" ? (
        <ApiKeysManager initialKeys={initialKeys} initialOpenRouterMode={initialOpenRouterMode} initialModelConfig={initialModelConfig} />
      ) : (
        <PaddleSettingsManager initial={initialPaddleSettings} />
      )}
    </div>
  );
}
