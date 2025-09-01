import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Folder, BarChart3, Database, Users, TrendingUp } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: number | string;
  change?: string;
  icon: "folder" | "chart" | "database" | "users";
  color: "indigo" | "emerald" | "amber" | "rose";
}

const iconMap = {
  folder: Folder,
  chart: BarChart3,
  database: Database,
  users: Users,
};

const colorMap = {
  indigo: {
    bg: "bg-indigo-100",
    text: "text-indigo-600",
  },
  emerald: {
    bg: "bg-emerald-100", 
    text: "text-emerald-600",
  },
  amber: {
    bg: "bg-amber-100",
    text: "text-amber-600",
  },
  rose: {
    bg: "bg-rose-100",
    text: "text-rose-600",
  },
};

export default function StatsCard({ 
  title, 
  value, 
  change, 
  icon, 
  color 
}: StatsCardProps) {
  const Icon = iconMap[icon];
  const colors = colorMap[color];

  return (
    <Card className="hover:shadow-md transition-all duration-300">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">
          {title}
        </CardTitle>
        <div className="flex items-center space-x-2">
          {change && (
            <span className="text-sm text-green-600 font-medium flex items-center">
              <TrendingUp className="h-3 w-3 mr-1" />
              {change}
            </span>
          )}
          <div className={`w-12 h-12 ${colors.bg} rounded-lg flex items-center justify-center`}>
            <Icon className={`h-6 w-6 ${colors.text}`} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900 mb-1">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        <p className="text-sm text-gray-600">{title}</p>
      </CardContent>
    </Card>
  );
}
