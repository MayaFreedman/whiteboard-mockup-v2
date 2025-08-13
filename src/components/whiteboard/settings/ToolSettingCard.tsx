
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
      <CardHeader className="bg-company-light-pink py-3 px-6 rounded-t-lg">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg text-company-light-pink-foreground">{title}</CardTitle>
          <Button onClick={toggleSidebar} variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/20">
            <ChevronsLeft className="h-4 w-4" />
            <span className="sr-only">Collapse sidebar</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-6 px-6">
        {children}
      </CardContent>
    </Card>
  );
};
