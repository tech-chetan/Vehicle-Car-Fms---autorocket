// pages/VehicleReports.jsx
// Fleet summary + complete vehicle-wise report (trips, fuel, repairs, challans, compliance)
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BarChart3, Search, Download, Printer, ArrowLeft, Gauge, Fuel, Wrench, AlertTriangle,
  IndianRupee, Route, Car, Shield, CreditCard, Clock, ChevronRight
} from 'lucide-react';
import {
  getCars, getTrips, getFuels, getDeliveries, getRepairs, getChallans, getInsurance,
  getFastags, getClaims, withMileage, vehicleAverage, checkHasEmi, onStoreUpdate
} from '../store/dataStore';
import { formatDate, today, parseAnyDate, daysUntil, calcEmiDetails } from '../utils/dateUtils';
import { downloadCsv, num, inr, tripExpense, fuelUnit } from '../utils/exportUtils';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import StatTile from '../components/ui/StatTile';

const pad = (n) => String(n).padStart(2, '0');
const isoOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toIso = (val) => {
  if (!val) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(val)) return String(val).slice(0, 10);
  const d = parseAnyDate(val);
  return d ? isoOf(d) : '';
};
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthLabel = (ym) => `${MONTHS[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;

const PERIODS = [
  { key: 'this_month', label: 'This Month' },
  { key: 'last_month', label: 'Last Month' },
  { key: 'last_3', label: 'Last 3 Months' },
  { key: 'this_year', label: 'This Year' },
  { key: 'all', label: 'All Time' },
  { key: 'custom', label: 'Custom' },
];

const periodRange = (key, customFrom, customTo) => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (key) {
    case 'this_month': return [isoOf(new Date(y, m, 1)), isoOf(new Date(y, m + 1, 0))];
    case 'last_month': return [isoOf(new Date(y, m - 1, 1)), isoOf(new Date(y, m, 0))];
    case 'last_3': return [isoOf(new Date(y, m - 2, 1)), isoOf(new Date(y, m + 1, 0))];
    case 'this_year': return [`${y}-01-01`, `${y}-12-31`];
    case 'custom': return [customFrom || '0000-01-01', customTo || '9999-12-31'];
    default: return ['0000-01-01', '9999-12-31'];
  }
};

// Collects every cost/usage record of one vehicle inside the date range
const buildVehicleReport = (car, data, [from, to]) => {
  const inRange = (d) => d && d >= from && d <= to;
  const vid = car.vehicleId;
  const sameCar = (r) => r.vehicleId === vid || (car.registrationNo && r.registrationNo === car.registrationNo);

  const trips = data.trips.filter(t => sameCar(t) && inRange(t.date));
  const doneTrips = trips.filter(t => t.status === 'Completed');
  const fuels = data.fuels.filter(f => sameCar(f) && inRange(f.date));
  const repairs = data.deliveries
    .filter(d => d.vehicleId === vid)
    .map(d => {
      const rep = data.repairs.find(r => r.repairNo === d.repairNo);
      return { ...d, date: toIso(d.dateVehicleReceived || d.actualDate3 || d.timestamp), reason: rep?.reasonForRepair || '', garageName: d.garageName || rep?.garageName || rep?.garage || '' };
    })
    .filter(d => inRange(d.date));
  const openRepairs = data.repairs.filter(r => r.vehicleId === vid && !['Delivered', 'Payment Completed'].includes(r.repairStatus));
  const challans = data.challans.filter(c => sameCar(c) && inRange(toIso(c.dateOfChallan)));
  const claims = data.claims.filter(c => c.vehicleId === vid);

  const km = doneTrips.reduce((s, t) => s + num(t.distance), 0);
  const fuelCost = fuels.reduce((s, f) => s + num(f.amount), 0);
  const fuelQty = fuels.reduce((s, f) => s + num(f.quantity), 0);
  const repairCost = repairs.reduce((s, r) => s + num(r.billAmount), 0);
  const insuranceRecovered = repairs.reduce((s, r) => s + (r.insuranceClaimed === 'Yes' ? num(r.insuranceAmount) : 0), 0);
  const challanAmount = challans.reduce((s, c) => s + num(c.challanAmount), 0);
  const challanPending = challans.filter(c => c.paymentStatus === 'Pending').reduce((s, c) => s + num(c.challanAmount), 0);
  const tripCost = trips.reduce((s, t) => s + tripExpense(t), 0);
  const billable = trips.reduce((s, t) => s + num(t.billableAmount), 0);
  const totalCost = fuelCost + repairCost + challanAmount + tripCost;

  const insurance = data.insurance.filter(i => i.vehicleId === vid).sort((a, b) => toIso(b.odEndDate || b.validityDate).localeCompare(toIso(a.odEndDate || a.validityDate)))[0] || null;
  const insuranceEnd = insurance ? (insurance.odEndDate || insurance.validityDate || insurance.tpEndDate) : '';
  const fastag = data.fastags.find(f => sameCar(f)) || null;
  const hasEmi = checkHasEmi(car);
  const emi = hasEmi ? calcEmiDetails(car) : null;

  return {
    car, trips, doneTrips, fuels, repairs, openRepairs, challans, claims,
    km, fuelCost, fuelQty, repairCost, insuranceRecovered, challanAmount, challanPending, tripCost, billable, totalCost,
    // Proper average: total run KM between fills ÷ total quantity filled
    avgMileage: vehicleAverage(fuels),
    fuelRunKm: fuels.reduce((s, f) => s + (f.runKm || 0), 0),
    costPerKm: km > 0 ? totalCost / km : null,
    insurance, insuranceEnd, insuranceDays: insuranceEnd ? daysUntil(insuranceEnd) : null,
    fastag, hasEmi, emi,
  };
};

const SectionCard = ({ title, icon: Icon, children, right }) => (
  <div className="section-card print-break" style={{ marginBottom: 20, padding: 0, overflow: 'hidden' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #e2f0e7' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, color: '#0f172a', fontSize: 14.5 }}>
        {Icon && <Icon size={17} style={{ color: '#059669' }} />} {title}
      </div>
      {right}
    </div>
    <div style={{ overflowX: 'auto' }}>{children}</div>
  </div>
);

const NoRows = ({ text }) => <div style={{ padding: '22px 20px', fontSize: 13, color: '#94a3b8' }}>{text}</div>;

const daysBadge = (days, label = 'days') => {
  if (days === null || days === undefined) return <Badge label="Not Available" variant="gray" />;
  if (days < 0) return <Badge label={`Expired ${Math.abs(days)} ${label} ago`} variant="danger" />;
  if (days <= 30) return <Badge label={`${days} ${label} left`} variant="warning" />;
  return <Badge label={`${days} ${label} left`} variant="success" />;
};

// ─── DETAILED VEHICLE REPORT ──────────────────────────────────────────────────
const VehicleDetail = ({ report, periodLabel, range, onBack }) => {
  const { car } = report;
  const lowAvg = (f) => f.mileage && report.avgMileage && f.mileage < report.avgMileage * 0.85;

  const monthly = useMemo(() => {
    const rows = {};
    const row = (ym) => (rows[ym] = rows[ym] || { ym, km: 0, trips: 0, fuel: 0, fuelQty: 0, repair: 0, challan: 0, tripExp: 0 });
    report.doneTrips.forEach(t => { const r = row(t.date.slice(0, 7)); r.km += num(t.distance); r.trips += 1; });
    report.trips.forEach(t => { row(t.date.slice(0, 7)).tripExp += tripExpense(t); });
    report.fuels.forEach(f => { const r = row(f.date.slice(0, 7)); r.fuel += num(f.amount); r.fuelQty += num(f.quantity); });
    report.repairs.forEach(d => { row(d.date.slice(0, 7)).repair += num(d.billAmount); });
    report.challans.forEach(c => { row(toIso(c.dateOfChallan).slice(0, 7)).challan += num(c.challanAmount); });
    return Object.values(rows)
      .map(r => ({ ...r, total: r.fuel + r.repair + r.challan + r.tripExp }))
      .sort((a, b) => b.ym.localeCompare(a.ym));
  }, [report]);

  const exportLedger = () => {
    const ledger = [
      ...report.trips.map(t => ({ date: t.date, type: 'Trip', ref: t.tripNo, desc: `${t.fromLocation || ''} → ${t.toLocation} (${t.purpose || ''}) [${t.status}]`, km: t.distance, qty: '', amount: tripExpense(t) })),
      ...report.fuels.map(f => ({ date: f.date, type: 'Fuel', ref: f.fuelNo, desc: `${f.fuelType} @ ₹${f.rate} – ${f.pumpName || ''}`, km: f.odometer, qty: `${f.quantity} ${f.unit || fuelUnit(f.fuelType)}`, amount: num(f.amount) })),
      ...report.repairs.map(d => ({ date: d.date, type: 'Repair', ref: d.repairNo, desc: `${d.reason || d.repairWorkDone || ''} – ${d.garageName}`, km: d.kmAtTimeOfRepair, qty: '', amount: num(d.billAmount) })),
      ...report.challans.map(c => ({ date: toIso(c.dateOfChallan), type: 'Challan', ref: c.challanNo, desc: `${c.reasonOfChallan} [${c.paymentStatus}]`, km: '', qty: '', amount: num(c.challanAmount) })),
    ].sort((a, b) => a.date.localeCompare(b.date));
    downloadCsv(`Vehicle_Report_${car.registrationNo}_${today()}`, [
      { label: 'Date', value: r => r.date },
      { label: 'Type', value: r => r.type },
      { label: 'Reference', value: r => r.ref },
      { label: 'Description', value: r => r.desc },
      { label: 'KM / Odometer', value: r => r.km },
      { label: 'Quantity', value: r => r.qty },
      { label: 'Amount (₹)', value: r => r.amount },
    ], ledger);
  };

  const info = [
    ['Vehicle ID', car.vehicleId], ['Registration No', car.registrationNo], ['Model', car.modelNo],
    ['Fuel Type', car.fuelType], ['Firm', car.firmName], ['Owner', car.nameOfOwner],
    ['Date of Purchase', formatDate(car.dateOfPurchase)], ['Value of Car', car.valueOfCar && inr(car.valueOfCar)], ['Driver / Service Person', car.servicePersonName],
    ['Chassis No', car.chassisNo], ['Engine No', car.engineNo], ['Pollution Date', formatDate(car.pollutionDate)],
  ];

  return (
    <div>
      <div className="page-header no-print" style={{ marginBottom: 16 }}>
        <button className="btn btn-outline" onClick={onBack}><ArrowLeft size={15} /> All Vehicles</button>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline" onClick={exportLedger}><Download size={15} /> Export Ledger</button>
          <button className="btn btn-primary" onClick={() => window.print()}><Printer size={15} /> Print Report</button>
        </div>
      </div>

      {/* Vehicle header */}
      <div className="section-card print-break" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
              <Car size={26} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a' }}>{car.registrationNo}</div>
              <div style={{ fontSize: 14, color: '#475569', fontWeight: 600 }}>{car.carName} {car.modelNo ? `· ${car.modelNo}` : ''}</div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Report Period</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{periodLabel}</div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>{range[0].startsWith('0000') ? 'All records' : `${formatDate(range[0])} – ${formatDate(range[1])}`}</div>
          </div>
        </div>
        <div className="detail-grid">
          {info.map(([label, value]) => (
            <div className="detail-item" key={label}><label>{label}</label><div className="value">{value || '—'}</div></div>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14, marginBottom: 20 }}>
        <StatTile label="Distance" value={`${report.km.toLocaleString('en-IN')} km`} sub={`${report.doneTrips.length} completed trips`} icon={Gauge} color="#0284c7" bg="#e0f2fe" />
        <StatTile label="Fuel Cost" value={inr(report.fuelCost)} sub={`${report.fuelQty.toLocaleString('en-IN', { maximumFractionDigits: 1 })} ${fuelUnit(car.fuelType)} · ${report.fuels.length} fills`} icon={Fuel} color="#ea580c" bg="#fff7ed" />
        <StatTile label="Vehicle Average" value={report.avgMileage ? `${report.avgMileage}` : '—'} sub={`km per ${fuelUnit(car.fuelType)} · ${report.fuelRunKm.toLocaleString('en-IN')} km run`} icon={Gauge} color="#059669" bg="#ecfdf5" />
        <StatTile label="Repair Cost" value={inr(report.repairCost)} sub={`${report.repairs.length} repairs${report.insuranceRecovered ? ` · ${inr(report.insuranceRecovered)} via insurance` : ''}`} icon={Wrench} color="#7c3aed" bg="#f3e8ff" />
        <StatTile label="Challans" value={inr(report.challanAmount)} sub={`${report.challans.length} challans · ${inr(report.challanPending)} pending`} icon={AlertTriangle} color="#dc2626" bg="#fef2f2" />
        <StatTile label="Total Running Cost" value={inr(report.totalCost)} sub={report.costPerKm ? `₹${report.costPerKm.toFixed(2)} per km` : 'Fuel + repair + challan + trip exp.'} icon={IndianRupee} color="#0f172a" bg="#f1f5f9" />
      </div>

      {/* Compliance */}
      <SectionCard title="Compliance & Finance Status" icon={Shield}>
        <table className="data-table">
          <thead><tr><th>Item</th><th>Details</th><th>Valid Till / Next Date</th><th>Status</th></tr></thead>
          <tbody>
            <tr>
              <td style={{ fontWeight: 700 }}>Insurance</td>
              <td>{report.insurance ? `${report.insurance.nameOfCompany} · Premium ${inr(report.insurance.totalPremiumAmount)} · IDV ${inr(report.insurance.idvValue)}` : 'No insurance record'}</td>
              <td>{formatDate(report.insuranceEnd)}</td>
              <td>{daysBadge(report.insuranceDays)}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 700 }}>Fastag</td>
              <td>{report.fastag ? `${report.fastag.bankName} · Balance ${inr(report.fastag.balance)}` : 'Fastag not added'}</td>
              <td>{report.fastag ? formatDate(report.fastag.expiryDate) : '—'}</td>
              <td>
                {!report.fastag ? <Badge label="Missing" variant="danger" />
                  : report.fastag.fastagStatus !== 'Active' ? <Badge label={report.fastag.fastagStatus} variant="danger" />
                    : num(report.fastag.balance) < num(report.fastag.lowBalanceLimit || 200) ? <Badge label="Low Balance" variant="warning" />
                      : <Badge label="Active" variant="success" />}
              </td>
            </tr>
            <tr>
              <td style={{ fontWeight: 700 }}>EMI / Loan</td>
              <td>{report.emi ? `${car.hypothecationBank} · EMI ${inr(report.emi.emiAmount)} · ${report.emi.paidEmis}/${report.emi.totalEmis} paid · Balance ${inr(report.emi.remainingAmount)}` : 'No active loan'}</td>
              <td>{report.emi?.nextEmiDate ? formatDate(report.emi.nextEmiDate) : '—'}</td>
              <td>
                {!report.emi ? <Badge label="No EMI" variant="gray" />
                  : report.emi.isCompleted ? <Badge label="Loan Closed" variant="success" />
                    : report.emi.isDueSoon ? <Badge label={`Due in ${report.emi.daysUntilNextEmi} days`} variant="warning" />
                      : <Badge label="On Track" variant="success" />}
              </td>
            </tr>
            <tr>
              <td style={{ fontWeight: 700 }}>Open Repairs / Claims</td>
              <td>{report.openRepairs.length} repair(s) in workshop · {report.claims.filter(c => c.claimStatus !== 'Settled').length} open claim(s)</td>
              <td>—</td>
              <td>{report.openRepairs.length ? <Badge label={report.openRepairs[0].repairStatus} variant="warning" /> : <Badge label="Clear" variant="success" />}</td>
            </tr>
          </tbody>
        </table>
      </SectionCard>

      {/* Monthly breakdown */}
      <SectionCard title="Month-wise Breakdown" icon={BarChart3}>
        {monthly.length === 0 ? <NoRows text="No records in this period." /> : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Month</th><th style={{ textAlign: 'right' }}>Trips</th><th style={{ textAlign: 'right' }}>KM</th>
                <th style={{ textAlign: 'right' }}>Fuel Qty</th><th style={{ textAlign: 'right' }}>Fuel ₹</th><th style={{ textAlign: 'right' }}>Repair ₹</th>
                <th style={{ textAlign: 'right' }}>Challan ₹</th><th style={{ textAlign: 'right' }}>Trip Exp ₹</th><th style={{ textAlign: 'right' }}>Total ₹</th><th style={{ textAlign: 'right' }}>₹ / km</th>
              </tr>
            </thead>
            <tbody>
              {monthly.map(m => (
                <tr key={m.ym}>
                  <td style={{ fontWeight: 700 }}>{monthLabel(m.ym)}</td>
                  <td style={{ textAlign: 'right' }}>{m.trips}</td>
                  <td style={{ textAlign: 'right' }}>{m.km.toLocaleString('en-IN')}</td>
                  <td style={{ textAlign: 'right' }}>{m.fuelQty ? m.fuelQty.toLocaleString('en-IN', { maximumFractionDigits: 1 }) : '—'}</td>
                  <td style={{ textAlign: 'right' }}>{inr(m.fuel)}</td>
                  <td style={{ textAlign: 'right' }}>{inr(m.repair)}</td>
                  <td style={{ textAlign: 'right' }}>{inr(m.challan)}</td>
                  <td style={{ textAlign: 'right' }}>{inr(m.tripExp)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 800 }}>{inr(m.total)}</td>
                  <td style={{ textAlign: 'right' }}>{m.km ? `₹${(m.total / m.km).toFixed(2)}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>

      {/* Trips */}
      <SectionCard title={`Trips (${report.trips.length})`} icon={Route} right={<span style={{ fontSize: 12.5, color: '#64748b', fontWeight: 600 }}>{report.km.toLocaleString('en-IN')} km · {inr(report.tripCost)} expense{report.billable ? ` · ${inr(report.billable)} billable` : ''}</span>}>
        {report.trips.length === 0 ? <NoRows text="No trips in this period." /> : (
          <table className="data-table">
            <thead><tr><th>Trip No</th><th>Date</th><th>Driver</th><th>Route</th><th>Purpose</th><th style={{ textAlign: 'right' }}>Start KM</th><th style={{ textAlign: 'right' }}>End KM</th><th style={{ textAlign: 'right' }}>KM</th><th style={{ textAlign: 'right' }}>Expense</th><th>Status</th></tr></thead>
            <tbody>
              {[...report.trips].sort((a, b) => b.date.localeCompare(a.date)).map(t => (
                <tr key={t.id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{t.tripNo}</td>
                  <td>{formatDate(t.date)}</td>
                  <td>{t.driverName || '—'}</td>
                  <td>{t.fromLocation || '—'} → {t.toLocation}</td>
                  <td>{t.purpose}</td>
                  <td style={{ textAlign: 'right' }}>{t.startKm || '—'}</td>
                  <td style={{ textAlign: 'right' }}>{t.endKm || '—'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{t.distance || '—'}</td>
                  <td style={{ textAlign: 'right' }}>{tripExpense(t) ? inr(tripExpense(t)) : '—'}</td>
                  <td>{t.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>

      {/* Fuel */}
      <SectionCard title={`Fuel Entries & Average (${report.fuels.length})`} icon={Fuel} right={<span style={{ fontSize: 12.5, color: '#64748b', fontWeight: 600 }}>{inr(report.fuelCost)} · Avg {report.avgMileage ?? '—'} km/{fuelUnit(car.fuelType)} ({report.fuelRunKm.toLocaleString('en-IN')} km ÷ {report.fuelQty.toLocaleString('en-IN', { maximumFractionDigits: 1 })} {fuelUnit(car.fuelType)})</span>}>
        {report.fuels.length === 0 ? <NoRows text="No fuel entries in this period." /> : (
          <table className="data-table">
            <thead><tr><th>Entry / Slip</th><th>Date</th><th style={{ textAlign: 'right' }}>Qty</th><th style={{ textAlign: 'right' }}>Rate</th><th style={{ textAlign: 'right' }}>Amount</th><th style={{ textAlign: 'right' }}>Last KM</th><th style={{ textAlign: 'right' }}>Current KM</th><th style={{ textAlign: 'right' }}>Run KM</th><th style={{ textAlign: 'right' }}>Average</th><th>Location</th><th>Issued To</th></tr></thead>
            <tbody>
              {[...report.fuels].sort((a, b) => b.date.localeCompare(a.date)).map(f => (
                <tr key={f.id}>
                  <td><div style={{ fontFamily: 'monospace', fontWeight: 700 }}>{f.fuelNo}</div><div style={{ fontSize: 11, color: '#94a3b8' }}>{f.slipNo ? `Slip ${f.slipNo}` : 'Direct'}</div></td>
                  <td>{formatDate(f.date)}</td>
                  <td style={{ textAlign: 'right' }}>{f.quantity} {f.unit || fuelUnit(f.fuelType)}</td>
                  <td style={{ textAlign: 'right' }}>₹{f.rate}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{inr(f.amount)}</td>
                  <td style={{ textAlign: 'right' }}>{f.lastKm || '—'}</td>
                  <td style={{ textAlign: 'right' }}>{f.odometer || '—'}</td>
                  <td style={{ textAlign: 'right' }}>{f.runKm ?? '—'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 800, color: lowAvg(f) ? '#dc2626' : '#059669' }} title={lowAvg(f) ? 'More than 15% below vehicle average' : ''}>{f.mileage ?? '—'}{lowAvg(f) ? ' ⚠' : ''}</td>
                  <td>{f.pumpName || '—'}</td>
                  <td>{f.filledBy || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>

      {/* Repairs */}
      <SectionCard title={`Repairs & Service (${report.repairs.length})`} icon={Wrench} right={<span style={{ fontSize: 12.5, color: '#64748b', fontWeight: 600 }}>{inr(report.repairCost)}</span>}>
        {report.repairs.length === 0 ? <NoRows text="No completed repairs in this period." /> : (
          <table className="data-table">
            <thead><tr><th>Repair No</th><th>Received On</th><th>Garage</th><th>Work Done</th><th style={{ textAlign: 'right' }}>KM</th><th style={{ textAlign: 'right' }}>Parts</th><th style={{ textAlign: 'right' }}>Service</th><th style={{ textAlign: 'right' }}>Bill</th><th>Insurance</th></tr></thead>
            <tbody>
              {report.repairs.map(d => (
                <tr key={d.repairNo}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{d.repairNo}</td>
                  <td>{formatDate(d.date)}</td>
                  <td>{d.garageName || '—'}</td>
                  <td style={{ maxWidth: 280 }}>{d.repairWorkDone || d.reason || '—'}</td>
                  <td style={{ textAlign: 'right' }}>{d.kmAtTimeOfRepair || '—'}</td>
                  <td style={{ textAlign: 'right' }}>{inr(d.partsAmount)}</td>
                  <td style={{ textAlign: 'right' }}>{inr(d.serviceAmount)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{inr(d.billAmount)}</td>
                  <td>{d.insuranceClaimed === 'Yes' ? `Yes (${inr(d.insuranceAmount)})` : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>

      {/* Challans */}
      <SectionCard title={`Challans (${report.challans.length})`} icon={AlertTriangle} right={<span style={{ fontSize: 12.5, color: '#64748b', fontWeight: 600 }}>{inr(report.challanAmount)} · {inr(report.challanPending)} pending</span>}>
        {report.challans.length === 0 ? <NoRows text="No challans in this period." /> : (
          <table className="data-table">
            <thead><tr><th>Challan No</th><th>Date</th><th>Reason</th><th>Driver</th><th>Location</th><th style={{ textAlign: 'right' }}>Amount</th><th>Status</th></tr></thead>
            <tbody>
              {report.challans.map(c => (
                <tr key={c.id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{c.challanNo}</td>
                  <td>{formatDate(c.dateOfChallan)}</td>
                  <td>{c.reasonOfChallan}</td>
                  <td>{c.driverName || '—'}</td>
                  <td>{c.location || '—'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{inr(c.challanAmount)}</td>
                  <td><Badge label={c.paymentStatus} variant={c.paymentStatus === 'Paid' ? 'success' : 'danger'} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>
    </div>
  );
};

// ─── PAGE ─────────────────────────────────────────────────────────────────────
const VehicleReports = () => {
  const [data, setData] = useState(null);
  const [period, setPeriod] = useState('this_month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [firm, setFirm] = useState('');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  const load = useCallback(async () => {
    const [cars, trips, fuels, deliveries, repairs, challans, insurance, fastags, claims] = await Promise.all([
      getCars(), getTrips(), getFuels(), getDeliveries(), getRepairs(), getChallans(), getInsurance(), getFastags(), getClaims(),
    ]);
    setData({ cars, trips, fuels: withMileage(fuels), deliveries, repairs, challans, insurance, fastags, claims });
  }, []);

  useEffect(() => {
    load();
    return onStoreUpdate(load);
  }, [load]);

  const range = useMemo(() => periodRange(period, customFrom, customTo), [period, customFrom, customTo]);
  const periodLabel = PERIODS.find(p => p.key === period)?.label || '';

  const reports = useMemo(() => {
    if (!data) return [];
    return data.cars.map(car => buildVehicleReport(car, data, range));
  }, [data, range]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return reports
      .filter(r => !firm || r.car.firmName === firm)
      .filter(r => !q || [r.car.registrationNo, r.car.carName, r.car.vehicleId, r.car.servicePersonName].some(v => String(v || '').toLowerCase().includes(q)))
      .sort((a, b) => b.totalCost - a.totalCost);
  }, [reports, firm, search]);

  const totals = useMemo(() => visible.reduce((t, r) => ({
    km: t.km + r.km, trips: t.trips + r.doneTrips.length, fuel: t.fuel + r.fuelCost, repair: t.repair + r.repairCost,
    challan: t.challan + r.challanAmount, tripExp: t.tripExp + r.tripCost, total: t.total + r.totalCost,
  }), { km: 0, trips: 0, fuel: 0, repair: 0, challan: 0, tripExp: 0, total: 0 }), [visible]);

  const alerts = useMemo(() => reports.filter(r =>
    (r.insuranceDays !== null && r.insuranceDays <= 30) || r.challanPending > 0 || r.emi?.isDueSoon || !r.fastag
  ), [reports]);

  const firms = data ? [...new Set(data.cars.map(c => c.firmName).filter(Boolean))] : [];
  const selected = selectedId ? reports.find(r => r.car.vehicleId === selectedId) : null;

  if (!data) return null;

  if (selected) {
    return (
      <div>
        <PeriodBar {...{ period, setPeriod, customFrom, setCustomFrom, customTo, setCustomTo }} />
        <VehicleDetail report={selected} periodLabel={periodLabel} range={range} onBack={() => setSelectedId(null)} />
      </div>
    );
  }

  const exportSummary = () => {
    downloadCsv(`Vehicle_Summary_${periodLabel.replace(/\s+/g, '_')}_${today()}`, [
      { label: 'Vehicle ID', value: r => r.car.vehicleId },
      { label: 'Registration No', value: r => r.car.registrationNo },
      { label: 'Car', value: r => r.car.carName },
      { label: 'Firm', value: r => r.car.firmName },
      { label: 'Fuel Type', value: r => r.car.fuelType },
      { label: 'Completed Trips', value: r => r.doneTrips.length },
      { label: 'KM', value: r => r.km },
      { label: 'Fuel Qty', value: r => Math.round(r.fuelQty * 100) / 100 },
      { label: 'Fuel Cost', value: r => r.fuelCost },
      { label: 'Average (km per unit)', value: r => r.avgMileage ?? '' },
      { label: 'Repairs', value: r => r.repairs.length },
      { label: 'Repair Cost', value: r => r.repairCost },
      { label: 'Challans', value: r => r.challans.length },
      { label: 'Challan Amount', value: r => r.challanAmount },
      { label: 'Challan Pending', value: r => r.challanPending },
      { label: 'Trip Expense', value: r => r.tripCost },
      { label: 'Total Running Cost', value: r => r.totalCost },
      { label: 'Cost per KM', value: r => (r.costPerKm ? r.costPerKm.toFixed(2) : '') },
      { label: 'Insurance Valid Till', value: r => toIso(r.insuranceEnd) },
      { label: 'Monthly EMI', value: r => r.emi?.emiAmount || '' },
      { label: 'Loan Balance', value: r => r.emi?.remainingAmount || '' },
    ], visible);
  };

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 16 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 36, height: 36, borderRadius: 10, background: '#ecfdf5', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
              <BarChart3 size={20} />
            </span>
            Vehicle Reports
          </h1>
          <p className="page-subtitle">Vehicle-wise usage and running cost — trips, fuel, repairs, challans, insurance, EMI & Fastag</p>
        </div>
        <div className="no-print" style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline" onClick={exportSummary}><Download size={15} /> Export Summary</button>
          <button className="btn btn-primary" onClick={() => window.print()}><Printer size={15} /> Print</button>
        </div>
      </div>

      <PeriodBar {...{ period, setPeriod, customFrom, setCustomFrom, customTo, setCustomTo }} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14, marginBottom: 20 }}>
        <StatTile label="Fleet Distance" value={`${totals.km.toLocaleString('en-IN')} km`} sub={`${totals.trips} completed trips`} icon={Gauge} color="#0284c7" bg="#e0f2fe" />
        <StatTile label="Fuel Cost" value={inr(totals.fuel)} icon={Fuel} color="#ea580c" bg="#fff7ed" />
        <StatTile label="Repair Cost" value={inr(totals.repair)} icon={Wrench} color="#7c3aed" bg="#f3e8ff" />
        <StatTile label="Challans" value={inr(totals.challan)} icon={AlertTriangle} color="#dc2626" bg="#fef2f2" />
        <StatTile label="Total Running Cost" value={inr(totals.total)} sub={totals.km ? `₹${(totals.total / totals.km).toFixed(2)} per km` : `Trip exp. ${inr(totals.tripExp)}`} icon={IndianRupee} color="#0f172a" bg="#f1f5f9" />
      </div>

      {alerts.length > 0 && (
        <div className="section-card no-print" style={{ marginBottom: 20, padding: '14px 18px', borderColor: '#fde68a', background: '#fffbeb' }}>
          <div style={{ fontWeight: 800, color: '#92400e', fontSize: 13.5, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clock size={15} /> Attention needed ({alerts.length} vehicles)
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {alerts.map(r => (
              <button key={r.car.vehicleId} onClick={() => setSelectedId(r.car.vehicleId)} style={{ border: '1px solid #fde68a', background: '#fff', borderRadius: 10, padding: '6px 10px', fontSize: 12, cursor: 'pointer', textAlign: 'left' }}>
                <strong>{r.car.registrationNo}</strong>{' '}
                <span style={{ color: '#92400e' }}>
                  {[
                    r.insuranceDays !== null && r.insuranceDays <= 30 && (r.insuranceDays < 0 ? 'Insurance expired' : `Insurance in ${r.insuranceDays}d`),
                    r.challanPending > 0 && `Challan ${inr(r.challanPending)} pending`,
                    r.emi?.isDueSoon && `EMI in ${r.emi.daysUntilNextEmi}d`,
                    !r.fastag && 'No Fastag',
                  ].filter(Boolean).join(' · ')}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="data-table-container">
        <div className="filter-bar no-print" style={{ flexWrap: 'wrap' }}>
          <div className="search-wrapper">
            <Search size={14} className="search-icon" />
            <input className="search-input" placeholder="Search vehicle, reg no, driver..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-select" style={{ width: 'auto', minWidth: 200 }} value={firm} onChange={e => setFirm(e.target.value)}>
            <option value="">All Firms</option>
            {firms.map(f => <option key={f}>{f}</option>)}
          </select>
          <span style={{ marginLeft: 'auto', fontSize: 12.5, color: '#64748b', fontWeight: 600 }}>Click a vehicle for its complete report</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          {visible.length === 0 ? <EmptyState icon={Car} title="No vehicles found" /> : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th style={{ textAlign: 'right' }}>Trips</th>
                  <th style={{ textAlign: 'right' }}>KM</th>
                  <th style={{ textAlign: 'right' }}>Fuel ₹</th>
                  <th style={{ textAlign: 'right' }}>Average (km/L)</th>
                  <th style={{ textAlign: 'right' }}>Repair ₹</th>
                  <th style={{ textAlign: 'right' }}>Challan ₹</th>
                  <th style={{ textAlign: 'right' }}>Trip Exp ₹</th>
                  <th style={{ textAlign: 'right' }}>Total ₹</th>
                  <th style={{ textAlign: 'right' }}>₹ / km</th>
                  <th>Insurance</th>
                  <th>EMI</th>
                  <th className="no-print"></th>
                </tr>
              </thead>
              <tbody>
                {visible.map(r => (
                  <tr key={r.car.vehicleId} onClick={() => setSelectedId(r.car.vehicleId)} style={{ cursor: 'pointer' }}>
                    <td><div style={{ fontWeight: 800 }}>{r.car.registrationNo}</div><div style={{ fontSize: 11.5, color: '#64748b' }}>{r.car.carName} · {r.car.fuelType}</div></td>
                    <td style={{ textAlign: 'right' }}>{r.doneTrips.length}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{r.km.toLocaleString('en-IN')}</td>
                    <td style={{ textAlign: 'right' }}>{inr(r.fuelCost)}</td>
                    <td style={{ textAlign: 'right' }}>{r.avgMileage ?? '—'}</td>
                    <td style={{ textAlign: 'right' }}>{inr(r.repairCost)}</td>
                    <td style={{ textAlign: 'right', color: r.challanPending ? '#dc2626' : undefined }}>{inr(r.challanAmount)}</td>
                    <td style={{ textAlign: 'right' }}>{inr(r.tripCost)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 800 }}>{inr(r.totalCost)}</td>
                    <td style={{ textAlign: 'right' }}>{r.costPerKm ? `₹${r.costPerKm.toFixed(2)}` : '—'}</td>
                    <td>{daysBadge(r.insuranceDays, 'd')}</td>
                    <td>{r.emi ? <span style={{ fontSize: 12.5, fontWeight: 600 }}><CreditCard size={12} style={{ verticalAlign: -1 }} /> {inr(r.emi.emiAmount)}</span> : <span style={{ color: '#94a3b8' }}>—</span>}</td>
                    <td className="no-print" style={{ color: '#94a3b8' }}><ChevronRight size={16} /></td>
                  </tr>
                ))}
                <tr style={{ background: '#f8fafc' }}>
                  <td style={{ fontWeight: 800 }}>Total ({visible.length})</td>
                  <td style={{ textAlign: 'right', fontWeight: 800 }}>{totals.trips}</td>
                  <td style={{ textAlign: 'right', fontWeight: 800 }}>{totals.km.toLocaleString('en-IN')}</td>
                  <td style={{ textAlign: 'right', fontWeight: 800 }}>{inr(totals.fuel)}</td>
                  <td></td>
                  <td style={{ textAlign: 'right', fontWeight: 800 }}>{inr(totals.repair)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 800 }}>{inr(totals.challan)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 800 }}>{inr(totals.tripExp)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 800 }}>{inr(totals.total)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 800 }}>{totals.km ? `₹${(totals.total / totals.km).toFixed(2)}` : '—'}</td>
                  <td colSpan={3}></td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

const PeriodBar = ({ period, setPeriod, customFrom, setCustomFrom, customTo, setCustomTo }) => (
  <div className="no-print" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 18 }}>
    {PERIODS.map(p => (
      <button key={p.key} className={`btn btn-sm ${period === p.key ? 'btn-primary' : 'btn-outline'}`} onClick={() => setPeriod(p.key)}>{p.label}</button>
    ))}
    {period === 'custom' && (
      <>
        <input type="date" className="form-input" style={{ width: 'auto', padding: '6px 10px' }} value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
        <span style={{ color: '#94a3b8' }}>to</span>
        <input type="date" className="form-input" style={{ width: 'auto', padding: '6px 10px' }} value={customTo} onChange={e => setCustomTo(e.target.value)} />
      </>
    )}
  </div>
);

export default VehicleReports;
