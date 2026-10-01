// pages/DailyTrips.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Route, Plus, Search, X, Edit2, Trash2, Eye, Play, CheckCircle2, Calendar, Gauge, IndianRupee,
  Car, Download, User, MapPin, ArrowLeftRight, Clock, Wallet, Phone, Briefcase
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getCars, getTrips, addTrip, updateTrip, deleteTrip, getLastOdometer, onStoreUpdate } from '../store/dataStore';
import { formatDate, today } from '../utils/dateUtils';
import { downloadCsv, num, inr, tripExpense } from '../utils/exportUtils';
import { useAuth, PAGE_KEYS } from '../context/AuthContext';
import { ITEMS_PER_PAGE } from '../constants';
import Modal from '../components/ui/Modal';
import Pagination from '../components/ui/Pagination';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import StatTile from '../components/ui/StatTile';
import ReadOnlyNotice from '../components/shared/ReadOnlyNotice';

const TRIP_STATUSES = ['Scheduled', 'In Progress', 'Completed', 'Cancelled'];
const TRIP_PURPOSES = ['Client Meeting', 'Site Visit', 'Material Pickup', 'Airport Drop', 'Staff Pickup / Drop', 'Bank Work', 'Vendor Visit', 'Management Travel', 'Other'];
const STATUS_STYLE = {
  Scheduled: { color: '#0369a1', bg: '#e0f2fe' },
  'In Progress': { color: '#b45309', bg: '#fef3c7' },
  Completed: { color: '#047857', bg: '#d1fae5' },
  Cancelled: { color: '#64748b', bg: '#f1f5f9' },
};
const AVATAR_COLORS = [['#dbeafe', '#1d4ed8'], ['#dcfce7', '#15803d'], ['#fef3c7', '#b45309'], ['#f3e8ff', '#7e22ce'], ['#ffe4e6', '#be123c'], ['#e0f2fe', '#0369a1']];

const EMPTY_TRIP = {
  date: today(), vehicleId: '', driverName: '', driverMobile: '', tripType: 'Local', purpose: TRIP_PURPOSES[0],
  department: '', fromLocation: '', toLocation: '', startTime: '', endTime: '', startKm: '', endKm: '',
  tollAmount: '', parkingAmount: '', otherExpense: '', billableAmount: '', status: 'Scheduled', remarks: '',
};

const initials = (name) => String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
const avatarColor = (name) => AVATAR_COLORS[String(name || '').split('').reduce((s, c) => s + c.charCodeAt(0), 0) % AVATAR_COLORS.length];
const nowTime = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

