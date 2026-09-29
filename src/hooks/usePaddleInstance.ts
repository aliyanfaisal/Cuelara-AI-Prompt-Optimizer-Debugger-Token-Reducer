"use client";

import { useEffect, useRef, useState } from "react";
import { initializePaddle, type Paddle, type PaddleEventData } from "@paddle/paddle-js";
import type { PaddleEnvironment } from "@/lib/paddle";

// One Paddle.js instance per (clientToken, environment) pair, shared by every component on the
// page that needs it, so checkout/card-update buttons don't each download and init their own copy.
export function usePaddleInstance(clientToken: string, environment: PaddleEnvironment, onEvent?: (event: PaddleEventData) => void) {
  const [paddle, setPaddle] = useState<Paddle>();
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!clientToken) return;
    let cancelled = false;
    initializePaddle({ environment, token: clientToken, eventCallback: (event) => onEventRef.current?.(event) }).then((instance) => {
      if (instance && !cancelled) setPaddle(instance);
    });
    return () => {
      cancelled = true;
    };
  }, [clientToken, environment]);

  return paddle;
}
