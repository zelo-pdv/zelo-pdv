const fs = require('fs');
let code = fs.readFileSync('src/app/(auth)/configuracoes/page.tsx', 'utf8');

// The main page function is SettingsPage
// We need to remove the rendering of <ProductsConfigSection />, <DashboardConfigSection />, <DataImportExportSection />
code = code.replace(/<ProductsConfigSection \/>\s*/g, '');
code = code.replace(/<DashboardConfigSection \/>\s*/g, '');
code = code.replace(/<DataImportExportSection \/>\s*/g, '');

// We also need to remove the definitions
const removeSection = (startStr, endStr) => {
  const start = code.indexOf(startStr);
  const end = code.indexOf(endStr);
  if (start !== -1 && end !== -1 && end > start) {
    code = code.substring(0, start) + code.substring(end);
  }
};

removeSection('function ProductsConfigSection() {', 'function DashboardConfigSection() {');
removeSection('function DashboardConfigSection() {', 'function DataImportExportSection() {');
removeSection('function DataImportExportSection() {', 'function GroupsSection() {');

fs.writeFileSync('src/app/(auth)/configuracoes/page.tsx', code);