// "09:15" + "13:40" → "4h 25m"
const durationText = (start, end) => {
  if (!start || !end) return null;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let mins = eh * 60 + em - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60;
  if (mins === 0) return null;
  return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}m`;
};

const dayLabel = (iso) => {
  const t = today();
  const y = new Date(); y.setDate(y.getDate() - 1);
  const yIso = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;
  const tm = new Date(); tm.setDate(tm.getDate() + 1);
  const tmIso = `${tm.getFullYear()}-${String(tm.getMonth() + 1).padStart(2, '0')}-${String(tm.getDate()).padStart(2, '0')}`;
  if (iso === t) return 'Today';
  if (iso === yIso) return 'Yesterday';
  if (iso === tmIso) return 'Tomorrow';
  return new Date(iso).toLocaleDateString('en-IN', { weekday: 'long' });
};

const StatusPill = ({ status }) => {
  const st = STATUS_STYLE[status] || STATUS_STYLE.Cancelled;
  return <span className={`status-pill ${status === 'In Progress' ? 'live' : ''}`} style={{ color: st.color, background: st.bg }}>{status}</span>;
};

const Section = ({ icon: Icon, color, bg, title, hint, children }) => (
  <div className="trip-section">
    <div className="trip-section-title">
      <span className="icon" style={{ background: bg, color }}><Icon size={16} /></span>
      {title}
      {hint && <span className="hint">{hint}</span>}
    </div>
    {children}
  </div>
);

const MoneyInput = ({ value, onChange, placeholder }) => (
  <div className="input-prefix">
    <span>₹</span>
    <input type="number" min="0" className="form-input" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder || '0'} />
  </div>
);

// ─── TRIP FORM MODAL ──────────────────────────────────────────────────────────
const TripForm = ({ trip, cars, trips, presetStatus, onClose }) => {
  const isEdit = !!trip?.id;
  const [form, setForm] = useState(() => ({
    ...EMPTY_TRIP, ...(trip || {}),
    ...(presetStatus ? { status: presetStatus } : {}),
    ...(presetStatus === 'Completed' && !trip?.endTime ? { endTime: nowTime() } : {}),
  }));
  const [saving, setSaving] = useState(false);
  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const car = cars.find(c => c.vehicleId === form.vehicleId);
  const lastOdo = form.vehicleId ? getLastOdometer(form.vehicleId) : '';
  const drivers = useMemo(() => [...new Set([...cars.map(c => c.servicePersonName), ...trips.map(t => t.driverName)].filter(Boolean))].sort(), [cars, trips]);
  const places = useMemo(() => [...new Set(trips.flatMap(t => [t.fromLocation, t.toLocation]).filter(Boolean))].sort(), [trips]);
  const departments = useMemo(() => [...new Set(trips.map(t => t.department).filter(Boolean))].sort(), [trips]);

  const onVehicleChange = (vehicleId) => {
    const c = cars.find(x => x.vehicleId === vehicleId);
    const lastTrip = [...trips].filter(t => t.vehicleId === vehicleId).sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
    setForm(f => ({
      ...f,
      vehicleId,
      driverName: f.driverName || c?.servicePersonName || '',
      driverMobile: f.driverMobile || c?.servicePersonMobileNo || '',
      fromLocation: f.fromLocation || lastTrip?.fromLocation || '',
      startKm: isEdit ? f.startKm : String(getLastOdometer(vehicleId) || ''),
    }));
  };

  const onDriverChange = (name) => {
    const c = cars.find(x => x.servicePersonName === name);
    const prev = trips.find(t => t.driverName === name && t.driverMobile);
    setForm(f => ({ ...f, driverName: name, driverMobile: c?.servicePersonMobileNo || prev?.driverMobile || f.driverMobile }));
  };

  const onStatusChange = (status) => setForm(f => ({
    ...f,
    status,
    startTime: (status === 'In Progress' || status === 'Completed') && !f.startTime ? nowTime() : f.startTime,
    endTime: status === 'Completed' && !f.endTime ? nowTime() : f.endTime,
  }));

  const distance = form.startKm !== '' && form.endKm !== '' ? num(form.endKm) - num(form.startKm) : null;
  const duration = durationText(form.startTime, form.endTime);
  const expense = tripExpense(form);
  const needsEnd = form.status === 'Completed';
  const needsStart = form.status === 'In Progress' || needsEnd;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.vehicleId) return toast.error('Please select a vehicle');
    if (!form.toLocation.trim()) return toast.error('Please enter destination');
    if (needsStart && form.startKm === '') return toast.error('Start KM (odometer) is required');
    if (needsEnd && form.endKm === '') return toast.error('End KM is required to complete a trip');
    if (distance !== null && distance < 0) return toast.error('End KM cannot be less than Start KM');

    const payload = { ...form, carName: car?.carName || '', registrationNo: car?.registrationNo || '' };
    setSaving(true);
    try {
      if (isEdit) {
        await updateTrip(trip.id, payload);
        toast.success(presetStatus === 'Completed' ? `${trip.tripNo} completed` : 'Trip updated');
      } else {
        const saved = await addTrip(payload);
        toast.success(`Trip ${saved.tripNo} added`);
      }
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to save trip');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* 1. Vehicle & Driver */}
      <Section icon={Car} color="#059669" bg="#ecfdf5" title="Vehicle & Driver">
        <div className="form-grid-3">
          <div className="form-group span-2">
            <label className="form-label">Vehicle <span className="required">*</span></label>
            <select className="form-select" value={form.vehicleId} onChange={e => onVehicleChange(e.target.value)} disabled={isEdit}>
              <option value="">Select vehicle...</option>
              {cars.map(c => <option key={c.vehicleId} value={c.vehicleId}>{c.registrationNo} — {c.carName}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Trip Date <span className="required">*</span></label>
            <input type="date" className="form-input" required value={form.date} onChange={e => set('date', e.target.value)} />
          </div>
        </div>

        {car && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 12, padding: '10px 14px', borderRadius: 12, background: '#f8fafc', border: '1px dashed #cbd5e1' }}>
            <span className="plate">{car.registrationNo}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{car.carName}</span>
            <span style={{ fontSize: 12, color: '#64748b' }}>{car.vehicleType || 'Car'} · {car.fuelType}</span>
            <span style={{ marginLeft: 'auto', fontSize: 12, color: '#64748b' }}>Last odometer: <strong style={{ color: '#0f172a' }}>{lastOdo ? `${num(lastOdo).toLocaleString('en-IN')} km` : '—'}</strong></span>
          </div>
        )}

        <div className="form-grid-2" style={{ marginTop: 14 }}>
          <div className="form-group">
            <label className="form-label">Driver Name</label>
            <input className="form-input" list="trip-drivers" value={form.driverName} onChange={e => onDriverChange(e.target.value)} placeholder="Auto from vehicle" />
            <datalist id="trip-drivers">{drivers.map(d => <option key={d} value={d} />)}</datalist>
          </div>
          <div className="form-group">
            <label className="form-label">Driver Mobile</label>
            <input className="form-input" inputMode="numeric" maxLength={10} value={form.driverMobile} onChange={e => set('driverMobile', e.target.value.replace(/\D/g, ''))} placeholder="10-digit mobile" />
          </div>
        </div>
      </Section>

      {/* 2. Route & Purpose */}
      <Section icon={MapPin} color="#0284c7" bg="#e0f2fe" title="Route & Purpose">
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)', gap: 10, alignItems: 'end' }}>
          <div className="form-group">
            <label className="form-label">From</label>
            <input className="form-input" list="trip-places" value={form.fromLocation} onChange={e => set('fromLocation', e.target.value)} placeholder="Starting point" />
          </div>
          <button type="button" className="btn btn-outline" title="Swap" style={{ padding: '10px 11px', marginBottom: 1 }} onClick={() => setForm(f => ({ ...f, fromLocation: f.toLocation, toLocation: f.fromLocation }))}>
            <ArrowLeftRight size={15} />
          </button>
          <div className="form-group">
            <label className="form-label">To <span className="required">*</span></label>
            <input className="form-input" list="trip-places" value={form.toLocation} onChange={e => set('toLocation', e.target.value)} placeholder="Destination" />
          </div>
        </div>
        <datalist id="trip-places">{places.map(p => <option key={p} value={p} />)}</datalist>

        <div className="form-grid-3" style={{ marginTop: 14 }}>
          <div className="form-group">
            <label className="form-label">Trip Type</label>
            <div className="seg">
              {['Local', 'Outstation'].map(t => (
                <button type="button" key={t} className={form.tripType === t ? 'active' : ''} style={{ '--seg-color': '#0284c7' }} onClick={() => set('tripType', t)}>{t}</button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Purpose</label>
            <select className="form-select" value={form.purpose} onChange={e => set('purpose', e.target.value)}>
              {TRIP_PURPOSES.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Department / Used By</label>
            <input className="form-input" list="trip-depts" value={form.department} onChange={e => set('department', e.target.value)} placeholder="e.g. Sales" />
            <datalist id="trip-depts">{departments.map(d => <option key={d} value={d} />)}</datalist>
          </div>
        </div>
      </Section>

      {/* 3. Status, time & odometer */}
      <Section icon={Gauge} color="#d97706" bg="#fffbeb" title="Status, Time & Odometer" hint={needsEnd ? 'Start & End KM required' : needsStart ? 'Start KM required' : ''}>
        <div className="form-group" style={{ marginBottom: 14 }}>
          <label className="form-label">Trip Status</label>
          <div className="seg">
            {TRIP_STATUSES.map(s => (
              <button type="button" key={s} className={form.status === s ? 'active' : ''} style={{ '--seg-color': STATUS_STYLE[s].color }} onClick={() => onStatusChange(s)}>
                {s === 'Scheduled' && <Calendar size={13} />}
                {s === 'In Progress' && <Play size={13} />}
                {s === 'Completed' && <CheckCircle2 size={13} />}
                {s === 'Cancelled' && <X size={13} />}
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="form-grid-2">
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Start Time</label>
              <input type="time" className="form-input" value={form.startTime} onChange={e => set('startTime', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">End Time</label>
              <input type="time" className="form-input" value={form.endTime} onChange={e => set('endTime', e.target.value)} />
            </div>
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Start KM {needsStart && <span className="required">*</span>}</label>
              <div className="input-prefix has-suffix">
                <input type="number" min="0" className="form-input" value={form.startKm} onChange={e => set('startKm', e.target.value)} placeholder="Odometer" />
                <span className="suffix">km</span>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">End KM {needsEnd && <span className="required">*</span>}</label>
              <div className="input-prefix has-suffix">
                <input type="number" min="0" className={`form-input ${distance !== null && distance < 0 ? 'error' : ''}`} value={form.endKm} onChange={e => set('endKm', e.target.value)} placeholder="Odometer" />
                <span className="suffix">km</span>
              </div>
            </div>
          </div>
        </div>
        {distance !== null && distance < 0 && <div className="form-error" style={{ marginTop: 8 }}>End KM cannot be less than Start KM ({num(form.startKm).toLocaleString('en-IN')})</div>}
      </Section>

      {/* 4. Expenses */}
      <Section icon={Wallet} color="#7c3aed" bg="#f3e8ff" title="Trip Expenses" hint="Optional">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 }}>
          <div className="form-group"><label className="form-label">Toll</label><MoneyInput value={form.tollAmount} onChange={v => set('tollAmount', v)} /></div>
          <div className="form-group"><label className="form-label">Parking</label><MoneyInput value={form.parkingAmount} onChange={v => set('parkingAmount', v)} /></div>
          <div className="form-group"><label className="form-label">Other / Allowance</label><MoneyInput value={form.otherExpense} onChange={v => set('otherExpense', v)} /></div>
          <div className="form-group"><label className="form-label">Billable Amount</label><MoneyInput value={form.billableAmount} onChange={v => set('billableAmount', v)} placeholder="If charged" /></div>
        </div>
        <div className="form-group" style={{ marginTop: 14 }}>
          <label className="form-label">Remarks</label>
          <textarea className="form-textarea" rows={2} value={form.remarks} onChange={e => set('remarks', e.target.value)} placeholder="Any note about this trip" />
        </div>
      </Section>

      {/* Sticky summary + actions */}
      <div className="trip-footer">
        <div className="trip-summary">
          <div>Distance<strong style={{ color: distance !== null && distance < 0 ? '#dc2626' : undefined }}>{distance !== null ? `${distance.toLocaleString('en-IN')} km` : '—'}</strong></div>
          <div>Duration<strong>{duration || '—'}</strong></div>
          <div>Expense<strong>{inr(expense)}</strong></div>
        </div>
        <button type="button" className="btn btn-outline" onClick={onClose} disabled={saving}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving...' : presetStatus === 'Completed' ? 'Complete Trip' : isEdit ? 'Update Trip' : 'Save Trip'}
        </button>
      </div>
    </form>
  );
};

// ─── TRIP DETAIL ──────────────────────────────────────────────────────────────
const TripDetail = ({ trip }) => (
  <div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
      <span className="plate" style={{ fontSize: 14 }}>{trip.registrationNo}</span>
      <span style={{ fontWeight: 700 }}>{trip.carName}</span>
      <span style={{ marginLeft: 'auto' }}><StatusPill status={trip.status} /></span>
    </div>
    <div className="detail-grid">
      {[
        ['Trip No', trip.tripNo], ['Date', formatDate(trip.date)], ['Time', [trip.startTime, trip.endTime].filter(Boolean).join(' – ')],
        ['Driver', trip.driverName], ['Driver Mobile', trip.driverMobile], ['Duration', durationText(trip.startTime, trip.endTime)],
        ['From', trip.fromLocation], ['To', trip.toLocation], ['Trip Type', trip.tripType],
        ['Purpose', trip.purpose], ['Department', trip.department], ['Distance', trip.distance ? `${trip.distance} km` : ''],
        ['Start KM', trip.startKm], ['End KM', trip.endKm], ['Toll', trip.tollAmount && inr(trip.tollAmount)],
        ['Parking', trip.parkingAmount && inr(trip.parkingAmount)], ['Other Expense', trip.otherExpense && inr(trip.otherExpense)], ['Total Expense', inr(tripExpense(trip))],
        ['Billable Amount', trip.billableAmount && inr(trip.billableAmount)], ['Remarks', trip.remarks],
      ].map(([label, value]) => (
        <div className="detail-item" key={label}>
          <label>{label}</label>
          <div className="value">{value || '—'}</div>
        </div>
      ))}
    </div>
  </div>
);

// ─── PAGE ─────────────────────────────────────────────────────────────────────
const DailyTrips = () => {
  const { canEditPage } = useAuth();
  const canEdit = canEditPage(PAGE_KEYS.TRIPS);

  const [cars, setCars] = useState([]);
  const [trips, setTrips] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [formState, setFormState] = useState(null); // { trip, presetStatus }
  const [viewTrip, setViewTrip] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = useCallback(async () => {
    const [c, t] = await Promise.all([getCars(), getTrips()]);
    setCars(c);
    setTrips(t);
  }, []);

  useEffect(() => {
    load();
    return onStoreUpdate(load);
  }, [load]);

  const todayStr = today();
  const monthPrefix = todayStr.slice(0, 7);

  const stats = useMemo(() => {
    const todays = trips.filter(t => t.date === todayStr);
    const month = trips.filter(t => t.date?.startsWith(monthPrefix) && t.status === 'Completed');
    return {
      todayCount: todays.length,
      todayKm: todays.reduce((s, t) => s + num(t.distance), 0),
      running: trips.filter(t => t.status === 'In Progress').length,
      monthKm: month.reduce((s, t) => s + num(t.distance), 0),
      monthExpense: month.reduce((s, t) => s + tripExpense(t), 0),
      monthTrips: month.length,
    };
  }, [trips, todayStr, monthPrefix]);

  const baseFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return trips
      .filter(t => !vehicleFilter || t.vehicleId === vehicleFilter)
      .filter(t => (!fromDate || t.date >= fromDate) && (!toDate || t.date <= toDate))
      .filter(t => !q || [t.tripNo, t.carName, t.registrationNo, t.driverName, t.fromLocation, t.toLocation, t.purpose]
        .some(v => String(v || '').toLowerCase().includes(q)));
  }, [trips, vehicleFilter, fromDate, toDate, search]);

  const tabCount = (tab) => baseFiltered.filter(t => tab === 'All' || (tab === 'Today' ? t.date === todayStr : t.status === tab)).length;

  const filtered = useMemo(() => baseFiltered
    .filter(t => statusFilter === 'All' || (statusFilter === 'Today' ? t.date === todayStr : t.status === statusFilter))
    .sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.startTime || '').localeCompare(a.startTime || '')),
  [baseFiltered, statusFilter, todayStr]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
  const paged = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  const filteredKm = filtered.reduce((s, t) => s + num(t.distance), 0);
  const filteredExpense = filtered.reduce((s, t) => s + tripExpense(t), 0);

  // Day totals for the group header rows (over the full filtered list, not just this page)
  const dayTotals = useMemo(() => filtered.reduce((acc, t) => {
    const d = acc[t.date] || (acc[t.date] = { count: 0, km: 0, expense: 0 });
    d.count += 1; d.km += num(t.distance); d.expense += tripExpense(t);
    return acc;
  }, {}), [filtered]);

  const startTrip = async (trip) => {
    const startKm = trip.startKm || String(getLastOdometer(trip.vehicleId) || '');
    if (!startKm) {
      setFormState({ trip, presetStatus: 'In Progress' });
      return;
    }
    await updateTrip(trip.id, { status: 'In Progress', startKm, startTime: trip.startTime || nowTime() });
    toast.success(`${trip.tripNo} started`);
  };

  const exportCsv = () => {
    downloadCsv(`Daily_Trips_${todayStr}`, [
      { label: 'Trip No', value: t => t.tripNo },
      { label: 'Date', value: t => t.date },
      { label: 'Vehicle No', value: t => t.registrationNo },
      { label: 'Car', value: t => t.carName },
      { label: 'Driver', value: t => t.driverName },
      { label: 'Driver Mobile', value: t => t.driverMobile },
      { label: 'Type', value: t => t.tripType },
      { label: 'Purpose', value: t => t.purpose },
      { label: 'Department', value: t => t.department },
      { label: 'From', value: t => t.fromLocation },
      { label: 'To', value: t => t.toLocation },
      { label: 'Start Time', value: t => t.startTime },
      { label: 'End Time', value: t => t.endTime },
      { label: 'Start KM', value: t => t.startKm },
      { label: 'End KM', value: t => t.endKm },
      { label: 'Distance (km)', value: t => t.distance },
      { label: 'Toll', value: t => t.tollAmount },
      { label: 'Parking', value: t => t.parkingAmount },
      { label: 'Other Expense', value: t => t.otherExpense },
      { label: 'Total Expense', value: t => tripExpense(t) },
      { label: 'Billable', value: t => t.billableAmount },
      { label: 'Status', value: t => t.status },
      { label: 'Remarks', value: t => t.remarks },
    ], filtered);
  };

  const FILTER_TABS = ['All', 'Today', ...TRIP_STATUSES];
  const hasFilters = search || vehicleFilter || fromDate || toDate;

  return (
    <div>
      {!canEdit && <ReadOnlyNotice moduleName="Daily Trips" />}

      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 36, height: 36, borderRadius: 10, background: '#e0f2fe', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7' }}>
              <Route size={20} />
            </span>
            Daily Trips
          </h1>
          <p className="page-subtitle">Daily trip entry with odometer readings, routes, drivers and trip expenses</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline" onClick={exportCsv}><Download size={15} /> Export</button>
          {canEdit && (
            <button className="btn btn-primary" onClick={() => setFormState({ trip: null })}>
              <Plus size={16} strokeWidth={2.5} /> Add Trip
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatTile label="Today's Trips" value={stats.todayCount} sub={`${stats.todayKm.toLocaleString('en-IN')} km so far today`} icon={Calendar} color="#0284c7" bg="#e0f2fe" />
        <StatTile label="Running Now" value={stats.running} sub="Trips in progress" icon={Play} color="#d97706" bg="#fffbeb" />
        <StatTile label="KM This Month" value={stats.monthKm.toLocaleString('en-IN')} sub={`${stats.monthTrips} completed trips`} icon={Gauge} color="#059669" bg="#ecfdf5" />
        <StatTile label="Trip Expense (Month)" value={inr(stats.monthExpense)} sub="Toll + parking + other" icon={IndianRupee} color="#7c3aed" bg="#f3e8ff" />
      </div>

      <div className="data-table-container">
        {/* Status tabs */}
        <div style={{ display: 'flex', gap: 4, padding: '14px 16px 0', borderBottom: '1px solid #eef2f5', overflowX: 'auto' }}>
          {FILTER_TABS.map(tab => {
            const active = statusFilter === tab;
            const color = STATUS_STYLE[tab]?.color || '#059669';
            return (
              <button
                key={tab}
                onClick={() => { setStatusFilter(tab); setPage(1); }}
                style={{
                  border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit',
                  padding: '9px 14px 11px', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap',
                  color: active ? color : '#64748b', borderBottom: `2.5px solid ${active ? color : 'transparent'}`, marginBottom: -1,
                }}
              >
                {tab}
                <span style={{ marginLeft: 6, fontSize: 11, padding: '1px 7px', borderRadius: 999, background: active ? `${color}18` : '#f1f5f9', color: active ? color : '#64748b' }}>{tabCount(tab)}</span>
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="filter-bar" style={{ flexWrap: 'wrap' }}>
          <div className="search-wrapper">
            <Search size={14} className="search-icon" />
            <input className="search-input" placeholder="Search trip, vehicle, driver, place..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <select className="form-select" style={{ width: 'auto', minWidth: 190 }} value={vehicleFilter} onChange={e => { setVehicleFilter(e.target.value); setPage(1); }}>
            <option value="">All Vehicles</option>
            {cars.map(c => <option key={c.vehicleId} value={c.vehicleId}>{c.registrationNo} — {c.carName}</option>)}
          </select>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="date" className="form-input" style={{ width: 'auto' }} value={fromDate} onChange={e => { setFromDate(e.target.value); setPage(1); }} title="From date" />
            <span style={{ color: '#94a3b8', fontSize: 12 }}>to</span>
            <input type="date" className="form-input" style={{ width: 'auto' }} value={toDate} onChange={e => { setToDate(e.target.value); setPage(1); }} title="To date" />
          </div>
          {hasFilters && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setVehicleFilter(''); setFromDate(''); setToDate(''); }}>
              <X size={14} /> Clear
            </button>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 14, fontSize: 12.5, color: '#64748b', fontWeight: 600 }}>
            <span><strong style={{ color: '#0f172a' }}>{filtered.length}</strong> trips</span>
            <span><strong style={{ color: '#0f172a' }}>{filteredKm.toLocaleString('en-IN')}</strong> km</span>
            <span><strong style={{ color: '#0f172a' }}>{inr(filteredExpense)}</strong> expense</span>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          {paged.length === 0 ? (
            <EmptyState icon={Route} title="No trips found" message="Add a daily trip entry or adjust the filters." />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Trip</th>
                  <th>Vehicle</th>
                  <th>Driver</th>
                  <th>Route</th>
                  <th style={{ textAlign: 'right' }}>Distance</th>
                  <th style={{ textAlign: 'right' }}>Expense</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((t, i) => {
                  const newDay = i === 0 || paged[i - 1].date !== t.date;
                  const dt = dayTotals[t.date];
                  const [abg, afg] = avatarColor(t.driverName);
                  const exp = tripExpense(t);
                  return [
                    newDay && (
                      <tr key={`day-${t.date}`} className="group-row">
                        <td colSpan={8}>
                          <span style={{ color: '#0f172a' }}>{dayLabel(t.date)}</span>
                          <span style={{ color: '#94a3b8', margin: '0 8px' }}>·</span>{formatDate(t.date)}
                          <span style={{ float: 'right', color: '#64748b' }}>{dt.count} trips · {dt.km.toLocaleString('en-IN')} km · {inr(dt.expense)}</span>
                        </td>
                      </tr>
                    ),
                    <tr key={t.id}>
                      <td>
                        <div style={{ fontFamily: 'monospace', fontWeight: 800, color: '#059669', fontSize: 13 }}>{t.tripNo}</div>
                        <div style={{ fontSize: 11.5, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
                          <Clock size={11} /> {[t.startTime, t.endTime].filter(Boolean).join(' – ') || 'Time not set'}
                        </div>
                      </td>
                      <td>
                        <span className="plate">{t.registrationNo}</span>
                        <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 4 }}>{t.carName}</div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                          <span className="avatar" style={{ background: abg, color: afg }}>{initials(t.driverName)}</span>
                          <div>
                            <div style={{ fontWeight: 700, color: '#0f172a' }}>{t.driverName || '—'}</div>
                            {t.driverMobile && <div style={{ fontSize: 11.5, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 3 }}><Phone size={10} /> {t.driverMobile}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ whiteSpace: 'normal', minWidth: 220 }}>
                        <div className="route-line">
                          <span className="dot" style={{ background: '#10b981' }} /><span style={{ color: '#475569' }}>{t.fromLocation || '—'}</span>
                          <span className="bar" /><span />
                          <span className="dot" style={{ background: '#ef4444' }} /><span style={{ fontWeight: 700, color: '#0f172a' }}>{t.toLocation}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: t.tripType === 'Outstation' ? '#f3e8ff' : '#f1f5f9', color: t.tripType === 'Outstation' ? '#7e22ce' : '#475569' }}>{t.tripType}</span>
                          <span style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 7px', borderRadius: 6, background: '#f8fafc', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: 3 }}><Briefcase size={10} /> {t.purpose}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 800, fontSize: 14, color: t.distance ? '#0f172a' : '#cbd5e1' }}>{t.distance ? `${num(t.distance).toLocaleString('en-IN')} km` : '—'}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>
                          {t.startKm ? `${num(t.startKm).toLocaleString('en-IN')} → ${t.endKm ? num(t.endKm).toLocaleString('en-IN') : '…'}` : 'Not started'}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, color: exp ? '#0f172a' : '#cbd5e1' }}>{exp ? inr(exp) : '—'}</div>
                        {exp > 0 && (
                          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>
                            {[num(t.tollAmount) && `Toll ${num(t.tollAmount)}`, num(t.parkingAmount) && `Park ${num(t.parkingAmount)}`, num(t.otherExpense) && `Other ${num(t.otherExpense)}`].filter(Boolean).join(' · ')}
                          </div>
                        )}
                      </td>
                      <td><StatusPill status={t.status} /></td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                          {canEdit && t.status === 'Scheduled' && (
                            <button className="btn btn-outline btn-xs" style={{ color: '#b45309', borderColor: '#fde68a' }} onClick={() => startTrip(t)}><Play size={12} /> Start</button>
                          )}
                          {canEdit && t.status === 'In Progress' && (
                            <button className="btn btn-primary btn-xs" onClick={() => setFormState({ trip: t, presetStatus: 'Completed' })}><CheckCircle2 size={12} /> Complete</button>
                          )}
                          <button className="btn btn-ghost btn-xs" title="View" onClick={() => setViewTrip(t)}><Eye size={14} /></button>
                          {canEdit && <button className="btn btn-ghost btn-xs" title="Edit" onClick={() => setFormState({ trip: t })}><Edit2 size={14} /></button>}
                          {canEdit && <button className="btn btn-ghost btn-xs" title="Delete" style={{ color: '#ef4444' }} onClick={() => setDeleteTarget(t)}><Trash2 size={14} /></button>}
                        </div>
                      </td>
                    </tr>,
                  ];
                })}
              </tbody>
            </table>
          )}
        </div>
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} totalItems={filtered.length} itemsPerPage={ITEMS_PER_PAGE} />
      </div>

      <Modal
        isOpen={!!formState}
        onClose={() => setFormState(null)}
        title={formState?.trip?.id ? (formState.presetStatus === 'Completed' ? `Complete Trip — ${formState.trip.tripNo}` : `Edit Trip — ${formState.trip.tripNo}`) : 'New Daily Trip Entry'}
        icon={formState?.presetStatus === 'Completed' ? CheckCircle2 : Route}
        size="lg"
      >
        {formState && <TripForm trip={formState.trip} presetStatus={formState.presetStatus} cars={cars} trips={trips} onClose={() => setFormState(null)} />}
      </Modal>

      <Modal isOpen={!!viewTrip} onClose={() => setViewTrip(null)} title={`Trip Details — ${viewTrip?.tripNo || ''}`} icon={User} size="lg">
        {viewTrip && <TripDetail trip={viewTrip} />}
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => { await deleteTrip(deleteTarget.id); toast.success('Trip deleted'); setDeleteTarget(null); }}
        title="Delete Trip"
        message={`Delete trip ${deleteTarget?.tripNo} (${deleteTarget?.registrationNo})? This cannot be undone.`}
        confirmLabel="Delete"
      />
    </div>
  );
};

export default DailyTrips;
