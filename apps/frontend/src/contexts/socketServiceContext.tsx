import { createContext, useContext, useEffect, useRef } from "react";
import type { PropsWithChildren } from "react";
import { SocketService } from "@/services/socketService";

const SocketServiceContext = createContext<SocketService | null>(null);

export function SocketServiceProvider({ children }: PropsWithChildren) {
  const serviceRef = useRef<SocketService | null>(null);

  if (!serviceRef.current) {
    serviceRef.current = new SocketService();
  }

  useEffect(() => {
    const service = serviceRef.current;
    if (!service) {
      return;
    }

    const cleanup = service.connect();

    return () => {
      cleanup();
      service.disconnect();
    };
  }, []);

  if (!serviceRef.current) {
    throw new Error("SocketServiceProvider failed to initialize service");
  }

  return (
    <SocketServiceContext.Provider value={serviceRef.current}>
      {children}
    </SocketServiceContext.Provider>
  );
}

export function useSocketService() {
  const service = useContext(SocketServiceContext);
  if (!service) {
    throw new Error(
      "useSocketService must be used within a SocketServiceProvider"
    );
  }
  return service;
}
