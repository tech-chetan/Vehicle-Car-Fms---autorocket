// utils/exportUtils.js

// Downloads rows as a CSV file (opens fine in Excel)
// columns: [{ label: 'Header', value: row => row.field }]
export const downloadCsv = (filename, columns, rows) => {
  const escape = (val) => {
    const s = val === undefined || val === null ? '' : String(val);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    columns.map(c => escape(c.label)).join(','),
    ...rows.map(row => columns.map(c => escape(c.value(row))).join(',')),
  ];
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const num = (val) => {
  const n = Number(String(val ?? '').replace(/[^0-9.-]+/g, ''));
  return isNaN(n) ? 0 : n;
};

export const inr = (val) => `₹${Math.round(num(val)).toLocaleString('en-IN')}`;

// Toll + parking + other expenses of a trip
export const tripExpense = (t) => num(t.tollAmount) + num(t.parkingAmount) + num(t.otherExpense);

export const fuelUnit = (fuelType) => (fuelType === 'Electric' ? 'kWh' : fuelType === 'CNG' ? 'Kg' : 'Litre');
