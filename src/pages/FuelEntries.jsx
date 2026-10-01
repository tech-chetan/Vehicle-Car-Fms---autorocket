// pages/FuelEntries.jsx
// Fuel workflow: 1) Fuel Request → slip issued  2) Slip filled (fuel entry) or marked Not Filled
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Fuel, Plus, Search, X, Edit2, Trash2, Eye, Download, IndianRupee, Droplets, Gauge, FileText,
  Printer, Ticket, CheckCircle2, XCircle, Clock
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getCars, getTrips, getFuels, addFuel, updateFuel, deleteFuel, getLastOdometer, withMileage, vehicleAverage,
  getFuelSlips, addFuelSlip, fillFuelSlip, markSlipNotFilled, deleteFuelSlip, getFillingLocations, onStoreUpdate
} from '../store/dataStore';
import { formatDate, formatDateTime, today } from '../utils/dateUtils';
import { downloadCsv, num, inr, fuelUnit } from '../utils/exportUtils';
import { openDocument } from '../utils/fileUtils';
import { useAuth, PAGE_KEYS } from '../context/AuthContext';
import { ITEMS_PER_PAGE } from '../constants';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import Pagination from '../components/ui/Pagination';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import FileUpload from '../components/ui/FileUpload';
import StatTile from '../components/ui/StatTile';
import ReadOnlyNotice from '../components/shared/ReadOnlyNotice';

const PAYMENT_MODES = ['Fuel Card', 'Company Account', 'UPI', 'Card', 'Cash'];
const DEFAULT_RATES = { Petrol: 94.7, Diesel: 87.6, CNG: 76.5, Electric: 18, Hybrid: 94.7, LPG: 60 };
const SLIP_VARIANT = { Pending: 'warning', Filled: 'success', 'Not Filled': 'danger' };
const fileUrl = (v) => (v && typeof v === 'object' ? v.url : v) || '';
const vehicleLabel = (car) => `${car.registrationNo} (${car.vehicleType || 'Car'})`;

// Latest rate used for a fuel type, else a default
const lastRate = (fuels, fuelType) => {
  const prev = [...fuels].filter(f => f.fuelType === fuelType && num(f.rate)).sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
  return prev ? String(prev.rate) : String(DEFAULT_RATES[fuelType] || '');
};

// Driver → vehicles they normally use (assigned car first, then from slips / trips history)
const buildDriverMap = (cars, slips, trips) => {
  const map = {};
  const add = (name, vehicleId) => {
    const key = String(name || '').trim();
    if (!key || !vehicleId) return;
    map[key] = map[key] || [];
    if (!map[key].includes(vehicleId)) map[key].push(vehicleId);
  };
  cars.forEach(c => add(c.servicePersonName, c.vehicleId));
  [...slips].reverse().forEach(sl => add(sl.issuedTo, sl.vehicleId));
  [...trips].reverse().forEach(t => add(t.driverName, t.vehicleId));
  return map;
};

