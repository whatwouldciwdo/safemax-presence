import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  ImageRun,
  PageNumber,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx';
import { Attendance, EmployeeMonthlyQuota } from './types';
import { formatIndoDate, formatIndoTime, getJakartaDateKey, getReportDepartment } from './attendance-utils';

const NAVY = '17365D';
const BLUE = 'D9EAF7';
const LIGHT_BLUE = 'EDF4FA';
const BORDER = '9FBAD0';
const TEXT = '1F2937';
const WHITE = 'FFFFFF';
const FONT = 'Arial';

const borders = {
  top: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
  left: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
  right: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
  insideVertical: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
};

function text(value: string, bold = false, color = TEXT, size = 18): TextRun {
  return new TextRun({ text: value, bold, color, size, font: FONT });
}

function cell(
  value: string,
  width: number,
  options: { header?: boolean; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; shade?: string } = {}
): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    shading: {
      type: ShadingType.CLEAR,
      fill: options.header ? NAVY : options.shade || WHITE,
      color: 'auto',
    },
    margins: { top: 90, bottom: 90, left: 90, right: 90 },
    children: [
      new Paragraph({
        alignment: options.align || AlignmentType.LEFT,
        spacing: { before: 0, after: 0, line: 240 },
        children: [text(value, Boolean(options.header), options.header ? WHITE : TEXT, options.header ? 17 : 16)],
      }),
    ],
  });
}

function monthLabel(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, monthNumber - 1, 1))
  );
}

export interface MonthlyAttendanceDocxOptions {
  month: string;
  attendances: Attendance[];
  quotas: EmployeeMonthlyQuota[];
  generatedBy: string;
  logo: ArrayBuffer;
}

