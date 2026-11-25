import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import { withErrorHandler } from '../../../../utils/withErrorHandler.ts';
import { db } from '../../../../db/index.ts';
import { subContractors, vessels, locations } from '../../../../db/schema/auth.schema.ts';
import { subtypes } from '../../../../db/schema/report.schema.ts';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

const importEmployeeExcelPublicRoute: FastifyPluginAsyncTypebox = async (app) => {
  // Add endpoint to download template with dynamic data sheets
  app.route({
    method: 'GET',
    url: '/import-template',
    schema: {
      tags: ['Employee'],
      summary: 'Download Excel template for employee import',
      description: 'Download Excel template for employee import with Company, Project, Vessel, and Location lists',
      response: {
        200: Type.Any(),
      },
    },
    handler: withErrorHandler(async (_req, reply) => {
      // Get data from database
      const [companies, projects, vesselsList, locationsList] = await Promise.all([
        db.select({ name: subContractors.name }).from(subContractors),
        db.select({ name: subtypes.name }).from(subtypes),
        db.select({ name: vessels.vesselName }).from(vessels),
        db.select({ name: locations.name }).from(locations),
      ]);

      // Read the existing template file
      const templatePath = path.join(process.cwd(), '../uploads/Template Employee Data.xlsx');
      if (!fs.existsSync(templatePath)) {
        reply.code(404);
        return { message: 'Template file not found' };
      }

      // Create temp directory for processing
      const tempDir = path.join(process.cwd(), '../uploads/temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Copy original template
      const tempTemplatePath = path.join(tempDir, 'template.xlsx');
      fs.copyFileSync(templatePath, tempTemplatePath);

      // Create reference data files
      const companyCsv = ['Company Name', 'INSTRUKSI: Gunakan nama-nama di bawah ini untuk kolom "Company Name" di sheet Employees', '', ...companies.map(c => c.name)].join('\n');
      const projectCsv = ['Project Name', 'INSTRUKSI: Gunakan nama-nama di bawah ini untuk kolom "Nama Project" di sheet Employees', '', ...projects.map(p => p.name)].join('\n');
      const vesselCsv = ['Vessel Name', 'INSTRUKSI: Gunakan nama-nama di bawah ini untuk kolom "Nama Vessel/Lokasi" di sheet Employees', '', ...vesselsList.map(v => v.name)].join('\n');
      const locationCsv = ['Location Name', 'INSTRUKSI: Gunakan nama-nama di bawah ini untuk kolom "Nama Vessel/Lokasi" di sheet Employees', '', ...locationsList.map(l => l.name)].join('\n');

      fs.writeFileSync(path.join(tempDir, 'company.csv'), companyCsv);
      fs.writeFileSync(path.join(tempDir, 'project.csv'), projectCsv);
      fs.writeFileSync(path.join(tempDir, 'vessel.csv'), vesselCsv);
      fs.writeFileSync(path.join(tempDir, 'location.csv'), locationCsv);

      // Use Python with openpyxl to add sheets while preserving formatting
      const pythonScript = `import openpyxl
import csv

template_path = r'${tempTemplatePath.replace(/\\/g, '/')}'
temp_dir = r'${tempDir.replace(/\\/g, '/')}'

wb = openpyxl.load_workbook(template_path)

ws = wb.create_sheet('Company List')
with open(temp_dir + '/company.csv', 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    for row in reader:
        ws.append(row)

ws = wb.create_sheet('Project List')
with open(temp_dir + '/project.csv', 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    for row in reader:
        ws.append(row)

ws = wb.create_sheet('Vessel List')
with open(temp_dir + '/vessel.csv', 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    for row in reader:
        ws.append(row)

ws = wb.create_sheet('Location List')
with open(temp_dir + '/location.csv', 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    for row in reader:
        ws.append(row)

wb.save(template_path)
`;

      const scriptPath = path.join(tempDir, 'add_sheets.py');
      fs.writeFileSync(scriptPath, pythonScript);

      try {
        // Use Python from virtual environment directly
        const venvPython = path.join(process.cwd(), 'venv', 'bin', 'python3');
        execSync(`"${venvPython}" "${scriptPath}"`, { cwd: tempDir });
      } catch (e) {
        // Fallback: if python not available, use xlsx with styling warning
        const XLSX = await import('xlsx');
        const originalBuffer = fs.readFileSync(templatePath);
        const workbook = XLSX.read(originalBuffer, { type: 'buffer' });
        
        const companyData = [
          ['Company Name'],
          ['INSTRUKSI: Gunakan nama-nama di bawah ini untuk kolom "Company Name" di sheet Employees'],
          [''],
          ...companies.map(c => [c.name])
        ];
        const projectData = [
          ['Project Name'],
          ['INSTRUKSI: Gunakan nama-nama di bawah ini untuk kolom "Nama Project" di sheet Employees'],
          [''],
          ...projects.map(p => [p.name])
        ];
        const vesselData = [
          ['Vessel Name'],
          ['INSTRUKSI: Gunakan nama-nama di bawah ini untuk kolom "Nama Vessel/Lokasi" di sheet Employees'],
          [''],
          ...vesselsList.map(v => [v.name])
        ];
        const locationData = [
          ['Location Name'],
          ['INSTRUKSI: Gunakan nama-nama di bawah ini untuk kolom "Nama Vessel/Lokasi" di sheet Employees'],
          [''],
          ...locationsList.map(l => [l.name])
        ];

        workbook.Sheets['Company List'] = XLSX.utils.aoa_to_sheet(companyData);
        workbook.Sheets['Project List'] = XLSX.utils.aoa_to_sheet(projectData);
        workbook.Sheets['Vessel List'] = XLSX.utils.aoa_to_sheet(vesselData);
        workbook.Sheets['Location List'] = XLSX.utils.aoa_to_sheet(locationData);
        workbook.SheetNames = [...workbook.SheetNames, 'Company List', 'Project List', 'Vessel List', 'Location List'];
        
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        
        // Cleanup
        try { fs.rmSync(tempDir, { recursive: true }); } catch {}
        
        return reply
          .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
          .header('Content-Disposition', 'attachment; filename="Template Employee Data.xlsx"')
          .send(buffer);
      }

      // Read the modified file
      const buffer = fs.readFileSync(tempTemplatePath);

      // Cleanup temp files
      try {
        fs.rmSync(tempDir, { recursive: true });
      } catch {}

      return reply
        .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        .header('Content-Disposition', 'attachment; filename="Template Employee Data.xlsx"')
        .send(buffer);
    }),
  });
};

export default importEmployeeExcelPublicRoute;