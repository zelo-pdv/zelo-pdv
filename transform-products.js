const fs = require('fs');
let code = fs.readFileSync('src/app/(auth)/produtos/page.tsx', 'utf8');

const importStatement = "import { ProductsConfigModal } from '@/components/produtos/products-config-modal';\n";
code = code.replace("import { handleExportProducts } from '@/lib/export';", "import { handleExportProducts } from '@/lib/export';\n" + importStatement);

const stateVar = "  const [isConfigOpen, setIsConfigOpen] = useState(false);\n";
code = code.replace("const [loading, setLoading] = useState(true);", "const [loading, setLoading] = useState(true);\n" + stateVar);

code = code.replace(/<MobileActionFab[\s\S]*?\/>/, `<MobileActionFab 
        onAdd={() => setCreating(true)} 
        onExport={handleExport} 
        onConfig={() => setIsConfigOpen(true)}
        isExporting={isExporting} 
      />`);

const modalJSX = "      <ProductsConfigModal isOpen={isConfigOpen} onClose={() => setIsConfigOpen(false)} />\n";
code = code.replace(/<MobileActionFab[\s\S]*?\/>/, match => match + "\n" + modalJSX);

const desktopBtn = `      <Button variant="outline" onClick={() => setIsConfigOpen(true)} className="hidden md:flex">
        <BoxIcon name="cog" className="mr-2" /> Configurações
      </Button>
`;
code = code.replace(/<Button[^>]*onClick=\{handleExport\}[^>]*>[\s\S]*?<\/Button>/, match => desktopBtn + match);

fs.writeFileSync('src/app/(auth)/produtos/page.tsx', code);
