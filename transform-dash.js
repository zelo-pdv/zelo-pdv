const fs = require('fs');
let code = fs.readFileSync('src/app/(auth)/configuracoes/page.tsx', 'utf8');

const startStr = 'function DashboardConfigSection() {';
const endStr = 'function GroupsSection() {';
const start = code.indexOf(startStr);
const end = code.indexOf(endStr);
let dashCode = code.substring(start, end);

const imports = `import { useState } from 'react';
import { toast } from 'sonner';
import { useSettingsStore } from '@/store/useSettingsStore';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { BoxIcon } from '@/components/ui/box-icon';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

export function DashboardConfigModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const isMobile = useIsMobile();`;

dashCode = dashCode.substring(dashCode.indexOf('{') + 1);

const cardContentStart = dashCode.indexOf('<CardContent');
if (cardContentStart !== -1) {
    const afterCardContent = dashCode.substring(cardContentStart);
    const contentInnerStart = afterCardContent.indexOf('>') + 1;
    const cardContentEnd = dashCode.lastIndexOf('</CardContent>');
    let innerJSX = dashCode.substring(cardContentStart + contentInnerStart, cardContentEnd);

    const wrapper = `
  if (!isOpen) return null;

  const content = (
    <div className="space-y-4 pt-4">
      ${innerJSX}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(val) => !val && onClose()} blur>
        <DrawerContent className="p-4">
          <DrawerHeader className="px-0">
            <DrawerTitle>Configurações do Dashboard</DrawerTitle>
          </DrawerHeader>
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()} blur>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Configurações do Dashboard</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}`;

    const logicCode = dashCode.substring(0, dashCode.indexOf('<Card className="mb-4">'));
    fs.writeFileSync('src/components/dashboard/dashboard-config-modal.tsx', imports + logicCode + wrapper);
}