export async function createMonthlyAttendanceDocx({
  month,
  attendances,
  quotas,
  generatedBy,
  logo,
}: MonthlyAttendanceDocxOptions): Promise<Blob> {
  const period = monthLabel(month);
  const sortedAttendances = [...attendances].sort(
    (a, b) => a.date.localeCompare(b.date) || (a.employee?.name || '').localeCompare(b.employee?.name || '')
  );
  const widths = [650, 1450, 2600, 1600, 1500, 1300, 1300, 1500];
  const headers = ['No.', 'Tanggal', 'Nama Karyawan', 'NIK', 'Departemen', 'Masuk', 'Pulang', 'Jam Kerja'];

  const detailRows = sortedAttendances.map(
    (item, index) =>
      new TableRow({
        cantSplit: true,
        children: [
          cell(String(index + 1), widths[0], { align: AlignmentType.CENTER, shade: index % 2 ? LIGHT_BLUE : WHITE }),
          cell(formatIndoDate(`${item.date}T12:00:00+07:00`).replace(/^\w+,\s*/, ''), widths[1], { shade: index % 2 ? LIGHT_BLUE : WHITE }),
          cell(item.employee?.name || '-', widths[2], { shade: index % 2 ? LIGHT_BLUE : WHITE }),
          cell(item.employee?.employee_code || '-', widths[3], { align: AlignmentType.CENTER, shade: index % 2 ? LIGHT_BLUE : WHITE }),
          cell(item.employee ? getReportDepartment(item.employee.department) : '-', widths[4], { shade: index % 2 ? LIGHT_BLUE : WHITE }),
          cell(item.clock_in ? formatIndoTime(item.clock_in).replace(':00 WIB', ' WIB') : '-', widths[5], { align: AlignmentType.CENTER, shade: index % 2 ? LIGHT_BLUE : WHITE }),
          cell(item.clock_out ? formatIndoTime(item.clock_out).replace(':00 WIB', ' WIB') : '-', widths[6], { align: AlignmentType.CENTER, shade: index % 2 ? LIGHT_BLUE : WHITE }),
          cell(`${Number(item.work_hours || 0).toFixed(2)} jam`, widths[7], { align: AlignmentType.CENTER, shade: index % 2 ? LIGHT_BLUE : WHITE }),
        ],
      })
  );

  const summaryWidths = [550, 2100, 1200, 1200, 1200, 1200, 1300, 1600];
  const summaryHeaders = ['No.', 'Nama Karyawan', 'NIK', 'Hadir', 'Tepat Waktu', 'Terlambat', 'Jam Kerja', 'Capaian'];
  const summaryRows = quotas.map(
    (quota, index) =>
      new TableRow({
        cantSplit: true,
        children: [
          cell(String(index + 1), summaryWidths[0], { align: AlignmentType.CENTER, shade: index % 2 ? LIGHT_BLUE : WHITE }),
          cell(quota.employee.name, summaryWidths[1], { shade: index % 2 ? LIGHT_BLUE : WHITE }),
          cell(quota.employee.employee_code, summaryWidths[2], { align: AlignmentType.CENTER, shade: index % 2 ? LIGHT_BLUE : WHITE }),
          cell(String(quota.totalPresentDays), summaryWidths[3], { align: AlignmentType.CENTER, shade: index % 2 ? LIGHT_BLUE : WHITE }),
          cell(String(quota.onTimeDays), summaryWidths[4], { align: AlignmentType.CENTER, shade: index % 2 ? LIGHT_BLUE : WHITE }),
          cell(String(quota.lateDays), summaryWidths[5], { align: AlignmentType.CENTER, shade: index % 2 ? LIGHT_BLUE : WHITE }),
          cell(`${quota.totalWorkHours.toFixed(2)} jam`, summaryWidths[6], { align: AlignmentType.CENTER, shade: index % 2 ? LIGHT_BLUE : WHITE }),
          cell(quota.isTargetMet ? `Tercapai (+${quota.surplusDays})` : `Kurang ${quota.remainingDays} hari`, summaryWidths[7], {
            align: AlignmentType.CENTER,
            shade: index % 2 ? LIGHT_BLUE : WHITE,
          }),
        ],
      })
  );

  const headerRow = (labels: string[], columnWidths: number[]) =>
    new TableRow({
      tableHeader: true,
      children: labels.map((label, index) => cell(label, columnWidths[index], { header: true, align: AlignmentType.CENTER })),
    });

  const employeeDetailSections = quotas.flatMap((quota, employeeIndex) => {
    const employeeAttendances = sortedAttendances.filter(
      (attendance) => attendance.employee_id === quota.employee.id
    );
    const employeeRows = detailRows.filter((_, rowIndex) =>
      sortedAttendances[rowIndex].employee_id === quota.employee.id
    );

    return [
      new Paragraph({
        pageBreakBefore: employeeIndex > 0,
        spacing: { before: employeeIndex === 0 ? 220 : 0, after: 80 },
        children: [text(`DATA KEHADIRAN: ${quota.employee.name.toUpperCase()}`, true, NAVY, 22)],
      }),
      new Paragraph({
        spacing: { after: 120 },
        children: [
          text(
            `NIK: ${quota.employee.employee_code}  •  Departemen: ${getReportDepartment(quota.employee.department)}  •  Target: ${quota.targetDays} hari  •  Hadir: ${quota.totalPresentDays} hari`,
            false,
            '475569',
            17
          ),
        ],
      }),
      employeeAttendances.length > 0
        ? new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            layout: TableLayoutType.FIXED,
            borders,
            rows: [headerRow(headers, widths), ...employeeRows],
          })
        : new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 300 },
            children: [text('Belum ada catatan presensi karyawan ini pada periode tersebut.', false, '64748B', 20)],
          }),
    ];
  });

  const totalHours = quotas.reduce((sum, quota) => sum + quota.totalWorkHours, 0);
  const metTarget = quotas.filter((quota) => quota.isTargetMet).length;
  const document = new Document({
    creator: 'SafeMax Presence',
    title: `Rekap Presensi Bulanan ${period}`,
    description: `Rekap presensi bulanan SafeMax periode ${period}`,
    styles: {
      default: {
        document: { run: { font: FONT, size: 20, color: TEXT }, paragraph: { spacing: { after: 120, line: 276 } } },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { orientation: 'landscape', width: 16838, height: 11906 },
            margin: { top: 720, right: 650, bottom: 720, left: 650, header: 300, footer: 300 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [text('SAFEMAX PRESENCE  |  REKAP BULANAN', true, '64748B', 15)],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [text('Dokumen dibuat otomatis oleh SafeMax Presence  •  Halaman ', false, '64748B', 15), new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 15, color: '64748B' })],
              }),
            ],
          }),
        },
        children: [
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            layout: TableLayoutType.FIXED,
            borders: { ...borders, insideHorizontal: { style: BorderStyle.NONE, size: 0, color: WHITE }, insideVertical: { style: BorderStyle.NONE, size: 0, color: WHITE } },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 1600, type: WidthType.DXA },
                    verticalAlign: VerticalAlign.CENTER,
                    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ data: logo, transformation: { width: 68, height: 68 }, type: 'png' })] })],
                  }),
                  new TableCell({
                    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                    verticalAlign: VerticalAlign.CENTER,
                    children: [
                      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [text('REKAP PRESENSI BULANAN', true, NAVY, 30)] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 30 }, children: [text('SAFEMAX', true, TEXT, 24)] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [text(`Periode ${period}`, true, '475569', 20)] }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 1600, type: WidthType.DXA },
                    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                    children: [new Paragraph('')],
                  }),
                ],
              }),
            ],
          }),
          new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 14, color: NAVY, space: 1 } }, spacing: { after: 220 }, children: [] }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            layout: TableLayoutType.FIXED,
            borders,
            rows: [
              new TableRow({
                children: [
                  cell(`Total Karyawan\n${quotas.length}`, 2600, { align: AlignmentType.CENTER, shade: BLUE }),
                  cell(`Total Kehadiran\n${attendances.length} catatan`, 2600, { align: AlignmentType.CENTER, shade: BLUE }),
                  cell(`Target Tercapai\n${metTarget} karyawan`, 2600, { align: AlignmentType.CENTER, shade: BLUE }),
                  cell(`Total Jam Kerja\n${totalHours.toFixed(2)} jam`, 2600, { align: AlignmentType.CENTER, shade: BLUE }),
                ],
              }),
            ],
          }),
          new Paragraph({ spacing: { before: 220, after: 100 }, children: [text('RINGKASAN PER KARYAWAN', true, NAVY, 21)] }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            layout: TableLayoutType.FIXED,
            borders,
            rows: [headerRow(summaryHeaders, summaryWidths), ...summaryRows],
          }),
          ...employeeDetailSections,
          new Paragraph({ spacing: { before: 260, after: 20 }, children: [text(`Dicetak pada: ${formatIndoDate(`${getJakartaDateKey()}T12:00:00+07:00`)}`, false, '64748B', 16)] }),
          new Paragraph({ spacing: { after: 0 }, children: [text(`Dicetak oleh: ${generatedBy} (Administrator)`, false, '64748B', 16)] }),
        ],
      },
    ],
  });

  return Packer.toBlob(document);
}

export function getMonthlyAttendanceFilename(month: string): string {
  return `rekap-presensi-bulanan-safemax-${month}.docx`;
}