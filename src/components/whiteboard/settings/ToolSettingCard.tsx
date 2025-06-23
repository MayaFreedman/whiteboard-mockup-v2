
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';

interface ToolSettingCardProps {
  title: string;
  children: React.ReactNode;
}

export const ToolSettingCard: React.FC<ToolSettingCardProps> = ({ title, children }) => {
  return (
    <Card>
      <CardHeader className="bg-muted/80 py-3">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        {children}
      </CardContent>
    </Card>
  );
};
