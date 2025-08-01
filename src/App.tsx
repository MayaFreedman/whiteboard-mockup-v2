
import React, { useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MultiplayerProvider } from "./contexts/MultiplayerContext";
import { UserProvider } from "./contexts/UserContext";
import { preloadStampImages } from "./utils/imagePreloader";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  // Preload stamp images on app startup to prevent infinite rendering loops
  useEffect(() => {
    preloadStampImages().catch(console.error);
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <UserProvider>
        <MultiplayerProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </MultiplayerProvider>
      </UserProvider>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
