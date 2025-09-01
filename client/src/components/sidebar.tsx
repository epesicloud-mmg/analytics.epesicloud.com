import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { 
  BarChart3, 
  Folder, 
  Database, 
  Users, 
  Settings, 
  HelpCircle, 
  Home,
  LogOut,
  Building,
  ChevronDown,
  Menu
} from "lucide-react";
import type { Organization } from "@shared/schema";

interface SidebarProps {
  organizations?: Organization[];
  selectedOrganization?: Organization | null;
  onOrganizationChange?: (org: Organization) => void;
}

export default function Sidebar({ 
  organizations = [], 
  selectedOrganization, 
  onOrganizationChange 
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [location] = useLocation();
  const { user } = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Projects', href: '/projects', icon: Folder },
    { name: 'Dashboards', href: '/dashboards', icon: BarChart3 },
    { name: 'Data Sources', href: '/data-sources', icon: Database },
    { name: 'Team', href: '/team', icon: Users },
  ];

  const bottomNavigation = [
    { name: 'Settings', href: '/settings', icon: Settings },
    { name: 'Help', href: '/help', icon: HelpCircle },
  ];

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  return (
    <div className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ${
      isCollapsed ? 'w-20' : 'w-64'
    }`}>
      {/* Brand Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">EpesiAI</span>
          </div>
        )}
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2"
        >
          <Menu className="h-4 w-4" />
        </Button>
      </div>

      {/* Organization Selector */}
      {!isCollapsed && organizations.length > 0 && (
        <div className="p-4 border-b border-gray-200">
          <Select 
            value={selectedOrganization?.id.toString()}
            onValueChange={(value) => {
              const org = organizations.find(o => o.id.toString() === value);
              if (org && onOrganizationChange) {
                onOrganizationChange(org);
              }
            }}
          >
            <SelectTrigger className="w-full">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <Building className="h-4 w-4 text-indigo-600" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium text-gray-900">
                    {selectedOrganization?.name || 'Select Organization'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {selectedOrganization?.domain || 'No domain'}
                  </div>
                </div>
              </div>
            </SelectTrigger>
            <SelectContent>
              {organizations.map((org) => (
                <SelectItem key={org.id} value={org.id.toString()}>
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-indigo-100 rounded-md flex items-center justify-center">
                      <Building className="h-3 w-3 text-indigo-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">{org.name}</div>
                      <div className="text-xs text-gray-500">{org.domain}</div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href;
          return (
            <Link key={item.name} href={item.href}>
              <Button
                variant={isActive ? "default" : "ghost"}
                className={`w-full justify-start ${
                  isActive 
                    ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-100" 
                    : "text-gray-700 hover:bg-gray-100"
                } ${isCollapsed ? "px-2" : ""}`}
              >
                <Icon className={`h-4 w-4 ${isCollapsed ? "" : "mr-3"}`} />
                {!isCollapsed && <span>{item.name}</span>}
              </Button>
            </Link>
          );
        })}
        
        <div className="pt-4 border-t border-gray-200 mt-4">
          {bottomNavigation.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            return (
              <Link key={item.name} href={item.href}>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  className={`w-full justify-start ${
                    isActive 
                      ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-100" 
                      : "text-gray-700 hover:bg-gray-100"
                  } ${isCollapsed ? "px-2" : ""}`}
                >
                  <Icon className={`h-4 w-4 ${isCollapsed ? "" : "mr-3"}`} />
                  {!isCollapsed && <span>{item.name}</span>}
                </Button>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User Profile */}
      {!isCollapsed && (
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center space-x-3">
            <img 
              src={user?.profileImageUrl || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=40&h=40"} 
              alt="User profile" 
              className="w-10 h-10 rounded-full object-cover"
            />
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">
                {user?.firstName && user?.lastName 
                  ? `${user.firstName} ${user.lastName}`
                  : user?.email || 'User'
                }
              </div>
              <div className="text-xs text-gray-500">{user?.email}</div>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleLogout}
              className="p-1"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
