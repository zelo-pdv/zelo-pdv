const fs = require('fs');
let code = fs.readFileSync('src/components/produtos/products-config-modal.tsx', 'utf8');

const imports = `import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useSettingsStore } from '@/store/useSettingsStore';
import { categoriesService } from '@/services/categories.service';
import { unitsService, Unit } from '@/services/units.service';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/ui/loading-button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BoxIcon } from '@/components/ui/box-icon';
import { useIsMobile } from '@/hooks/use-mobile';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import { GlobalLoader } from '@/components/ui/global-loader';

type UnitFormData = { name: string; abbreviation: string; decimalPlaces: number };

export function ProductsConfigModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {`;

// Replace function declaration
code = code.substring(code.indexOf('{') + 1);

// Remove the outermost Card and CardHeader
const cardContentStart = code.indexOf('<CardContent');
if (cardContentStart !== -1) {
    const afterCardContent = code.substring(cardContentStart);
    const contentInnerStart = afterCardContent.indexOf('>') + 1;
    
    // Find the end of CardContent
    const cardContentEnd = code.lastIndexOf('</CardContent>');
    
    let innerJSX = code.substring(cardContentStart + contentInnerStart, cardContentEnd);
    
    // Some fixups
    innerJSX = innerJSX.replace(/isExpanded/g, 'true');
    innerJSX = innerJSX.replace(/<Card className=\"mb-4\">/g, '');
    innerJSX = innerJSX.replace(/<\/Card>/g, '');

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
        <DrawerContent className="max-h-[85vh] p-4">
          <DrawerHeader className="px-0">
            <DrawerTitle>Configurações de Produtos</DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto">
            {content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()} blur>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurações de Produtos</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}`;

    const logicCode = code.substring(0, code.indexOf('<Card className="mb-4">'));
    
    fs.writeFileSync('src/components/produtos/products-config-modal.tsx', imports + logicCode + wrapper);
}
