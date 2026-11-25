import * as React from 'react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar';
import AppLogo from '../AppLogo';
import { NavGroup } from "./NavGroup";
import { SidebarData } from "./types";
import { cn } from "@/lib/utils";

function AppSidebar({ navItems, ...props }: { navItems: SidebarData }) {
  const { state } = useSidebar();

  return (
    <Sidebar
      collapsible='icon'
      variant='floating'
      className="border-sidebar-border"
      {...props}
    >
      <SidebarHeader className="bg-sidebar border-b border-sidebar-border/50 rounded-t-lg">
        <AppLogo className="text-sidebar-foreground" />
      </SidebarHeader>

      <SidebarContent className={cn(
        "scrollbar overflow-x-hidden bg-sidebar",
        "[&>*]:text-sidebar-foreground"
      )}>
        {navItems.navGroups.map((props_: any, index: number) => (
          <NavGroup
            key={`${props_.title}-${index}`}
            {...props_}
            className="text-sidebar-foreground [&>*]:text-sidebar-foreground"
          />
        ))}
      </SidebarContent>

      {state === 'expanded' && (
        <SidebarFooter className="bg-sidebar border-t border-sidebar-border/50 rounded-b-lg">
          <div className="flex flex-col items-center justify-center py-1 text-[10px] text-muted-foreground select-none">
            Build v{__BUILD_VERSION__}
          </div>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}

export default AppSidebar;
