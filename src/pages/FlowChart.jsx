// pages/FlowChart.jsx
// Visual map of how every module is linked and how each workflow moves step by step (with live counts)
import { useState, useEffect, useCallback, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GitBranch, Car, Shield, Clock, AlertTriangle, CreditCard, Route, Fuel, Wrench, Store, CheckCircle,
  Truck, IndianRupee, BarChart3, LayoutDashboard, Ticket, Gauge, FileWarning, ChevronRight, ArrowDown,
  Play, CheckCircle2, ClipboardCheck, Banknote, Bell
} from 'lucide-react';
import {
  getCars, getInsurance, getChallans, getFastags, getTrips, getFuels, getFuelSlips, getRepairs,
  getVendorOffers, getDeliveries, getPayments, getClaims, checkHasEmi, onStoreUpdate
} from '../store/dataStore';
import { isStage1Completed, isStage2Completed, isStage3Completed } from '../utils/claimWorkflow';
import { daysUntil } from '../utils/dateUtils';

// ─── MODULE MAP (SVG) ─────────────────────────────────────────────────────────
const MAP_W = 1100;
const MAP_H = 510;
const MASTER = { x: 30, y: 190, w: 200, h: 120 };
const GROUPS = [
  {
    key: 'compliance', y: 20, title: 'Finance & Compliance', color: '#0284c7', bg: '#e0f2fe',
    items: [['Vehicle on EMI', '/vehicle-emi'], ['Insurance', '/insurance'], ['Challan', '/challans'], ['Fastag', '/fastags']],
  },
  {
    key: 'operations', y: 140, title: 'Daily Operations', color: '#d97706', bg: '#fffbeb',
    items: [['Daily Trips', '/trips'], ['Fuel Management', '/fuel']],
  },
  {
    key: 'repair', y: 260, title: 'Repair Management', color: '#7c3aed', bg: '#f3e8ff',
    items: [['Car Repair', '/car-repair'], ['Vendor Offers', '/vendor-offers'], ['Approvals', '/approvals'], ['Delivery', '/delivery'], ['Payment', '/payment']],
  },
  {
    key: 'claims', y: 404, title: 'Accident / Insurance Claims', color: '#dc2626', bg: '#fef2f2',
    items: [['Claim of accident', '/accident-claims/claim-of-accident'], ['Process', '/accident-claims/process-of-claim'], ['Settlement', '/accident-claims/claim-settlement']],
  },
];
const GROUP_X = 330;
const GROUP_W = 270;
const GROUP_H = 96;
const BUS_X = 690;
const OUTPUTS = [
  { title: 'Vehicle Reports', sub: 'Vehicle-wise cost, KM, average, compliance', to: '/reports', y: 120, icon: BarChart3 },
  { title: 'Dashboard', sub: 'Fleet KPIs, reminders & alerts', to: '/', y: 300, icon: LayoutDashboard },
];
const OUT_X = 800;
const OUT_W = 270;
const OUT_H = 90;

const curve = (x1, y1, x2, y2) => {
  const mx = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
};

