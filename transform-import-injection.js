const fs = require('fs');

// ==== PRODUTOS ====
let prodCode = fs.readFileSync('src/app/(auth)/produtos/page.tsx', 'utf8');

const prodImportStatement = "import { ProductsImportModal } from '@/components/produtos/products-import-modal';\n";
prodCode = prodCode.replace("import { ProductsConfigModal } from '@/components/produtos/products-config-modal';", "import { ProductsConfigModal } from '@/components/produtos/products-config-modal';\n" + prodImportStatement);

const prodStateVar = "  const [isImportOpen, setIsImportOpen] = useState(false);\n";
prodCode = prodCode.replace("  const [isConfigOpen, setIsConfigOpen] = useState(false);", "  const [isConfigOpen, setIsConfigOpen] = useState(false);\n" + prodStateVar);

prodCode = prodCode.replace(/<MobileActionFab[\s\S]*?\/>/, `<MobileActionFab 
        onAdd={() => setCreating(true)} 
        onExport={handleExport} 
        onConfig={() => setIsConfigOpen(true)}
        onImport={() => setIsImportOpen(true)}
        isExporting={isExporting} 
      />`);

const prodModalJSX = "      <ProductsImportModal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} />\n";
prodCode = prodCode.replace(/<MobileActionFab[\s\S]*?\/>/, match => match + "\n" + prodModalJSX);

const prodDesktopBtn = `      <Button variant="outline" onClick={() => setIsImportOpen(true)} className="hidden md:flex">
        <BoxIcon name="upload" className="mr-2" /> Importar
      </Button>
`;
prodCode = prodCode.replace(/<Button variant="outline" onClick=\{handleExport\}/, match => prodDesktopBtn + match);

fs.writeFileSync('src/app/(auth)/produtos/page.tsx', prodCode);


// ==== USUARIOS ====
let usersCode = fs.readFileSync('src/app/(auth)/usuarios/page.tsx', 'utf8');

const usersImportStatement = "import { ClientsImportModal } from '@/components/usuarios/users-import-modal';\n";
usersCode = usersCode.replace("import { handleExportClients } from '@/lib/export';", "import { handleExportClients } from '@/lib/export';\n" + usersImportStatement);

const usersStateVar = "  const [isImportOpen, setIsImportOpen] = useState(false);\n";
usersCode = usersCode.replace("const [loading, setLoading] = useState(true);", "const [loading, setLoading] = useState(true);\n" + usersStateVar);

usersCode = usersCode.replace(/<MobileActionFab[\s\S]*?\/>/, `<MobileActionFab 
        onAdd={() => setCreating(true)} 
        onExport={handleExport} 
        onImport={() => setIsImportOpen(true)}
        isExporting={isExporting} 
      />`);

const usersModalJSX = "      <ClientsImportModal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} />\n";
usersCode = usersCode.replace(/<MobileActionFab[\s\S]*?\/>/, match => match + "\n" + usersModalJSX);

const usersDesktopBtn = `      <Button variant="outline" onClick={() => setIsImportOpen(true)} className="hidden md:flex">
        <BoxIcon name="upload" className="mr-2" /> Importar
      </Button>
`;
usersCode = usersCode.replace(/<Button variant="outline" onClick=\{handleExport\}/, match => usersDesktopBtn + match);

fs.writeFileSync('src/app/(auth)/usuarios/page.tsx', usersCode);
