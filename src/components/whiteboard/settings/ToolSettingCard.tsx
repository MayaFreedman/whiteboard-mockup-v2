
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { ChevronsLeft } from 'lucide-react';
import { useSidebar } from '../../ui/sidebar';

interface ToolSettingCardProps {
  title: string;
  children: React.ReactNode;
}

export const ToolSettingCard: React.FC<ToolSettingCardProps> = ({ title, children }) => {
  const { toggleSidebar } = useSidebar();
  
  return (
    <Card>
      <CardHeader className="bg-company-light-pink py-2 px-4 rounded-t-lg">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base text-company-light-pink-foreground">{title}</CardTitle>
          <Button onClick={toggleSidebar} variant="ghost" size="icon" className="h-7 w-7 hover:bg-white/20">
            <ChevronsLeft className="h-4 w-4" />
            <span className="sr-only">Collapse sidebar</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-4 px-4 max-h-[calc(100vh-var(--toolbar-height,64px)-120px)] overflow-y-auto">
        {children}
      </CardContent>
    </Card>
  );
};