const ModuleMap = ({ navigate }) => {
  const masterOut = { x: MASTER.x + MASTER.w, y: MASTER.y + MASTER.h / 2 };
  const groupMid = (g) => g.y + GROUP_H / 2;
  const busTop = groupMid(GROUPS[0]);
  const busBottom = groupMid(GROUPS[GROUPS.length - 1]);
  const repair = GROUPS.find(g => g.key === 'repair');
  const claims = GROUPS.find(g => g.key === 'claims');

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} style={{ width: '100%', minWidth: 900, height: 'auto', display: 'block' }}>
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
          </marker>
          <marker id="arrow-red" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#dc2626" />
          </marker>
        </defs>

        {/* Master → groups */}
        {GROUPS.map(g => (
          <path key={`m-${g.key}`} d={curve(masterOut.x, masterOut.y, GROUP_X - 4, groupMid(g))} fill="none" stroke="#94a3b8" strokeWidth="1.6" markerEnd="url(#arrow)" />
        ))}

        {/* Groups → collector bus → outputs */}
        {GROUPS.map(g => (
          <path key={`b-${g.key}`} d={`M ${GROUP_X + GROUP_W} ${groupMid(g)} H ${BUS_X}`} fill="none" stroke="#cbd5e1" strokeWidth="1.6" />
        ))}
        <path d={`M ${BUS_X} ${busTop} V ${busBottom}`} fill="none" stroke="#cbd5e1" strokeWidth="1.6" />
        {OUTPUTS.map(o => (
          <path key={`o-${o.title}`} d={curve(BUS_X, Math.min(Math.max(o.y + OUT_H / 2, busTop), busBottom), OUT_X - 4, o.y + OUT_H / 2)} fill="none" stroke="#059669" strokeWidth="2" markerEnd="url(#arrow)" />
        ))}
        <text x={BUS_X + 8} y={busTop - 8} fontSize="10.5" fontWeight="700" fill="#94a3b8">ALL DATA FLOWS INTO</text>

        {/* Cross-link: Repair → Claims (insurance to be claimed) */}
        <path d={`M ${GROUP_X + 40} ${repair.y + GROUP_H} V ${claims.y - 4}`} fill="none" stroke="#dc2626" strokeWidth="1.6" strokeDasharray="5 4" markerEnd="url(#arrow-red)" />
        <text x={GROUP_X + 50} y={repair.y + GROUP_H + 30} fontSize="10.5" fontWeight="700" fill="#dc2626">Insurance to be claimed = Yes → claim auto-created</text>

        {/* Master node */}
        <foreignObject x={MASTER.x} y={MASTER.y} width={MASTER.w} height={MASTER.h}>
          <div onClick={() => navigate('/purchase-car')} style={{
            height: '100%', boxSizing: 'border-box', cursor: 'pointer', borderRadius: 16, padding: '14px 16px',
            background: 'linear-gradient(135deg, #059669, #047857)', color: '#fff', boxShadow: '0 8px 20px rgba(5,150,105,0.25)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: 15 }}><Car size={18} /> Purchase Car</div>
            <div style={{ fontSize: 11.5, opacity: 0.9, marginTop: 6, lineHeight: 1.4 }}>Vehicle Master — every module uses this vehicle data (Reg No, fuel, driver, firm)</div>
          </div>
        </foreignObject>

        {/* Group nodes */}
        {GROUPS.map(g => (
          <foreignObject key={g.key} x={GROUP_X} y={g.y} width={GROUP_W} height={GROUP_H}>
            <div style={{ height: '100%', boxSizing: 'border-box', borderRadius: 14, border: `1.5px solid ${g.color}40`, background: '#fff', padding: '10px 12px', boxShadow: '0 2px 8px rgba(15,23,42,0.05)' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: g.color, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>{g.title}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
                {g.items.map(([label, to], i) => (
                  <Fragment key={label}>
                    {g.key !== 'compliance' && i > 0 && <span style={{ color: '#cbd5e1', fontSize: 11 }}>→</span>}
                    <span onClick={() => navigate(to)} style={{ cursor: 'pointer', fontSize: 11.5, fontWeight: 700, padding: '3px 8px', borderRadius: 7, background: g.bg, color: g.color }}>{label}</span>
                  </Fragment>
                ))}
              </div>
            </div>
          </foreignObject>
        ))}

        {/* Output nodes */}
        {OUTPUTS.map(o => (
          <foreignObject key={o.title} x={OUT_X} y={o.y} width={OUT_W} height={OUT_H}>
            <div onClick={() => navigate(o.to)} style={{ height: '100%', boxSizing: 'border-box', cursor: 'pointer', borderRadius: 14, border: '2px solid #059669', background: '#ecfdf5', padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, color: '#065f46', fontSize: 14.5 }}><o.icon size={17} /> {o.title}</div>
              <div style={{ fontSize: 11.5, color: '#047857', marginTop: 5 }}>{o.sub}</div>
            </div>
          </foreignObject>
        ))}
      </svg>
    </div>
  );
};

// ─── STEP FLOWS ───────────────────────────────────────────────────────────────
const Step = ({ step, index, color, navigate }) => (
  <div
    onClick={() => step.to && navigate(step.to)}
    style={{
      flex: '1 1 0', minWidth: 150, background: '#fff', border: '1.5px solid #e8eef3', borderTop: `3px solid ${color}`,
      borderRadius: 14, padding: '12px 14px', cursor: step.to ? 'pointer' : 'default', position: 'relative',
      transition: 'box-shadow 0.15s ease',
    }}
    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 16px rgba(15,23,42,0.08)'; }}
    onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <span style={{ width: 22, height: 22, borderRadius: '50%', background: color, color: '#fff', fontSize: 11, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{index + 1}</span>
      <step.icon size={15} style={{ color, flexShrink: 0 }} />
      <span style={{ fontWeight: 800, fontSize: 13, color: '#0f172a' }}>{step.title}</span>
    </div>
    <div style={{ fontSize: 11.5, color: '#64748b', lineHeight: 1.45, minHeight: 34 }}>{step.desc}</div>
    {step.count !== undefined && (
      <div style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 800, padding: '3px 9px', borderRadius: 999, background: step.alert ? '#fef3c7' : '#f1f5f9', color: step.alert ? '#b45309' : '#475569' }}>
        {step.count} {step.countLabel}
      </div>
    )}
  </div>
);

const FlowCard = ({ flow, navigate }) => (
  <div className="section-card print-break" style={{ marginBottom: 18 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
      <span style={{ width: 34, height: 34, borderRadius: 10, background: flow.bg, color: flow.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><flow.icon size={18} /></span>
      <div>
        <div style={{ fontWeight: 800, fontSize: 15.5, color: '#0f172a' }}>{flow.title}</div>
        <div style={{ fontSize: 12.5, color: '#64748b' }}>{flow.desc}</div>
      </div>
    </div>
    <div style={{ display: 'flex', alignItems: 'stretch', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
      {flow.steps.map((step, i) => (
        <Fragment key={step.title}>
          {i > 0 && <div style={{ display: 'flex', alignItems: 'center', color: '#cbd5e1' }}><ChevronRight size={20} /></div>}
          <Step step={step} index={i} color={flow.color} navigate={navigate} />
        </Fragment>
      ))}
    </div>
    {flow.branch && (
      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 12.5, padding: '9px 12px', borderRadius: 10, background: '#fef2f2', border: '1px dashed #fca5a5', color: '#991b1b', fontWeight: 600 }}>
        <ArrowDown size={14} /> {flow.branch.text}
        <span onClick={() => navigate(flow.branch.to)} style={{ marginLeft: 'auto', cursor: 'pointer', fontWeight: 800, textDecoration: 'underline' }}>{flow.branch.link}</span>
      </div>
    )}
  </div>
);

// ─── PAGE ─────────────────────────────────────────────────────────────────────
const FlowChart = () => {
  const navigate = useNavigate();
  const [d, setD] = useState(null);

  const load = useCallback(async () => {
    const [cars, insurance, challans, fastags, trips, fuels, slips, repairs, offers, deliveries, payments, claims] = await Promise.all([
      getCars(), getInsurance(), getChallans(), getFastags(), getTrips(), getFuels(), getFuelSlips(), getRepairs(),
      getVendorOffers(), getDeliveries(), getPayments(), getClaims(),
    ]);
    setD({ cars, insurance, challans, fastags, trips, fuels, slips, repairs, offers, deliveries, payments, claims });
  }, []);

  useEffect(() => {
    load();
    return onStoreUpdate(load);
  }, [load]);

  if (!d) return null;

  const repairsBy = (status) => d.repairs.filter(r => r.repairStatus === status).length;
  const deliveredNos = new Set(d.deliveries.filter(x => x.deliveryStatus === 'Delivery Submitted' || x.actualDate3).map(x => x.repairNo));
  const approvedNotDelivered = d.offers.filter(o => o.approvalStatus === 'Approved' && !deliveredNos.has(o.repairNo)).length;
  const insuranceDue = d.insurance.filter(i => { const n = daysUntil(i.odEndDate || i.validityDate); return n !== null && n <= 30; }).length;
  const carsWithoutFastag = d.cars.filter(c => !d.fastags.some(f => f.vehicleId === c.vehicleId)).length;

  const FLOWS = [
    {
      title: 'Vehicle Onboarding', desc: 'A new vehicle is added once and becomes available in every module',
      icon: Car, color: '#059669', bg: '#ecfdf5',
      steps: [
        { icon: Car, title: 'Purchase Car', desc: 'Add vehicle master: Reg No, type, fuel, firm, driver', to: '/purchase-car', count: d.cars.length, countLabel: 'vehicles' },
        { icon: Shield, title: 'Insurance', desc: 'OD / TP / PA policy & renewal dates', to: '/insurance', count: d.insurance.length, countLabel: 'policies' },
        { icon: Clock, title: 'Vehicle on EMI', desc: 'Loan, EMI amount, tenure & next due', to: '/vehicle-emi', count: d.cars.filter(checkHasEmi).length, countLabel: 'on EMI' },
        { icon: CreditCard, title: 'Fastag', desc: 'Tag ID, bank, wallet balance', to: '/fastags', count: carsWithoutFastag, countLabel: 'without Fastag', alert: carsWithoutFastag > 0 },
        { icon: CheckCircle2, title: 'Ready to Use', desc: 'Vehicle appears in Trips, Fuel, Repair & Reports', to: '/reports' },
      ],
    },
    {
      title: 'Daily Trip Flow', desc: 'Every vehicle movement with odometer readings — KM feeds fuel average & reports',
      icon: Route, color: '#0284c7', bg: '#e0f2fe',
      steps: [
        { icon: Ticket, title: 'Add Trip', desc: 'Vehicle → driver & last odometer auto-filled', to: '/trips', count: d.trips.filter(t => t.status === 'Scheduled').length, countLabel: 'scheduled' },
        { icon: Play, title: 'Start Trip', desc: 'Status In Progress, Start KM & time recorded', to: '/trips', count: d.trips.filter(t => t.status === 'In Progress').length, countLabel: 'running', alert: true },
        { icon: CheckCircle2, title: 'Complete Trip', desc: 'End KM, toll / parking / other expenses', to: '/trips', count: d.trips.filter(t => t.status === 'Completed').length, countLabel: 'completed' },
        { icon: BarChart3, title: 'Reports', desc: 'Distance, trip cost & ₹/km per vehicle', to: '/reports' },
      ],
    },
    {
      title: 'Fuel Flow (Request → Slip → Fill)', desc: 'Same as the Fuel FMS forms: slip is issued first, then filled against the slip',
      icon: Fuel, color: '#ea580c', bg: '#fff7ed',
      steps: [
        { icon: Ticket, title: 'Fuel Request', desc: 'Issued To → vehicle, type & last KM auto', to: '/fuel', count: d.slips.length, countLabel: 'slips issued' },
        { icon: FileWarning, title: 'Slip Generated', desc: 'Printable slip: Slip No, vehicle, last KM, pump', to: '/fuel', count: d.slips.filter(s => s.status === 'Pending').length, countLabel: 'pending', alert: d.slips.some(s => s.status === 'Pending') },
        { icon: ClipboardCheck, title: 'Fill Entry', desc: 'Have filled? Qty, rate, current KM + photo, bill no', to: '/fuel', count: d.slips.filter(s => s.status === 'Filled').length, countLabel: 'filled' },
        { icon: Gauge, title: 'Average', desc: 'Run KM ÷ litres per fill & per vehicle', to: '/fuel', count: d.fuels.length, countLabel: 'fuel entries' },
        { icon: BarChart3, title: 'Reports', desc: 'Fuel cost & vehicle average (low average flagged)', to: '/reports' },
      ],
    },
    {
      title: 'Repair Flow', desc: 'Repair request goes through garage quotation, approval, delivery and payment',
      icon: Wrench, color: '#7c3aed', bg: '#f3e8ff',
      steps: [
        { icon: Wrench, title: 'Car Repair', desc: 'Reason, garage, who takes the car', to: '/car-repair', count: repairsBy('Created'), countLabel: 'new', alert: repairsBy('Created') > 0 },
        { icon: Store, title: 'Vendor Offer', desc: 'Garage quotation & types of repair', to: '/vendor-offers', count: repairsBy('Offer Received'), countLabel: 'offers received' },
        { icon: CheckCircle, title: 'Approval', desc: 'Approve / reject the offer', to: '/approvals', count: d.offers.filter(o => o.approvalStatus === 'Pending').length, countLabel: 'pending', alert: d.offers.some(o => o.approvalStatus === 'Pending') },
        { icon: Truck, title: 'Delivery Of Car', desc: 'Vehicle received back, KM, bill amount', to: '/delivery', count: approvedNotDelivered, countLabel: 'awaiting delivery', alert: approvedNotDelivered > 0 },
        { icon: Banknote, title: 'Payment', desc: 'Garage bill paid & closed', to: '/payment', count: d.payments.filter(p => p.paymentStatus === 'Payment Pending').length, countLabel: 'payment pending', alert: d.payments.some(p => p.paymentStatus === 'Payment Pending') },
      ],
      branch: { text: 'If "Insurance to be claimed = Yes" on the repair, a claim is created automatically in Accident / Insurance Claims', link: 'Open Claims →', to: '/accident-claims/claim-of-accident' },
    },
    {
      title: 'Accident / Insurance Claim Flow', desc: '3-stage claim workflow using the vehicle’s insurance policy details',
      icon: AlertTriangle, color: '#dc2626', bg: '#fef2f2',
      steps: [
        { icon: AlertTriangle, title: 'Claim of Accident', desc: 'Incident details & intimation to insurer', to: '/accident-claims/claim-of-accident', count: d.claims.filter(c => !isStage1Completed(c)).length, countLabel: 'pending' },
        { icon: ClipboardCheck, title: 'Process of Claim', desc: 'Survey, documents, estimate', to: '/accident-claims/process-of-claim', count: d.claims.filter(c => isStage1Completed(c) && !isStage2Completed(c)).length, countLabel: 'in process' },
        { icon: IndianRupee, title: 'Claim Settlement', desc: 'Approved amount & settlement date', to: '/accident-claims/claim-settlement', count: d.claims.filter(c => isStage2Completed(c) && !isStage3Completed(c)).length, countLabel: 'to settle' },
        { icon: CheckCircle2, title: 'Settled', desc: 'Claim closed; amount shown in vehicle report', to: '/reports', count: d.claims.filter(isStage3Completed).length, countLabel: 'settled' },
      ],
    },
    {
      title: 'Compliance & Reminders', desc: 'Due dates and pending items from all modules raise alerts on Dashboard & Reports',
      icon: Bell, color: '#0f766e', bg: '#ccfbf1',
      steps: [
        { icon: AlertTriangle, title: 'Challan', desc: 'Traffic challan entry → Pending → Paid', to: '/challans', count: d.challans.filter(c => c.paymentStatus === 'Pending').length, countLabel: 'unpaid', alert: d.challans.some(c => c.paymentStatus === 'Pending') },
        { icon: Shield, title: 'Insurance Renewal', desc: 'Policies expiring within 30 days', to: '/insurance', count: insuranceDue, countLabel: 'due soon', alert: insuranceDue > 0 },
        { icon: Clock, title: 'EMI Due', desc: 'Next EMI date & outstanding loan', to: '/vehicle-emi', count: d.cars.filter(checkHasEmi).length, countLabel: 'active loans' },
        { icon: LayoutDashboard, title: 'Dashboard Alerts', desc: 'All reminders in one place', to: '/' },
      ],
    },
  ];

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 18 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 36, height: 36, borderRadius: 10, background: '#ecfdf5', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
              <GitBranch size={20} />
            </span>
            System Flow
          </h1>
          <p className="page-subtitle">How every module is linked and how each process moves — counts are live, click any box to open that page</p>
        </div>
      </div>

      <div className="section-card" style={{ marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
          <div style={{ fontWeight: 800, fontSize: 15.5, color: '#0f172a' }}>Module Map</div>
          <div style={{ display: 'flex', gap: 16, fontSize: 11.5, color: '#64748b', fontWeight: 600, flexWrap: 'wrap' }}>
            <span><span style={{ display: 'inline-block', width: 18, borderTop: '2px solid #94a3b8', verticalAlign: 'middle', marginRight: 5 }} />Vehicle data used</span>
            <span><span style={{ display: 'inline-block', width: 18, borderTop: '2px solid #059669', verticalAlign: 'middle', marginRight: 5 }} />Feeds reports</span>
            <span><span style={{ display: 'inline-block', width: 18, borderTop: '2px dashed #dc2626', verticalAlign: 'middle', marginRight: 5 }} />Automatic link</span>
          </div>
        </div>
        <ModuleMap navigate={navigate} />
      </div>

      <div style={{ fontWeight: 800, fontSize: 15.5, color: '#0f172a', margin: '0 0 12px' }}>Process Flows</div>
      {FLOWS.map(flow => <FlowCard key={flow.title} flow={flow} navigate={navigate} />)}
    </div>
  );
};

export default FlowChart;
