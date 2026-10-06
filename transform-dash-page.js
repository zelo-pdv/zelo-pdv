const fs = require('fs');
let code = fs.readFileSync('src/app/(auth)/dashboard/page.tsx', 'utf8');

const importStatement = "import { DashboardConfigModal } from '@/components/dashboard/dashboard-config-modal';\n";
code = code.replace("import { getFirstAccessibleRoute } from '@/lib/navigation-data';", "import { getFirstAccessibleRoute } from '@/lib/navigation-data';\n" + importStatement);

const stateVar = "  const [isConfigOpen, setIsConfigOpen] = useState(false);\n";
code = code.replace("const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);", stateVar + "  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);");

const modalJSX = "      <DashboardConfigModal isOpen={isConfigOpen} onClose={() => setIsConfigOpen(false)} />\n";
code = code.replace("return (", modalJSX + "  return (\n    <>");

// Add closing tag at the end
const finalReplace = "    </>\n  );\n}";
code = code.replace(/<\/div>[\s\n]*\);[\s\n]*\}/, "    </div>\n" + finalReplace);

// Add the gear icon to the dashboard header
const headerPattern = /<div className=\"flex flex-col gap-1\">\s*<h1 className=\"text-2xl font-bold tracking-tight\">Visão Geral<\/h1>\s*<p className=\"text-sm text-muted-foreground\">Acompanhe as métricas e desempenho da loja.<\/p>\s*<\/div>/;

const newHeader = `<div className="flex w-full items-start justify-between">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-bold tracking-tight">Visão Geral</h1>
              <p className="text-sm text-muted-foreground">Acompanhe as métricas e desempenho da loja.</p>
            </div>
            <Button variant="outline" size="icon" onClick={() => setIsConfigOpen(true)}>
              <BoxIcon name="cog" className="text-xl" />
            </Button>
          </div>`;

code = code.replace(headerPattern, newHeader);

// In case the stateVar replacement failed because hoveredIdx is in SalesWeekChart, we need to inject it into DashboardPage instead
// Wait, `hoveredIdx` is in `SalesWeekChart`. We must inject `isConfigOpen` in `default function DashboardPage() {`
code = code.replace("export default function DashboardPage() {\n  const router = useRouter();", "export default function DashboardPage() {\n  const router = useRouter();\n" + stateVar);

fs.writeFileSync('src/app/(auth)/dashboard/page.tsx', code);
