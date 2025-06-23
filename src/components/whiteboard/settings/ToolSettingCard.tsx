
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';

interface ToolSettingCardProps {
  title: string;
  children: React.ReactNode;
}

export const ToolSettingCard: React.FC<ToolSettingCardProps> = ({ title, children }) => {
  return (
    <Card>
      <CardHeader className="bg-company-light-pink py-3 px-6 rounded-t-lg">
        <CardTitle className="text-lg text-company-light-pink-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-6 px-6">
        {children}
      </CardContent>
    </Card>
  );
};