// ─── PRINTABLE SLIP ───────────────────────────────────────────────────────────
const printSlip = (slip) => {
  const w = window.open('', '_blank', 'width=520,height=720');
  if (!w) return toast.error('Allow pop-ups to print the slip');
  const row = (label, value) => `<tr><th>${label}</th><td>${value || '—'}</td></tr>`;
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Fuel Slip ${slip.slipNo}</title>
    <style>
      body{font-family:Arial,Helvetica,sans-serif;margin:24px;color:#0f172a}
      table{width:100%;border-collapse:collapse;border:2px solid #0f172a}
      th,td{border:1px solid #0f172a;padding:9px 10px;font-size:14px;text-align:left}
      th{width:42%;background:#f8fafc}
      td{text-align:center;font-weight:600}
      .head{text-align:center;padding:14px 10px;border:2px solid #0f172a;border-bottom:none}
      .head img{width:56px;height:56px}
      .firm{font-size:16px;font-weight:800;margin-top:6px;letter-spacing:.3px}
      .title{font-size:12px;color:#475569;margin-top:2px}
      .sign{height:110px;border:2px solid #0f172a;border-top:none;text-align:center;font-weight:700;padding-top:10px;font-size:14px}
      @media print{body{margin:0}}
    </style></head><body>
    <div class="head"><img src="${window.location.origin}/vehicle-app-logo.svg" alt=""><div class="firm">${(slip.firmName || 'Vehicle App').toUpperCase()}</div><div class="title">FUEL SLIP</div></div>
    <table>
      ${row('Slip No.', slip.slipNo)}
      ${row('Vehicle No.', `${slip.registrationNo} (${(slip.vehicleType || 'Car').toUpperCase()})`)}
      ${row('Fuel Type', slip.fuelType)}
      ${row('Date And Time When Slip Issued', formatDateTime(slip.issuedAt))}
      ${row('Last K.M Reading', slip.lastKm)}
      ${row('Issued To', slip.issuedTo)}
      ${row('Filling Location', slip.fillingLocation)}
    </table>
    <div class="sign">Seal &amp; Signatory</div>
    <script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script>
    </body></html>`);
  w.document.close();
};

const SlipCard = ({ slip }) => (
  <div style={{ border: '2px solid #0f172a', borderRadius: 4, overflow: 'hidden', maxWidth: 440, margin: '0 auto' }}>
    <div style={{ textAlign: 'center', padding: '12px 10px', borderBottom: '1px solid #0f172a' }}>
      <img src="/vehicle-app-logo.svg" alt="" style={{ width: 44, height: 44 }} />
      <div style={{ fontWeight: 800, fontSize: 14.5, marginTop: 4 }}>{(slip.firmName || 'Vehicle App').toUpperCase()}</div>
      <div style={{ fontSize: 11.5, color: '#64748b', fontWeight: 700 }}>FUEL SLIP</div>
    </div>
    {[
      ['Slip No.', slip.slipNo],
      ['Vehicle No.', `${slip.registrationNo} (${(slip.vehicleType || 'Car').toUpperCase()})`],
      ['Fuel Type', slip.fuelType],
      ['Date & Time Issued', formatDateTime(slip.issuedAt)],
      ['Last K.M Reading', slip.lastKm],
      ['Issued To', slip.issuedTo],
      ['Filling Location', slip.fillingLocation],
    ].map(([label, value]) => (
      <div key={label} style={{ display: 'grid', gridTemplateColumns: '42% 58%', borderBottom: '1px solid #0f172a', fontSize: 13.5 }}>
        <div style={{ padding: '8px 10px', fontWeight: 700, background: '#f8fafc', borderRight: '1px solid #0f172a' }}>{label}</div>
        <div style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600 }}>{value || '—'}</div>
      </div>
    ))}
    <div style={{ height: 80, textAlign: 'center', fontWeight: 700, paddingTop: 8, fontSize: 13 }}>Seal &amp; Signatory</div>
  </div>
);

// ─── FORM 1: FUEL REQUEST (ISSUE SLIP) ────────────────────────────────────────
const FuelRequestForm = ({ cars, driverMap, locations, requestedBy, onIssued, onClose }) => {
  const [form, setForm] = useState({ issuedTo: '', vehicleId: '', lastKm: '', fillingLocation: '', remarks: '' });
  const [saving, setSaving] = useState(false);
  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));
  const car = cars.find(c => c.vehicleId === form.vehicleId);
  const drivers = Object.keys(driverMap).sort();
  const driverVehicles = driverMap[form.issuedTo.trim()] || [];

  const selectVehicle = (vehicleId) => setForm(f => ({ ...f, vehicleId, lastKm: String(getLastOdometer(vehicleId) || '') }));

  const onDriverChange = (name) => {
    const vehicles = driverMap[name.trim()] || [];
    setForm(f => ({ ...f, issuedTo: name, ...(vehicles[0] ? { vehicleId: vehicles[0], lastKm: String(getLastOdometer(vehicles[0]) || '') } : {}) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.issuedTo.trim()) return toast.error('Please select who the slip is issued to');
    if (!car) return toast.error('Please select a vehicle');
    if (form.lastKm === '') return toast.error('Last K.M reading is required');
    setSaving(true);
    try {
      const slip = await addFuelSlip({
        issuedTo: form.issuedTo.trim(),
        vehicleId: car.vehicleId,
        carName: car.carName,
        registrationNo: car.registrationNo,
        vehicleType: car.vehicleType || 'Car',
        fuelType: car.fuelType,
        firmName: car.firmName,
        lastKm: form.lastKm,
        fillingLocation: form.fillingLocation.trim(),
        remarks: form.remarks,
        requestedBy,
      });
      toast.success(`Slip No. ${slip.slipNo} generated`);
      onIssued(slip);
    } catch (err) {
      toast.error(err.message || 'Failed to issue slip');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="form-group">
        <label className="form-label">Issued To <span className="required">*</span></label>
        <input className="form-input" list="fuel-drivers" value={form.issuedTo} onChange={e => onDriverChange(e.target.value)} placeholder="Choose driver / person" autoFocus />
        <datalist id="fuel-drivers">{drivers.map(d => <option key={d} value={d} />)}</datalist>
      </div>

      <div className="form-group">
        <label className="form-label">Vehicle No. <span className="required">*</span></label>
        <select className="form-select" value={form.vehicleId} onChange={e => selectVehicle(e.target.value)}>
          <option value="">Choose vehicle</option>
          {driverVehicles.length > 0 && (
            <optgroup label={`Used by ${form.issuedTo.trim()}`}>
              {driverVehicles.map(id => cars.find(c => c.vehicleId === id)).filter(Boolean).map(c => <option key={c.vehicleId} value={c.vehicleId}>{vehicleLabel(c)} — {c.carName}</option>)}
            </optgroup>
          )}
          <optgroup label="All vehicles">
            {cars.filter(c => !driverVehicles.includes(c.vehicleId)).map(c => <option key={c.vehicleId} value={c.vehicleId}>{vehicleLabel(c)} — {c.carName}</option>)}
          </optgroup>
        </select>
      </div>

      {car && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#065f46', fontWeight: 600 }}>
          <span>{car.carName}</span>·<span>Type: {car.vehicleType || 'Car'}</span>·<span>Fuel: {car.fuelType}</span>·<span>{car.firmName}</span>
        </div>
      )}

      <div className="form-grid-2">
        <div className="form-group">
          <label className="form-label">Last K.M Reading <span className="required">*</span></label>
          <input type="number" min="0" className="form-input" value={form.lastKm} onChange={e => set('lastKm', e.target.value)} placeholder="Auto from vehicle history" />
        </div>
        <div className="form-group">
          <label className="form-label">Filling Location</label>
          <input className="form-input" list="fuel-locations" value={form.fillingLocation} onChange={e => set('fillingLocation', e.target.value)} placeholder="Choose pump" />
          <datalist id="fuel-locations">{locations.map(l => <option key={l} value={l} />)}</datalist>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Remarks</label>
        <input className="form-input" value={form.remarks} onChange={e => set('remarks', e.target.value)} placeholder="Optional" />
      </div>

      <div className="modal-footer" style={{ padding: '12px 0 0', margin: 0, background: 'transparent' }}>
        <button type="button" className="btn btn-outline" onClick={onClose} disabled={saving}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}><Ticket size={15} /> {saving ? 'Generating...' : 'Generate Slip'}</button>
      </div>
    </form>
  );
};

// ─── FORM 2: FILL SLIP ────────────────────────────────────────────────────────
const FuelFillForm = ({ slip: initialSlip, pendingSlips, fuels, cars, entryByDefault, onClose }) => {
  const [slipNo, setSlipNo] = useState(initialSlip?.slipNo || '');
  const slip = pendingSlips.find(sl => sl.slipNo === slipNo) || (initialSlip?.slipNo === slipNo ? initialSlip : null);
  const [haveFilled, setHaveFilled] = useState('Yes');
  const [entryBy, setEntryBy] = useState(entryByDefault || '');
  const [reason, setReason] = useState('');
  const [form, setForm] = useState(() => ({
    date: today(), fuelType: initialSlip?.fuelType || '', quantity: '', rate: initialSlip ? lastRate(fuels, initialSlip.fuelType) : '',
    amount: '', odometer: '', kmImage: null, billNo: '', billImage: null, paymentMode: PAYMENT_MODES[0], remarks: '',
  }));
  const [amountTouched, setAmountTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (field, val) => setForm(f => {
    const next = { ...f, [field]: val };
    if (!amountTouched && (field === 'quantity' || field === 'rate')) {
      const total = num(next.quantity) * num(next.rate);
      next.amount = total ? String(Math.round(total * 100) / 100) : '';
    }
    return next;
  });

  const onSlipChange = (no) => {
    setSlipNo(no);
    const sl = pendingSlips.find(s => s.slipNo === no);
    if (sl) setForm(f => ({ ...f, fuelType: sl.fuelType, rate: lastRate(fuels, sl.fuelType) }));
  };

  const car = slip ? cars.find(c => c.vehicleId === slip.vehicleId) : null;
  const unit = fuelUnit(form.fuelType || slip?.fuelType);
  const runKm = slip && form.odometer !== '' ? num(form.odometer) - num(slip.lastKm) : null;
  const average = runKm > 0 && num(form.quantity) > 0 ? (runKm / num(form.quantity)).toFixed(2) : null;
  const vehicleAvg = slip ? vehicleAverage(withMileage(fuels.filter(f => f.vehicleId === slip.vehicleId))) : null;
  const lowAverage = average && vehicleAvg && Number(average) < vehicleAvg * 0.85;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!slip) return toast.error('Please choose a valid pending Slip No.');
    if (!entryBy.trim()) return toast.error('Entry By Name is required');
    setSaving(true);
    try {
      if (haveFilled === 'No') {
        await markSlipNotFilled(slip.slipNo, { entryBy: entryBy.trim(), reason });
        toast.success(`Slip ${slip.slipNo} marked as Not Filled`);
        onClose();
        return;
      }
      if (!num(form.quantity)) throw new Error('Qty is required');
      if (!num(form.rate)) throw new Error('Rate is required');
      if (form.odometer === '') throw new Error('Current K.M reading is required');
      if (runKm <= 0) throw new Error(`Current K.M must be more than last reading (${slip.lastKm})`);
      if (!fileUrl(form.kmImage)) throw new Error('Current K.M reading image is required');
      if (!form.billNo.trim()) throw new Error('Fuel Bill No. is required');

      const fuel = await fillFuelSlip(slip.slipNo, {
        date: form.date,
        fuelType: form.fuelType || slip.fuelType,
        unit,
        quantity: form.quantity,
        rate: form.rate,
        amount: form.amount,
        odometer: form.odometer,
        kmImage: fileUrl(form.kmImage),
        billNo: form.billNo.trim(),
        billImage: fileUrl(form.billImage),
        paymentMode: form.paymentMode,
        location: slip.fillingLocation,
        remarks: form.remarks,
        entryBy: entryBy.trim(),
      });
      toast.success(`Fuel entry ${fuel.fuelNo} saved · Average ${average} km/${unit}`);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="form-grid-3">
        <div className="form-group">
          <label className="form-label">Slip No. <span className="required">*</span></label>
          <input className="form-input" list="pending-slips" value={slipNo} onChange={e => onSlipChange(e.target.value.trim())} placeholder="Enter / choose slip" />
          <datalist id="pending-slips">{pendingSlips.map(sl => <option key={sl.slipNo} value={sl.slipNo}>{sl.registrationNo} · {sl.issuedTo}</option>)}</datalist>
        </div>
        <div className="form-group">
          <label className="form-label">Have Filled?</label>
          <select className="form-select" value={haveFilled} onChange={e => setHaveFilled(e.target.value)}>
            <option>Yes</option>
            <option>No</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Entry By Name <span className="required">*</span></label>
          <input className="form-input" value={entryBy} onChange={e => setEntryBy(e.target.value)} />
        </div>
      </div>

      {slipNo && !slip && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '8px 14px', fontSize: 13, color: '#b91c1c', fontWeight: 600 }}>
          No pending slip found with No. {slipNo}
        </div>
      )}

      {slip && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '12px 14px' }}>
          {[
            ['Vehicle No.', vehicleLabel(slip)], ['Car', slip.carName], ['Issued To', slip.issuedTo],
            ['Last K.M', num(slip.lastKm).toLocaleString('en-IN')], ['Filling Location', slip.fillingLocation], ['Issued', formatDateTime(slip.issuedAt)],
          ].map(([l, v]) => (
            <div key={l}><div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>{l}</div><div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>{v || '—'}</div></div>
          ))}
        </div>
      )}

      {haveFilled === 'No' ? (
        <div className="form-group">
          <label className="form-label">Reason (not filled)</label>
          <textarea className="form-textarea" rows={2} value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. pump closed, trip cancelled" />
        </div>
      ) : (
        <>
          <div className="form-grid-3">
            <div className="form-group">
              <label className="form-label">Date Of Filling <span className="required">*</span></label>
              <input type="date" className="form-input" value={form.date} onChange={e => set('date', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Diesel / Petrol <span className="required">*</span></label>
              <select className="form-select" value={form.fuelType} onChange={e => set('fuelType', e.target.value)}>
                {[...new Set([form.fuelType, car?.fuelType, 'Diesel', 'Petrol', 'CNG', 'Electric'].filter(Boolean))].map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Payment Mode</label>
              <select className="form-select" value={form.paymentMode} onChange={e => set('paymentMode', e.target.value)}>
                {PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div className="form-grid-3">
            <div className="form-group">
              <label className="form-label">Qty In {unit} <span className="required">*</span></label>
              <input type="number" step="0.01" min="0" className="form-input" value={form.quantity} onChange={e => set('quantity', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Rate (₹) <span className="required">*</span></label>
              <input type="number" step="0.01" min="0" className="form-input" value={form.rate} onChange={e => set('rate', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Amount (₹)</label>
              <input type="number" step="0.01" min="0" className="form-input" value={form.amount} onChange={e => { setAmountTouched(true); set('amount', e.target.value); }} />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Current K.M Reading <span className="required">*</span></label>
              <input type="number" min="0" className="form-input" value={form.odometer} onChange={e => set('odometer', e.target.value)} placeholder={slip ? `More than ${slip.lastKm}` : ''} />
            </div>
            <div className="form-group">
              <label className="form-label">Fuel Bill No. <span className="required">*</span></label>
              <input className="form-input" value={form.billNo} onChange={e => set('billNo', e.target.value)} />
            </div>
          </div>

          {runKm !== null && (
            <div style={{
              borderRadius: 10, padding: '10px 14px', fontSize: 13, fontWeight: 700,
              background: runKm <= 0 || lowAverage ? '#fef2f2' : '#ecfdf5',
              border: `1px solid ${runKm <= 0 || lowAverage ? '#fecaca' : '#a7f3d0'}`,
              color: runKm <= 0 || lowAverage ? '#b91c1c' : '#047857',
            }}>
              {runKm <= 0
                ? `Current reading must be more than last reading (${slip.lastKm})`
                : <>Run: {runKm.toLocaleString('en-IN')} km{average && <> · Average: {average} km/{unit}</>}{vehicleAvg && <> · Vehicle avg: {vehicleAvg} km/{unit}</>}{lowAverage && ' · ⚠ Average is more than 15% below normal'}</>}
            </div>
          )}

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Current K.M Reading Image <span className="required">*</span></label>
              <FileUpload value={form.kmImage} onChange={v => set('kmImage', v)} accept="image/*" label="Upload odometer photo" />
            </div>
            <div className="form-group">
              <label className="form-label">Photo Of Bill</label>
              <FileUpload value={form.billImage} onChange={v => set('billImage', v)} accept="image/*,.pdf" label="Upload fuel bill" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Remarks</label>
            <input className="form-input" value={form.remarks} onChange={e => set('remarks', e.target.value)} />
          </div>
        </>
      )}

      <div className="modal-footer" style={{ padding: '12px 0 0', margin: 0, background: 'transparent' }}>
        <button type="button" className="btn btn-outline" onClick={onClose} disabled={saving}>Cancel</button>
        <button type="submit" className={haveFilled === 'No' ? 'btn btn-danger' : 'btn btn-primary'} disabled={saving || !slip}>
          {saving ? 'Saving...' : haveFilled === 'No' ? 'Mark Not Filled' : 'Submit Fuel Entry'}
        </button>
      </div>
    </form>
  );
};

// ─── EDIT / DIRECT FUEL ENTRY ─────────────────────────────────────────────────
const EMPTY_FUEL = {
  date: today(), vehicleId: '', fuelType: '', quantity: '', rate: '', amount: '', lastKm: '', odometer: '', fullTank: 'Yes',
  pumpName: '', location: '', paymentMode: PAYMENT_MODES[0], filledBy: '', billNo: '', billImage: null, kmImage: null, remarks: '',
};

const FuelForm = ({ entry, cars, fuels, onClose }) => {
  const isEdit = !!entry?.id;
  const [form, setForm] = useState(() => ({ ...EMPTY_FUEL, ...(entry || {}) }));
  const [amountTouched, setAmountTouched] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  const set = (field, val) => setForm(f => {
    const next = { ...f, [field]: val };
    if (!amountTouched && (field === 'quantity' || field === 'rate')) {
      const total = num(next.quantity) * num(next.rate);
      next.amount = total ? String(Math.round(total * 100) / 100) : '';
    }
    return next;
  });

  const onVehicleChange = (vehicleId) => {
    const car = cars.find(c => c.vehicleId === vehicleId);
    setForm(f => ({
      ...f,
      vehicleId,
      fuelType: car?.fuelType || f.fuelType,
      rate: f.rate || lastRate(fuels, car?.fuelType),
      filledBy: f.filledBy || car?.servicePersonName || '',
      lastKm: f.lastKm || String(getLastOdometer(vehicleId) || ''),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.vehicleId) return toast.error('Please select a vehicle');
    if (!num(form.quantity)) return toast.error('Please enter fuel quantity');
    if (!num(form.amount)) return toast.error('Please enter amount');
    if (form.lastKm !== '' && form.odometer !== '' && num(form.odometer) <= num(form.lastKm)) return toast.error('Current K.M must be more than last K.M');

    const car = cars.find(c => c.vehicleId === form.vehicleId);
    const payload = {
      ...form,
      carName: car?.carName || '',
      registrationNo: car?.registrationNo || '',
      unit: fuelUnit(form.fuelType),
      billImage: fileUrl(form.billImage),
      kmImage: fileUrl(form.kmImage),
    };
    setSaving(true);
    try {
      if (isEdit) {
        await updateFuel(entry.id, payload);
        toast.success('Fuel entry updated');
      } else {
        const saved = await addFuel(payload);
        toast.success(`Fuel entry ${saved.fuelNo} added`);
      }
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to save fuel entry');
    } finally {
      setSaving(false);
    }
  };

  const unit = fuelUnit(form.fuelType);

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="form-grid-3">
        <div className="form-group">
          <label className="form-label">Date <span className="required">*</span></label>
          <input type="date" className="form-input" required value={form.date} onChange={e => set('date', e.target.value)} />
        </div>
        <div className="form-group span-2">
          <label className="form-label">Vehicle <span className="required">*</span></label>
          <select className="form-select" value={form.vehicleId} onChange={e => onVehicleChange(e.target.value)} disabled={isEdit}>
            <option value="">Select vehicle...</option>
            {cars.map(c => <option key={c.vehicleId} value={c.vehicleId}>{vehicleLabel(c)} — {c.carName} ({c.fuelType})</option>)}
          </select>
        </div>
      </div>

      <div className="form-grid-3">
        <div className="form-group">
          <label className="form-label">Fuel Type</label>
          <select className="form-select" value={form.fuelType} onChange={e => set('fuelType', e.target.value)}>
            <option value="">Select...</option>
            {Object.keys(DEFAULT_RATES).map(f => <option key={f}>{f}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Quantity ({unit}) <span className="required">*</span></label>
          <input type="number" step="0.01" min="0" className="form-input" value={form.quantity} onChange={e => set('quantity', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Rate (₹ / {unit})</label>
          <input type="number" step="0.01" min="0" className="form-input" value={form.rate} onChange={e => set('rate', e.target.value)} />
        </div>
      </div>

      <div className="form-grid-3">
        <div className="form-group">
          <label className="form-label">Total Amount (₹) <span className="required">*</span></label>
          <input type="number" step="0.01" min="0" className="form-input" value={form.amount} onChange={e => { setAmountTouched(true); set('amount', e.target.value); }} />
        </div>
        <div className="form-group">
          <label className="form-label">Last K.M Reading</label>
          <input type="number" min="0" className="form-input" value={form.lastKm} onChange={e => set('lastKm', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Current K.M Reading</label>
          <input type="number" min="0" className="form-input" value={form.odometer} onChange={e => set('odometer', e.target.value)} />
        </div>
      </div>

      <div className="form-grid-3">
        <div className="form-group">
          <label className="form-label">Pump / Station</label>
          <input className="form-input" value={form.pumpName} onChange={e => set('pumpName', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Payment Mode</label>
          <select className="form-select" value={form.paymentMode} onChange={e => set('paymentMode', e.target.value)}>
            {PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Fuel Bill No.</label>
          <input className="form-input" value={form.billNo} onChange={e => set('billNo', e.target.value)} />
        </div>
      </div>

      <div className="form-grid-2">
        <div className="form-group">
          <label className="form-label">Current K.M Reading Image</label>
          <FileUpload value={form.kmImage} onChange={v => set('kmImage', v)} accept="image/*" label="Upload odometer photo" />
        </div>
        <div className="form-group">
          <label className="form-label">Photo Of Bill</label>
          <FileUpload value={form.billImage} onChange={v => set('billImage', v)} accept="image/*,.pdf" label="Upload fuel bill" />
        </div>
      </div>

      <div className="form-grid-2">
        <div className="form-group">
          <label className="form-label">Filled By (Driver)</label>
          <input className="form-input" value={form.filledBy} onChange={e => set('filledBy', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Remarks</label>
          <input className="form-input" value={form.remarks} onChange={e => set('remarks', e.target.value)} />
        </div>
      </div>

      <div className="modal-footer" style={{ padding: '12px 0 0', margin: 0, background: 'transparent' }}>
        <button type="button" className="btn btn-outline" onClick={onClose} disabled={saving}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving...' : isEdit ? 'Update Entry' : 'Save Fuel Entry'}
        </button>
      </div>
    </form>
  );
};

// ─── PAGE ─────────────────────────────────────────────────────────────────────
const FuelEntries = () => {
  const { canEditPage, currentUser } = useAuth();
  const canEdit = canEditPage(PAGE_KEYS.FUEL);

  const [cars, setCars] = useState([]);
  const [trips, setTrips] = useState([]);
  const [fuels, setFuels] = useState([]);
  const [slips, setSlips] = useState([]);
  const [tab, setTab] = useState('pending'); // pending | slips | entries
  const [search, setSearch] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [requestOpen, setRequestOpen] = useState(false);
  const [viewSlip, setViewSlip] = useState(null);
  const [fillSlip, setFillSlip] = useState(undefined); // undefined = closed, null = choose slip
  const [formEntry, setFormEntry] = useState(undefined); // undefined = closed, null = new direct entry
  const [viewEntry, setViewEntry] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = useCallback(async () => {
    const [c, t, f, s] = await Promise.all([getCars(), getTrips(), getFuels(), getFuelSlips()]);
    setCars(c);
    setTrips(t);
    setFuels(withMileage(f));
    setSlips(s);
  }, []);

  useEffect(() => {
    load();
    return onStoreUpdate(load);
  }, [load]);

  const driverMap = useMemo(() => buildDriverMap(cars, slips, trips), [cars, slips, trips]);
  const locations = useMemo(() => getFillingLocations(), [slips, fuels]);
  const pendingSlips = useMemo(() => slips.filter(s => s.status === 'Pending'), [slips]);

  const monthPrefix = today().slice(0, 7);
  const stats = useMemo(() => {
    const month = fuels.filter(f => f.date?.startsWith(monthPrefix));
    return {
      monthAmount: month.reduce((s, f) => s + num(f.amount), 0),
      monthEntries: month.length,
      monthLitres: month.filter(f => f.fuelType !== 'Electric').reduce((s, f) => s + num(f.quantity), 0),
      fleetAvg: vehicleAverage(fuels.filter(f => f.fuelType !== 'Electric')),
    };
  }, [fuels, monthPrefix]);

  const q = search.trim().toLowerCase();

  const filteredSlips = useMemo(() => (tab === 'pending' ? pendingSlips : slips)
    .filter(s => !vehicleFilter || s.vehicleId === vehicleFilter)
    .filter(s => !q || [s.slipNo, s.registrationNo, s.carName, s.issuedTo, s.fillingLocation, s.fuelNo].some(v => String(v || '').toLowerCase().includes(q)))
    .sort((a, b) => Number(b.slipNo) - Number(a.slipNo)), [tab, slips, pendingSlips, vehicleFilter, q]);

  const filteredFuels = useMemo(() => fuels
    .filter(f => !vehicleFilter || f.vehicleId === vehicleFilter)
    .filter(f => (!fromDate || f.date >= fromDate) && (!toDate || f.date <= toDate))
    .filter(f => !q || [f.fuelNo, f.slipNo, f.carName, f.registrationNo, f.pumpName, f.filledBy, f.billNo].some(v => String(v || '').toLowerCase().includes(q)))
    .sort((a, b) => (b.date || '').localeCompare(a.date || '') || num(b.odometer) - num(a.odometer)),
  [fuels, vehicleFilter, fromDate, toDate, q]);

  const list = tab === 'entries' ? filteredFuels : filteredSlips;
  const totalPages = Math.ceil(list.length / ITEMS_PER_PAGE) || 1;
  const paged = list.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const exportCsv = () => {
    if (tab === 'entries') {
      downloadCsv(`Fuel_Entries_${today()}`, [
        { label: 'Entry No', value: f => f.fuelNo },
        { label: 'Slip No', value: f => f.slipNo },
        { label: 'Date', value: f => f.date },
        { label: 'Vehicle No', value: f => f.registrationNo },
        { label: 'Car', value: f => f.carName },
        { label: 'Fuel Type', value: f => f.fuelType },
        { label: 'Quantity', value: f => f.quantity },
        { label: 'Unit', value: f => f.unit || fuelUnit(f.fuelType) },
        { label: 'Rate', value: f => f.rate },
        { label: 'Amount', value: f => f.amount },
        { label: 'Last KM', value: f => f.lastKm },
        { label: 'Current KM', value: f => f.odometer },
        { label: 'Run KM', value: f => f.runKm ?? '' },
        { label: 'Average (km/unit)', value: f => f.mileage ?? '' },
        { label: 'Filling Location', value: f => f.pumpName },
        { label: 'Payment Mode', value: f => f.paymentMode },
        { label: 'Issued To / Filled By', value: f => f.filledBy },
        { label: 'Entry By', value: f => f.entryBy },
        { label: 'Bill No', value: f => f.billNo },
        { label: 'Remarks', value: f => f.remarks },
      ], filteredFuels);
    } else {
      downloadCsv(`Fuel_Slips_${today()}`, [
        { label: 'Slip No', value: s => s.slipNo },
        { label: 'Issued At', value: s => s.issuedAt },
        { label: 'Vehicle No', value: s => s.registrationNo },
        { label: 'Vehicle Type', value: s => s.vehicleType },
        { label: 'Fuel Type', value: s => s.fuelType },
        { label: 'Issued To', value: s => s.issuedTo },
        { label: 'Last KM', value: s => s.lastKm },
        { label: 'Filling Location', value: s => s.fillingLocation },
        { label: 'Status', value: s => s.status },
        { label: 'Fuel Entry No', value: s => s.fuelNo },
        { label: 'Entry By', value: s => s.entryBy },
        { label: 'Not Filled Reason', value: s => s.notFilledReason },
      ], filteredSlips);
    }
  };

  const TABS = [
    { key: 'pending', label: `Pending Slips (${pendingSlips.length})`, icon: Clock },
    { key: 'slips', label: `All Slips (${slips.length})`, icon: Ticket },
    { key: 'entries', label: `Fuel Entries (${fuels.length})`, icon: Fuel },
  ];

  const confirmDelete = async () => {
    if (deleteTarget.type === 'slip') await deleteFuelSlip(deleteTarget.item.slipNo);
    else await deleteFuel(deleteTarget.item.id);
    toast.success('Deleted');
    setDeleteTarget(null);
  };

  return (
    <div>
      {!canEdit && <ReadOnlyNotice moduleName="Fuel Entries" />}

      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 36, height: 36, borderRadius: 10, background: '#fff7ed', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#ea580c' }}>
              <Fuel size={20} />
            </span>
            Fuel Management
          </h1>
          <p className="page-subtitle">Step 1: Fuel request issues a slip · Step 2: Fill the slip with quantity, KM reading & bill · Average is calculated automatically</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-outline" onClick={exportCsv}><Download size={15} /> Export</button>
          {canEdit && <button className="btn btn-outline" onClick={() => setFormEntry(null)} title="Add a fuel entry without a slip"><Plus size={15} /> Direct Entry</button>}
          {canEdit && <button className="btn btn-outline" onClick={() => setFillSlip(null)}><CheckCircle2 size={15} /> Fill Slip</button>}
          {canEdit && <button className="btn btn-primary" onClick={() => setRequestOpen(true)}><Ticket size={16} /> New Fuel Request</button>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatTile label="Pending Slips" value={pendingSlips.length} sub="Issued, waiting for fill entry" icon={Clock} color="#d97706" bg="#fffbeb" />
        <StatTile label="Fuel Cost (Month)" value={inr(stats.monthAmount)} sub={`${stats.monthEntries} fills this month`} icon={IndianRupee} color="#ea580c" bg="#fff7ed" />
        <StatTile label="Fuel Filled (Month)" value={stats.monthLitres.toLocaleString('en-IN', { maximumFractionDigits: 1 })} sub="Litres / Kg (excl. EV)" icon={Droplets} color="#0284c7" bg="#e0f2fe" />
        <StatTile label="Fleet Average" value={stats.fleetAvg ?? '—'} sub="km per litre (total run ÷ total qty)" icon={Gauge} color="#059669" bg="#ecfdf5" />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.key} className={`btn ${tab === t.key ? 'btn-primary' : 'btn-outline'}`} onClick={() => { setTab(t.key); setPage(1); }}>
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      <div className="data-table-container">
        <div className="filter-bar" style={{ flexWrap: 'wrap' }}>
          <div className="search-wrapper">
            <Search size={14} className="search-icon" />
            <input className="search-input" placeholder="Search slip no, vehicle, person, pump, bill..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <select className="form-select" style={{ width: 'auto', minWidth: 190 }} value={vehicleFilter} onChange={e => { setVehicleFilter(e.target.value); setPage(1); }}>
            <option value="">All Vehicles</option>
            {cars.map(c => <option key={c.vehicleId} value={c.vehicleId}>{vehicleLabel(c)} — {c.carName}</option>)}
          </select>
          {tab === 'entries' && (
            <>
              <input type="date" className="form-input" style={{ width: 'auto' }} value={fromDate} onChange={e => { setFromDate(e.target.value); setPage(1); }} title="From date" />
              <input type="date" className="form-input" style={{ width: 'auto' }} value={toDate} onChange={e => { setToDate(e.target.value); setPage(1); }} title="To date" />
            </>
          )}
          {(search || vehicleFilter || fromDate || toDate) && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setVehicleFilter(''); setFromDate(''); setToDate(''); }}>
              <X size={14} /> Clear
            </button>
          )}
          {tab === 'entries' && (
            <span style={{ marginLeft: 'auto', fontSize: 12.5, color: '#64748b', fontWeight: 600 }}>
              {filteredFuels.length} entries · {inr(filteredFuels.reduce((s, f) => s + num(f.amount), 0))}
            </span>
          )}
        </div>

        <div style={{ overflowX: 'auto' }}>
          {paged.length === 0 ? (
            <EmptyState icon={tab === 'entries' ? Fuel : Ticket} title={tab === 'pending' ? 'No pending slips' : 'No records found'} message={tab === 'pending' ? 'Create a New Fuel Request to issue a slip.' : 'Adjust the filters.'} />
          ) : tab === 'entries' ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Entry / Slip</th>
                  <th>Date</th>
                  <th>Vehicle</th>
                  <th style={{ textAlign: 'right' }}>Qty</th>
                  <th style={{ textAlign: 'right' }}>Rate</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th style={{ textAlign: 'right' }}>Last KM</th>
                  <th style={{ textAlign: 'right' }}>Current KM</th>
                  <th style={{ textAlign: 'right' }}>Run KM</th>
                  <th style={{ textAlign: 'right' }}>Average</th>
                  <th>Location</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map(f => (
                  <tr key={f.id}>
                    <td><div style={{ fontWeight: 700, color: '#ea580c', fontFamily: 'monospace' }}>{f.fuelNo}</div><div style={{ fontSize: 11.5, color: '#94a3b8' }}>{f.slipNo ? `Slip ${f.slipNo}` : 'Direct'}</div></td>
                    <td>{formatDate(f.date)}</td>
                    <td><div style={{ fontWeight: 700 }}>{f.registrationNo}</div><div style={{ fontSize: 11.5, color: '#64748b' }}>{f.carName} · {f.fuelType}</div></td>
                    <td style={{ textAlign: 'right' }}>{num(f.quantity).toLocaleString('en-IN', { maximumFractionDigits: 2 })} <span style={{ fontSize: 11, color: '#94a3b8' }}>{f.unit || fuelUnit(f.fuelType)}</span></td>
                    <td style={{ textAlign: 'right' }}>₹{f.rate || '—'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{inr(f.amount)}</td>
                    <td style={{ textAlign: 'right' }}>{f.lastKm ? num(f.lastKm).toLocaleString('en-IN') : '—'}</td>
                    <td style={{ textAlign: 'right' }}>{f.odometer ? num(f.odometer).toLocaleString('en-IN') : '—'}</td>
                    <td style={{ textAlign: 'right' }}>{f.runKm ? f.runKm.toLocaleString('en-IN') : '—'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: f.mileage ? '#059669' : '#94a3b8' }}>{f.mileage ?? '—'}</td>
                    <td>{f.pumpName || '—'}<div style={{ fontSize: 11.5, color: '#94a3b8' }}>{f.paymentMode}</div></td>
                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-xs" title="View" onClick={() => setViewEntry(f)}><Eye size={14} /></button>
                        {canEdit && <button className="btn btn-ghost btn-xs" title="Edit" onClick={() => setFormEntry(f)}><Edit2 size={14} /></button>}
                        {canEdit && <button className="btn btn-ghost btn-xs" title="Delete" style={{ color: '#ef4444' }} onClick={() => setDeleteTarget({ type: 'fuel', item: f })}><Trash2 size={14} /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Slip No.</th>
                  <th>Issued</th>
                  <th>Vehicle No.</th>
                  <th>Issued To</th>
                  <th style={{ textAlign: 'right' }}>Last KM</th>
                  <th>Filling Location</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map(s => (
                  <tr key={s.slipNo}>
                    <td style={{ fontWeight: 800, color: '#d97706', fontFamily: 'monospace', fontSize: 14 }}>{s.slipNo}</td>
                    <td>{formatDateTime(s.issuedAt)}</td>
                    <td><div style={{ fontWeight: 700 }}>{vehicleLabel(s)}</div><div style={{ fontSize: 11.5, color: '#64748b' }}>{s.carName} · {s.fuelType}</div></td>
                    <td>{s.issuedTo}</td>
                    <td style={{ textAlign: 'right' }}>{num(s.lastKm).toLocaleString('en-IN')}</td>
                    <td>{s.fillingLocation || '—'}</td>
                    <td style={{ textAlign: 'center' }}>
                      <Badge label={s.status} variant={SLIP_VARIANT[s.status] || 'gray'} />
                      {s.fuelNo && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>{s.fuelNo}</div>}
                    </td>
                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', gap: 4 }}>
                        {canEdit && s.status === 'Pending' && (
                          <button className="btn btn-primary btn-xs" onClick={() => setFillSlip(s)}><CheckCircle2 size={13} /> Fill</button>
                        )}
                        <button className="btn btn-ghost btn-xs" title="View slip" onClick={() => setViewSlip(s)}><Eye size={14} /></button>
                        <button className="btn btn-ghost btn-xs" title="Print slip" onClick={() => printSlip(s)}><Printer size={14} /></button>
                        {canEdit && s.status !== 'Filled' && <button className="btn btn-ghost btn-xs" title="Delete slip" style={{ color: '#ef4444' }} onClick={() => setDeleteTarget({ type: 'slip', item: s })}><Trash2 size={14} /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} totalItems={list.length} itemsPerPage={ITEMS_PER_PAGE} />
      </div>

      {/* Form 1: request */}
      <Modal isOpen={requestOpen} onClose={() => setRequestOpen(false)} title="Fuel Request — Issue Slip" icon={Ticket} size="md">
        {requestOpen && (
          <FuelRequestForm
            cars={cars} driverMap={driverMap} locations={locations} requestedBy={currentUser?.name || ''}
            onClose={() => setRequestOpen(false)}
            onIssued={(slip) => { setRequestOpen(false); setViewSlip(slip); setTab('pending'); }}
          />
        )}
      </Modal>

      {/* Slip view / print */}
      <Modal
        isOpen={!!viewSlip}
        onClose={() => setViewSlip(null)}
        title={`Fuel Slip No. ${viewSlip?.slipNo || ''}`}
        icon={Ticket}
        size="md"
        footer={viewSlip && (
          <>
            <button className="btn btn-outline" onClick={() => setViewSlip(null)}>Close</button>
            {canEdit && viewSlip.status === 'Pending' && <button className="btn btn-outline" onClick={() => { const s = viewSlip; setViewSlip(null); setFillSlip(s); }}><CheckCircle2 size={14} /> Fill Now</button>}
            <button className="btn btn-primary" onClick={() => printSlip(viewSlip)}><Printer size={14} /> Print Slip</button>
          </>
        )}
      >
        {viewSlip && (
          <>
            <SlipCard slip={viewSlip} />
            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <Badge label={viewSlip.status} variant={SLIP_VARIANT[viewSlip.status] || 'gray'} />
              {viewSlip.status === 'Not Filled' && <div style={{ fontSize: 12.5, color: '#b91c1c', marginTop: 6 }}><XCircle size={12} style={{ verticalAlign: -2 }} /> {viewSlip.notFilledReason || 'No reason given'} · by {viewSlip.entryBy}</div>}
              {viewSlip.status === 'Filled' && <div style={{ fontSize: 12.5, color: '#047857', marginTop: 6 }}>Filled as {viewSlip.fuelNo} · entry by {viewSlip.entryBy}</div>}
            </div>
          </>
        )}
      </Modal>

      {/* Form 2: fill slip */}
      <Modal isOpen={fillSlip !== undefined} onClose={() => setFillSlip(undefined)} title="Fuel Fill Entry (against Slip)" icon={Fuel} size="lg">
        {fillSlip !== undefined && (
          <FuelFillForm slip={fillSlip} pendingSlips={pendingSlips} fuels={fuels} cars={cars} entryByDefault={currentUser?.name} onClose={() => setFillSlip(undefined)} />
        )}
      </Modal>

      {/* Direct entry / edit */}
      <Modal isOpen={formEntry !== undefined} onClose={() => setFormEntry(undefined)} title={formEntry?.id ? `Edit Fuel Entry — ${formEntry.fuelNo}` : 'Direct Fuel Entry'} icon={Fuel} size="lg">
        {formEntry !== undefined && <FuelForm entry={formEntry} cars={cars} fuels={fuels} onClose={() => setFormEntry(undefined)} />}
      </Modal>

      <Modal isOpen={!!viewEntry} onClose={() => setViewEntry(null)} title={`Fuel Entry — ${viewEntry?.fuelNo || ''}`} icon={Fuel} size="lg">
        {viewEntry && (
          <>
            <div className="detail-grid">
              {[
                ['Entry No', viewEntry.fuelNo], ['Slip No', viewEntry.slipNo || 'Direct entry'], ['Date', formatDate(viewEntry.date)],
                ['Vehicle', `${viewEntry.registrationNo} — ${viewEntry.carName}`], ['Fuel Type', viewEntry.fuelType], ['Quantity', `${viewEntry.quantity} ${viewEntry.unit || fuelUnit(viewEntry.fuelType)}`],
                ['Rate', viewEntry.rate && `₹${viewEntry.rate}`], ['Amount', inr(viewEntry.amount)], ['Last K.M', viewEntry.lastKm],
                ['Current K.M', viewEntry.odometer], ['Run K.M', viewEntry.runKm], ['Average', viewEntry.mileage && `${viewEntry.mileage} km/${viewEntry.unit || fuelUnit(viewEntry.fuelType)}`],
                ['Filling Location', viewEntry.pumpName], ['Payment Mode', viewEntry.paymentMode], ['Issued To', viewEntry.filledBy],
                ['Entry By', viewEntry.entryBy], ['Bill No', viewEntry.billNo], ['Remarks', viewEntry.remarks],
              ].map(([label, value]) => (
                <div className="detail-item" key={label}>
                  <label>{label}</label>
                  <div className="value">{value || '—'}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              {viewEntry.kmImage && <button className="btn btn-outline" onClick={() => openDocument(viewEntry.kmImage)}><Gauge size={14} /> View K.M Reading Photo</button>}
              {viewEntry.billImage && <button className="btn btn-outline" onClick={() => openDocument(viewEntry.billImage)}><FileText size={14} /> View Fuel Bill</button>}
            </div>
          </>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title={deleteTarget?.type === 'slip' ? 'Delete Slip' : 'Delete Fuel Entry'}
        message={deleteTarget?.type === 'slip'
          ? `Delete slip ${deleteTarget?.item.slipNo} (${deleteTarget?.item.registrationNo})?`
          : `Delete fuel entry ${deleteTarget?.item.fuelNo} (${deleteTarget?.item.registrationNo})? This cannot be undone.`}
        confirmLabel="Delete"
      />
    </div>
  );
};

export default FuelEntries;
