// store/dataStore.js
// Local-only data store: all records live in the browser (localStorage) with an in-memory cache.

import { createTimestamp, today } from '../utils/dateUtils';
import { generateClaimNo, generateId } from '../utils/idGenerator';
import { buildSeedData, SEED_VERSION, MASTER_FIRM_NAMES, MASTER_REPAIR_TYPES, MASTER_FILLING_LOCATIONS } from './seedData';

const KEYS = {
  CARS: 'cms_cars',
  INSURANCE: 'cms_insurance',
  REPAIRS: 'cms_repairs',
  CLAIMS: 'cms_claims',
  VENDOR_OFFERS: 'cms_vendor_offers',
  DELIVERY_PLANNING: 'cms_delivery_planning',
  DELIVERIES: 'cms_deliveries',
  PAYMENTS: 'cms_payments',
  CHALLANS: 'cms_challans',
  FASTAGS: 'cms_fastags',
  TRIPS: 'cms_trips',
  FUELS: 'cms_fuels',
  FUEL_SLIPS: 'cms_fuel_slips',
  USERS: 'cms_users',
};

export const PAGE_STEPS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'purchase_car', label: 'Purchase Car' },
  { key: 'vehicle_emi', label: 'Vehicle on EMI' },
  { key: 'challans', label: 'Challan' },
  { key: 'fastag', label: 'Fastag' },
  { key: 'insurance', label: 'Insurance' },
  { key: 'car_repair', label: 'Car Repair' },
  { key: 'accident_claims', label: 'Accident / Claims' },
  { key: 'vendor_offers', label: 'Vendor Offers' },
  { key: 'approvals', label: 'Approvals' },
  { key: 'delivery', label: 'Delivery Of Car' },
  { key: 'payment', label: 'Payment' },
];

const notifyStoreUpdate = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cms_datastore_updated'));
  }
};

export const onStoreUpdate = (callback) => {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('cms_datastore_updated', callback);
  return () => window.removeEventListener('cms_datastore_updated', callback);
};

const cache = {};

const load = (key) => {
  if (cache[key]) return cache[key].map(item => ({ ...item }));
  try {
    const raw = localStorage.getItem(key);
    cache[key] = raw ? JSON.parse(raw) : [];
  } catch {
    cache[key] = [];
  }
  return cache[key].map(item => ({ ...item }));
};

const save = (key, data) => {
  cache[key] = data;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn('Local storage save failed (storage may be full):', err);
  }
  notifyStoreUpdate();
};

// Keep the cache fresh when another browser tab changes the data
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key && cache[e.key]) {
      delete cache[e.key];
      notifyStoreUpdate();
    }
  });
}

export const checkHasEmi = (car) => {
  if (!car) return false;

  const status = String(car.emiStatus || '').trim().toLowerCase();
  if (status === 'no' || status === 'false') {
    const hasOtherEmi = (car.emiAmount && Number(String(car.emiAmount).replace(/[^0-9.-]+/g, '')) > 0) ||
      (car.hypothecationBank && !['—', '-', 'none', 'no', 'n/a'].includes(String(car.hypothecationBank).trim().toLowerCase()));
    if (!hasOtherEmi) return false;
  }
  if (status === 'yes' || status === 'true') {
    return true;
  }

  const isValidVal = (val) => {
    if (val === undefined || val === null) return false;
    const s = String(val).trim().toLowerCase();
    return s !== '' && s !== '0' && s !== '0.00' && s !== '0/-' && s !== '—' && s !== '-' && s !== 'no' && s !== 'none' && s !== 'n/a' && s !== 'nil' && s !== 'null' && s !== 'undefined';
  };

  if (isValidVal(car.emiAmount)) {
    const cleaned = String(car.emiAmount).replace(/[^0-9.-]+/g, '');
    const num = Number(cleaned);
    if (!isNaN(num) && num > 0) return true;
    if (isNaN(num) && isValidVal(car.emiAmount)) return true;
  }

  if (isValidVal(car.hypothecationBank)) {
    return true;
  }

  if (isValidVal(car.lastEmiDate)) {
    return true;
  }

  return false;
};

// ─── SEED DUMMY DATA ──────────────────────────────────────────────────────────
const seed = () => {
  const alreadySeeded = !!localStorage.getItem(SEED_VERSION);
  const missingKeys = Object.entries(KEYS).filter(([name, key]) => name !== 'USERS' && localStorage.getItem(key) === null);
  if (alreadySeeded && missingKeys.length === 0) return;
  const data = buildSeedData();
  Object.entries(KEYS).forEach(([name, key]) => {
    if (name === 'USERS') return; // users are seeded by AuthContext
    // On first run fill everything; later only fill modules added after the first seed
    if (alreadySeeded && localStorage.getItem(key) !== null) return;
    localStorage.setItem(key, JSON.stringify(data[name] || []));
  });
  localStorage.setItem(SEED_VERSION, 'true');
};

seed();

// Re-seed the dummy data (wipes all local records except users)
export const resetDemoData = () => {
  localStorage.removeItem(SEED_VERSION);
  Object.keys(cache).forEach(k => delete cache[k]);
  seed();
  notifyStoreUpdate();
};


// ─── CARS CRUD ────────────────────────────────────────────────────────────────
export const getCars = async () => {
  return load(KEYS.CARS);
};

export const addCar = async (car) => {
  const cars = load(KEYS.CARS);
  const nowFormatted = createTimestamp();
  const carWithTimestamp = {
    ...car,
    timestamp: car.timestamp || nowFormatted,
    createdAt: car.createdAt || nowFormatted,
  };
  cars.push(carWithTimestamp);
  save(KEYS.CARS, cars);

  return carWithTimestamp;
};

export const updateCar = async (vehicleId, updates) => {
  const cars = load(KEYS.CARS);
  const idx = cars.findIndex(c => c.vehicleId === vehicleId);
  if (idx === -1) throw new Error('Car not found');
  cars[idx] = { ...cars[idx], ...updates, updatedAt: createTimestamp() };
  save(KEYS.CARS, cars);

  return cars[idx];
};

export const deleteCar = async (vehicleId) => {
  const cars = load(KEYS.CARS);
  const carToDelete = cars.find(c => c.vehicleId === vehicleId);
  const remaining = cars.filter(c => c.vehicleId !== vehicleId);
  save(KEYS.CARS, remaining);

  if (carToDelete) {
    const keyField = carToDelete.registrationNo ? 'REGISTRATION NO.' : 'Vehicle ID';
    const keyValue = carToDelete.registrationNo || carToDelete.vehicleId;
  }
};

// ─── INSURANCE CRUD ───────────────────────────────────────────────────────────
export const getInsurance = async () => {
  return load(KEYS.INSURANCE);
};

export const addInsurance = async (ins) => {
  const all = load(KEYS.INSURANCE);
  const now = createTimestamp();
  const item = { ...ins, timestamp: now, createdAt: now };
  all.push(item);
  save(KEYS.INSURANCE, all);
  return item;
};

export const updateInsurance = async (id, updates) => {
  const all = load(KEYS.INSURANCE);
  const idx = all.findIndex(i => i.id === id);
  if (idx === -1) throw new Error('Insurance not found');
  all[idx] = { ...all[idx], ...updates, updatedAt: createTimestamp() };
  save(KEYS.INSURANCE, all);
  return all[idx];
};

export const renewInsurance = async (vehicleId, renewalData) => {
  const all = load(KEYS.INSURANCE);
  const idx = all.findIndex(i => i.vehicleId === vehicleId || i.carName === renewalData.carName);
  const now = createTimestamp();
  const updatedRecord = {
    ...(idx !== -1 ? all[idx] : {}),
    ...renewalData,
    vehicleId,
    timestamp: now,
    updatedAt: now,
  };
  
  if (idx !== -1) {
    all[idx] = updatedRecord;
  } else {
    const newId = `ins_${Date.now()}`;
    const newRecord = { ...updatedRecord, id: newId, createdAt: now };
    all.push(newRecord);
  }
  save(KEYS.INSURANCE, all);
  
  // Also update vehicle's master dateOfInsurance
  const cars = load(KEYS.CARS);
  const carIdx = cars.findIndex(c => c.vehicleId === vehicleId || c.carName === renewalData.carName);
  if (carIdx !== -1 && renewalData.date) {
    cars[carIdx].dateOfInsurance = renewalData.date;
    cars[carIdx].updatedAt = now;
    save(KEYS.CARS, cars);
  }
  return updatedRecord;
};

export const deleteInsurance = async (id) => {
  const all = load(KEYS.INSURANCE);
  const item = all.find(i => i.id === id || i.vehicleId === id || i.carName === id);
  const remaining = all.filter(i => i.id !== id && i.vehicleId !== id && i.carName !== id);
  save(KEYS.INSURANCE, remaining);
  if (item) {
    const keyField = item.carName ? 'Car Name' : 'Vehicle ID';
    const keyValue = item.carName || item.vehicleId;
  }
};

// ─── REPAIRS CRUD ─────────────────────────────────────────────
export const getRepairs = async () => {
  return load(KEYS.REPAIRS);
};

// ─── AUTOMATICALLY SYNC REPAIR WITH ACCIDENT CLAIM ───────────────────────────
export const autoSyncRepairClaim = async (repairItem) => {
  if (!repairItem || (repairItem.insuranceToBeClaimed !== 'Yes' && repairItem.insuranceClaimed !== 'Yes')) {
    return null;
  }
  
  const allClaims = load(KEYS.CLAIMS);
  const existingClaim = allClaims.find(c => c.repairNo && c.repairNo === repairItem.repairNo);
  const now = createTimestamp();

  // Try to lookup vehicle insurance if insuranceCompany not provided
  let insCompany = repairItem.insuranceCompany || '';
  let polNo = repairItem.policyNo || '';
  let polVal = repairItem.policyValidity || '';

  if (!insCompany) {
    try {
      const allIns = load(KEYS.INSURANCE);
      const matched = allIns.find(i => 
        (repairItem.vehicleId && i.vehicleId === repairItem.vehicleId) || 
        (repairItem.carName && i.carName && i.carName.toLowerCase() === repairItem.carName.toLowerCase())
      );
      if (matched) {
        insCompany = matched.nameOfCompany || matched.insuranceCompany || '';
        polNo = matched.tpPolicyNo || matched.policyNo || '';
        polVal = matched.odEndDate || matched.tpEndDate || '';
      }
    } catch (e) {
      console.warn('Error fetching insurance company for claim:', e);
    }
  }

  if (existingClaim) {
    // Update existing claim
    const updated = {
      ...existingClaim,
      vehicleId: repairItem.vehicleId || existingClaim.vehicleId || '',
      vehicleName: repairItem.carName || existingClaim.vehicleName || '',
      dateOfAccident: repairItem.dateOfAccident || existingClaim.dateOfAccident || today(),
      insuranceCompany: insCompany || existingClaim.insuranceCompany || '',
      policyNo: polNo || existingClaim.policyNo || '',
      policyValidity: polVal || existingClaim.policyValidity || '',
      estimatedClaimAmount: repairItem.estimatedClaimAmount !== undefined && repairItem.estimatedClaimAmount !== '' ? repairItem.estimatedClaimAmount : (existingClaim.estimatedClaimAmount || ''),
      typeOfClaim: repairItem.typeOfClaim || existingClaim.typeOfClaim || 'Own Damage',
      accidentReason: repairItem.reasonForRepair || existingClaim.accidentReason || '',
      driverName: repairItem.whoTakingCar || existingClaim.driverName || '',
      accidentLocation: repairItem.garage || existingClaim.accidentLocation || '',
      updatedAt: now
    };
    const idx = allClaims.findIndex(c => c.claimNo === existingClaim.claimNo);
    allClaims[idx] = updated;
    save(KEYS.CLAIMS, allClaims);

    return updated;
  } else {
    // Auto-create new claim
    const claimNo = generateClaimNo(allClaims);
    const newClaim = {
      id: generateId(),
      claimNo,
      repairNo: repairItem.repairNo,
      vehicleId: repairItem.vehicleId || '',
      vehicleName: repairItem.carName || '',
      registrationNo: repairItem.registrationNo || '',
      dateOfAccident: repairItem.dateOfAccident || today(),
      timeOfAccident: repairItem.timeOfAccident || '',
      accidentLocation: repairItem.garage || '',
      accidentReason: repairItem.reasonForRepair || '',
      driverName: repairItem.whoTakingCar || '',
      driverMobileNo: repairItem.driverMobileNo || '',
      insuranceCompany: insCompany,
      policyNo: polNo,
      policyValidity: polVal,
      insuranceClaim: 'Yes',
      estimatedClaimAmount: repairItem.estimatedClaimAmount || '',
      typeOfClaim: repairItem.typeOfClaim || 'Own Damage',
      claimMode: repairItem.claimMode || 'Cashless Claim (Network Garage)',
      accidentPhotos: null,
      firRequired: 'No',
      firCopy: null,
      policeReport: null,
      otherDocuments: null,
      stage1Completed: false,
      stage2Completed: false,
      stage3Completed: false,
      claimIntimatedDate: today(),
      claimIntimationNo: '',
      surveyorName: '',
      surveyorMobileNo: '',
      surveyDate: '',
      surveyStatus: repairItem.surveyStatus || 'Pending',
      claimStatus: repairItem.claimStatus || 'Claim Under Process',
      claimApprovedAmount: '',
      claimRejectedReason: '',
      claimSettlementDate: '',
      remarks: '',
      timestamp: now,
      createdAt: now
    };
    allClaims.push(newClaim);
    save(KEYS.CLAIMS, allClaims);

    return newClaim;
  }
};

// Auto-sync any existing repairs that have insurance claimed but no claim record yet
export const syncPendingRepairClaims = async () => {
  try {
    const repairs = load(KEYS.REPAIRS);
    const claims = load(KEYS.CLAIMS);
    const pendingRepairs = repairs.filter(r => 
      (r.insuranceToBeClaimed === 'Yes' || r.insuranceClaimed === 'Yes') &&
      !claims.some(c => c.repairNo && c.repairNo === r.repairNo)
    );
    if (pendingRepairs.length === 0) return 0;
    
    for (const r of pendingRepairs) {
      await autoSyncRepairClaim(r);
    }
    return pendingRepairs.length;
  } catch (err) {
    console.warn('Failed to sync pending repair claims:', err);
    return 0;
  }
};

export const addRepair = async (repair) => {
  const all = load(KEYS.REPAIRS);
  const now = createTimestamp();
  const item = { ...repair, timestamp: now, createdAt: now };
  all.push(item);
  save(KEYS.REPAIRS, all);


  // If Insurance to be claimed is Yes, automatically create & sync to If Accident / Insurance Claims!
  if (item.insuranceToBeClaimed === 'Yes') {
    await autoSyncRepairClaim(item);
  }

  return item;
};

export const updateRepair = async (repairNo, updates) => {
  const all = load(KEYS.REPAIRS);
  const idx = all.findIndex(r => r.repairNo === repairNo);
  if (idx === -1) throw new Error('Repair not found');
  const now = createTimestamp();
  all[idx] = { ...all[idx], ...updates, updatedAt: now };
  save(KEYS.REPAIRS, all);


  // If Insurance to be claimed is Yes, ensure claim is synced to If Accident / Insurance Claims!
  if (all[idx].insuranceToBeClaimed === 'Yes') {
    await autoSyncRepairClaim(all[idx]);
  }

  return all[idx];
};

export const deleteRepair = async (repairNo) => {
  const all = load(KEYS.REPAIRS).filter(r => r.repairNo !== repairNo);
  save(KEYS.REPAIRS, all);

  // Clean up associated vendor offer, delivery, payment
  const offers = load(KEYS.VENDOR_OFFERS).filter(o => o.repairNo !== repairNo);
  save(KEYS.VENDOR_OFFERS, offers);
  const dels = load(KEYS.DELIVERIES).filter(d => d.repairNo !== repairNo);
  save(KEYS.DELIVERIES, dels);
  const pays = load(KEYS.PAYMENTS).filter(p => p.repairNo !== repairNo);
  save(KEYS.PAYMENTS, pays);

};

// ─── CLAIMS CRUD ──────────────────────────────────────────────────────────────
export const getClaims = async () => {
  await syncPendingRepairClaims();
  return load(KEYS.CLAIMS);
};

export const addClaim = async (claim) => {
  const all = load(KEYS.CLAIMS);
  const now = createTimestamp();
  const item = {
    stage1Completed: false,
    stage2Completed: false,
    stage3Completed: false,
    ...claim,
    timestamp: now,
    createdAt: now
  };
  all.push(item);
  save(KEYS.CLAIMS, all);
  return item;
};

export const updateClaim = async (claimNo, updates) => {
  const all = load(KEYS.CLAIMS);
  const idx = all.findIndex(c => c.claimNo === claimNo);
  if (idx === -1) throw new Error('Claim not found');
  all[idx] = { ...all[idx], ...updates, updatedAt: createTimestamp() };
  save(KEYS.CLAIMS, all);

  return all[idx];
};

export const processAccidentClaim = async (claimNo, processData) => {
  const all = load(KEYS.CLAIMS);
  const idx = all.findIndex(c => c.claimNo === claimNo);
  if (idx === -1) throw new Error('Claim not found');
  const now = createTimestamp();
  all[idx] = {
    ...all[idx],
    ...processData,
    actual: now,
    isProcessed: true,
    updatedAt: now
  };
  save(KEYS.CLAIMS, all);

  return all[idx];
};

export const deleteClaim = async (claimNo) => {
  const all = load(KEYS.CLAIMS).filter(c => c.claimNo !== claimNo);
  save(KEYS.CLAIMS, all);
};

// ─── VENDOR OFFERS & MASTER REPAIR TYPES ─────────────────────────────
export const getMasterRepairTypes = async () => MASTER_REPAIR_TYPES;

export const getMasterFirmNames = async () => MASTER_FIRM_NAMES;


export const getVendorOffers = async () => {
  return load(KEYS.VENDOR_OFFERS);
};

export const addVendorOffer = async (offer) => {
  const all = load(KEYS.VENDOR_OFFERS);
  const now = createTimestamp();
  const actualDate = offer.actualDate || now;
  const item = {
    ...offer,
    actualDate,
    timestamp: now,
    createdAt: now
  };
  all.push(item);
  save(KEYS.VENDOR_OFFERS, all);


  // Also update repair status
  const repairs = load(KEYS.REPAIRS);
  const ri = repairs.findIndex(r => r.repairNo === item.repairNo);
  if (ri !== -1) {
    repairs[ri].repairStatus = 'Offer Received';
    repairs[ri].actualDate = actualDate;
    repairs[ri].updatedAt = now;
    save(KEYS.REPAIRS, repairs);
  }

  return item;
};

export const approveVendorOffer = async (id, remarks = '') => {
  const all = load(KEYS.VENDOR_OFFERS);
  const idx = all.findIndex(o => o.id === id || o.repairNo === id);
  if (idx === -1) throw new Error('Offer not found');
  const now = createTimestamp();
  all[idx] = {
    ...all[idx],
    approvalStatus: 'Approved',
    approvedAt: now,
    actualDate2: now,
    approvalRemarks: remarks
  };
  save(KEYS.VENDOR_OFFERS, all);


  // Update repair status to Approved
  const repairs = load(KEYS.REPAIRS);
  const ri = repairs.findIndex(r => r.repairNo === all[idx].repairNo);
  if (ri !== -1) {
    repairs[ri].repairStatus = 'Approved';
    repairs[ri].actualDate2 = now;
    repairs[ri].updatedAt = now;
    save(KEYS.REPAIRS, repairs);
  }
  return all[idx];
};

export const rejectVendorOffer = async (id, reason) => {
  const all = load(KEYS.VENDOR_OFFERS);
  const idx = all.findIndex(o => o.id === id);
  if (idx === -1) throw new Error('Offer not found');
  const now = createTimestamp();
  all[idx] = { ...all[idx], approvalStatus: 'Rejected', rejectionReason: reason, rejectedAt: now };
  save(KEYS.VENDOR_OFFERS, all);
  return all[idx];
};

// ─── DELIVERY PLANNING ────────────────────────────────────────────────────────
export const getDeliveryPlanning = async () => {
  return load(KEYS.DELIVERY_PLANNING);
};

export const addDeliveryPlanning = async (dp) => {
  const all = load(KEYS.DELIVERY_PLANNING);
  const now = createTimestamp();
  const item = { ...dp, timestamp: now, createdAt: now };
  all.push(item);
  save(KEYS.DELIVERY_PLANNING, all);

  // Create delivery record
  const deliveries = load(KEYS.DELIVERIES);
  const exists = deliveries.find(d => d.repairNo === dp.repairNo);
  if (!exists) {
    const newDel = { ...dp, deliveryStatus: 'Delivery Pending', id: `del_${Date.now()}`, timestamp: now, createdAt: now };
    deliveries.push(newDel);
    save(KEYS.DELIVERIES, deliveries);
  }

  // Update repair status
  const repairs = load(KEYS.REPAIRS);
  const ri = repairs.findIndex(r => r.repairNo === dp.repairNo);
  if (ri !== -1) {
    repairs[ri].repairStatus = 'Delivery Planned';
    repairs[ri].updatedAt = now;
    save(KEYS.REPAIRS, repairs);
  }
  return item;
};

// ─── DELIVERIES ───────────────────────────────────────────────────────────────
export const getDeliveries = async () => {
  return load(KEYS.DELIVERIES);
};

export const submitDelivery = async (deliveryInput) => {
  const repairNo = typeof deliveryInput === 'string' ? deliveryInput : deliveryInput?.repairNo;
  const deliveries = load(KEYS.DELIVERIES);
  const now = createTimestamp();
  
  let idx = deliveries.findIndex(d => d.repairNo === repairNo);
  let delRecord;

  if (typeof deliveryInput === 'object') {
    delRecord = {
      id: deliveryInput.id || `del_${Date.now()}`,
      ...deliveryInput,
      deliveryStatus: 'Delivery Submitted',
      submittedAt: now,
      deliveredAt: now,
      actualDate3: now,
      timestamp: now,
    };
    if (idx !== -1) {
      deliveries[idx] = { ...deliveries[idx], ...delRecord };
    } else {
      deliveries.push(delRecord);
    }
  } else {
    if (idx === -1) throw new Error('Delivery not found');
    deliveries[idx] = {
      ...deliveries[idx],
      deliveryStatus: 'Delivery Submitted',
      submittedAt: now,
      deliveredAt: now,
      actualDate3: now,
    };
    delRecord = deliveries[idx];
  }
  
  save(KEYS.DELIVERIES, deliveries);


  // Create payment record
  const payments = load(KEYS.PAYMENTS);
  const alreadyPay = payments.find(p => p.repairNo === repairNo);
  if (!alreadyPay) {
    const newPay = {
      id: `pay_${Date.now()}`,
      repairNo,
      vehicleId: delRecord.vehicleId,
      garageName: delRecord.garageName,
      vehicleName: delRecord.vehicleName,
      dateVehicleReceived: delRecord.dateVehicleReceived,
      kmAtTimeOfRepair: delRecord.kmAtTimeOfRepair,
      serviceAmount: delRecord.serviceAmount,
      billAmount: delRecord.billAmount,
      billImage: delRecord.billImage,
      paymentStatus: 'Payment Pending',
      timestamp: now,
      createdAt: now,
    };
    payments.push(newPay);
    save(KEYS.PAYMENTS, payments);
  }

  // Update repair status
  const repairs = load(KEYS.REPAIRS);
  const ri = repairs.findIndex(r => r.repairNo === repairNo);
  if (ri !== -1) {
    repairs[ri].repairStatus = 'Delivered';
    repairs[ri].actualDate3 = now;
    repairs[ri].dateVehicleReceived = delRecord.dateVehicleReceived;
    repairs[ri].updatedAt = now;
    save(KEYS.REPAIRS, repairs);
  }

  return delRecord;
};

// ─── PAYMENTS ─────────────────────────────────────────────────────────────────
export const getPayments = async () => {
  return load(KEYS.PAYMENTS);
};

export const updatePaymentStatus = async (repairNo, status, details = {}) => {
  const payments = load(KEYS.PAYMENTS);
  let idx = payments.findIndex(p => p.repairNo === repairNo);
  const now = createTimestamp();
  if (idx === -1) {
    payments.push({ id: `pay_${Date.now()}`, repairNo, ...details, timestamp: now, createdAt: now });
    idx = payments.length - 1;
  }
  const completed = status === 'Payment Completed';
  payments[idx] = {
    ...payments[idx],
    ...details,
    paymentStatus: status,
    ...(completed ? {
      paidAt: now,
      paymentDate: payments[idx].paymentDate || today(),
      paidAmount: payments[idx].billAmount || details.billAmount || '0',
      paymentMethod: payments[idx].paymentMethod || 'Bank Transfer',
    } : {}),
    updatedAt: now,
  };
  save(KEYS.PAYMENTS, payments);

  if (status === 'Payment Completed') {
    const repairs = load(KEYS.REPAIRS);
    const ri = repairs.findIndex(r => r.repairNo === repairNo);
    if (ri !== -1) {
      repairs[ri].repairStatus = 'Payment Completed';
      repairs[ri].updatedAt = now;
      save(KEYS.REPAIRS, repairs);
    }
  }
  return payments[idx];
};

// ─── CHALLANS CRUD ────────────────────────────────────────────────────────────
export const getChallans = async () => {
  return load(KEYS.CHALLANS);
};

export const addChallan = async (challanData) => {
  const challans = load(KEYS.CHALLANS);
  const now = createTimestamp();
  const id = `ch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const newChallan = {
    ...challanData,
    id,
    paymentStatus: challanData.paymentStatus || 'Pending',
    timestamp: now,
    createdAt: now,
  };
  challans.push(newChallan);
  save(KEYS.CHALLANS, challans);


  return newChallan;
};

export const updateChallan = async (id, updates) => {
  const challans = load(KEYS.CHALLANS);
  const idx = challans.findIndex(c => c.id === id);
  if (idx === -1) throw new Error('Challan record not found');
  const now = createTimestamp();
  challans[idx] = { ...challans[idx], ...updates, updatedAt: now };
  save(KEYS.CHALLANS, challans);


  return challans[idx];
};

export const deleteChallan = async (id) => {
  const challans = load(KEYS.CHALLANS);
  const target = challans.find(c => c.id === id || c.challanNo === id);
  const filtered = challans.filter(c => c.id !== id && c.challanNo !== id);
  save(KEYS.CHALLANS, filtered);

  if (target) {
    const keyVal = target.id || id;
  }
  return true;
};

// ─── FASTAG CRUD ──────────────────────────────────────────────────────────────
export const getFastags = async () => {
  return load(KEYS.FASTAGS);
};

export const saveFastag = async (fastagData) => {
  const fastags = load(KEYS.FASTAGS);
  const now = createTimestamp();
  const idx = fastags.findIndex(f => (fastagData.vehicleId && f.vehicleId === fastagData.vehicleId) || (fastagData.registrationNo && f.registrationNo === fastagData.registrationNo));

  let savedRecord;
  if (idx !== -1) {
    savedRecord = {
      ...fastags[idx],
      ...fastagData,
      fastagStatus: fastagData.fastagStatus || 'Active',
      updatedAt: now,
    };
    fastags[idx] = savedRecord;
    save(KEYS.FASTAGS, fastags);

  } else {
    savedRecord = {
      ...fastagData,
      id: fastagData.id || `ft_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      fastagStatus: fastagData.fastagStatus || 'Active',
      timestamp: now,
      createdAt: now,
    };
    fastags.push(savedRecord);
    save(KEYS.FASTAGS, fastags);

  }

  return savedRecord;
};

export const deleteFastag = async (vehicleId) => {
  const fastags = load(KEYS.FASTAGS);
  const target = fastags.find(f => f.vehicleId === vehicleId || f.id === vehicleId);
  const filtered = fastags.filter(f => f.vehicleId !== vehicleId && f.id !== vehicleId);
  save(KEYS.FASTAGS, filtered);

  if (target) {
    const keyVal = target.vehicleId || vehicleId;
  }
  return true;
};

// ─── DAILY TRIPS ──────────────────────────────────────────────────────────────
const nextNo = (list, field, prefix) => {
  const max = list.reduce((m, item) => {
    const n = parseInt(String(item[field] || '').replace(`${prefix}-`, ''), 10);
    return isNaN(n) ? m : Math.max(m, n);
  }, 0);
  return `${prefix}-${String(max + 1).padStart(4, '0')}`;
};

const withTripDistance = (trip) => {
  const start = Number(trip.startKm);
  const end = Number(trip.endKm);
  const distance = trip.startKm !== '' && trip.endKm !== '' && !isNaN(start) && !isNaN(end) && end >= start ? String(end - start) : (trip.distance || '');
  return { ...trip, distance };
};

export const getTrips = async () => {
  return load(KEYS.TRIPS);
};

export const addTrip = async (trip) => {
  const all = load(KEYS.TRIPS);
  const now = createTimestamp();
  const item = withTripDistance({
    ...trip,
    id: generateId(),
    tripNo: nextNo(all, 'tripNo', 'TRP'),
    status: trip.status || 'Scheduled',
    timestamp: now,
    createdAt: now,
  });
  all.push(item);
  save(KEYS.TRIPS, all);
  return item;
};

export const updateTrip = async (id, updates) => {
  const all = load(KEYS.TRIPS);
  const idx = all.findIndex(t => t.id === id);
  if (idx === -1) throw new Error('Trip not found');
  all[idx] = withTripDistance({ ...all[idx], ...updates, updatedAt: createTimestamp() });
  save(KEYS.TRIPS, all);
  return all[idx];
};

export const deleteTrip = async (id) => {
  save(KEYS.TRIPS, load(KEYS.TRIPS).filter(t => t.id !== id));
};

// Latest known odometer reading of a vehicle (from trips & fuel entries)
export const getLastOdometer = (vehicleId) => {
  const readings = [
    ...load(KEYS.TRIPS).filter(t => t.vehicleId === vehicleId).flatMap(t => [Number(t.endKm), Number(t.startKm)]),
    ...load(KEYS.FUELS).filter(f => f.vehicleId === vehicleId).map(f => Number(f.odometer)),
  ].filter(n => !isNaN(n) && n > 0);
  return readings.length ? Math.max(...readings) : '';
};

// ─── FUEL ENTRIES ─────────────────────────────────────────────────────────────
const withFuelAmount = (fuel) => {
  const qty = Number(fuel.quantity);
  const rate = Number(fuel.rate);
  const amount = fuel.amount !== undefined && fuel.amount !== '' ? fuel.amount : (!isNaN(qty) && !isNaN(rate) ? String(Math.round(qty * rate * 100) / 100) : '');
  return { ...fuel, amount };
};

export const getFuels = async () => {
  return load(KEYS.FUELS);
};

export const addFuel = async (fuel) => {
  const all = load(KEYS.FUELS);
  const now = createTimestamp();
  const item = withFuelAmount({
    ...fuel,
    id: generateId(),
    fuelNo: nextNo(all, 'fuelNo', 'FUEL'),
    timestamp: now,
    createdAt: now,
  });
  all.push(item);
  save(KEYS.FUELS, all);
  return item;
};

export const updateFuel = async (id, updates) => {
  const all = load(KEYS.FUELS);
  const idx = all.findIndex(f => f.id === id);
  if (idx === -1) throw new Error('Fuel entry not found');
  all[idx] = withFuelAmount({ ...all[idx], ...updates, updatedAt: createTimestamp() });
  save(KEYS.FUELS, all);
  return all[idx];
};

export const deleteFuel = async (id) => {
  save(KEYS.FUELS, load(KEYS.FUELS).filter(f => f.id !== id));
};

// Adds `runKm` and `mileage` (km per unit) to each fuel entry.
// Run KM = current reading − last reading (from the fuel slip, or the previous fill of the same vehicle).
export const withMileage = (fuels) => {
  const byVehicle = {};
  fuels.forEach(f => { (byVehicle[f.vehicleId] = byVehicle[f.vehicleId] || []).push(f); });
  const calc = {};
  Object.values(byVehicle).forEach(list => {
    const sorted = [...list].sort((a, b) => Number(a.odometer) - Number(b.odometer));
    sorted.forEach((f, i) => {
      const last = f.lastKm !== undefined && f.lastKm !== '' ? Number(f.lastKm) : (i > 0 ? Number(sorted[i - 1].odometer) : NaN);
      const km = Number(f.odometer) - last;
      const qty = Number(f.quantity);
      calc[f.id] = km > 0 && qty > 0
        ? { runKm: km, mileage: Math.round((km / qty) * 100) / 100 }
        : { runKm: null, mileage: null };
    });
  });
  return fuels.map(f => ({ ...f, ...(calc[f.id] || { runKm: null, mileage: null }) }));
};

// Overall vehicle average = total run KM / total quantity (only fills with a valid run KM)
export const vehicleAverage = (fuelsWithMileage) => {
  const valid = fuelsWithMileage.filter(f => f.runKm > 0 && Number(f.quantity) > 0);
  const km = valid.reduce((s, f) => s + f.runKm, 0);
  const qty = valid.reduce((s, f) => s + Number(f.quantity), 0);
  return qty > 0 ? Math.round((km / qty) * 100) / 100 : null;
};

// ─── FUEL REQUEST SLIPS ───────────────────────────────────────────────────────
// Step 1: a fuel request issues a slip (Pending).
// Step 2: the slip is filled (creates a fuel entry) or marked Not Filled.
export const getFuelSlips = async () => {
  return load(KEYS.FUEL_SLIPS);
};

export const getFillingLocations = () => {
  const used = [...load(KEYS.FUEL_SLIPS).map(s => s.fillingLocation), ...load(KEYS.FUELS).map(f => f.pumpName)];
  return [...new Set([...MASTER_FILLING_LOCATIONS, ...used].filter(Boolean).map(v => String(v).trim()))];
};

export const addFuelSlip = async (request) => {
  const all = load(KEYS.FUEL_SLIPS);
  const now = createTimestamp();
  const maxNo = all.reduce((m, sl) => Math.max(m, Number(sl.slipNo) || 0), 1000);
  const item = {
    ...request,
    id: generateId(),
    slipNo: String(maxNo + 1),
    issuedAt: now,
    status: 'Pending',
    timestamp: now,
    createdAt: now,
  };
  all.push(item);
  save(KEYS.FUEL_SLIPS, all);
  return item;
};

export const fillFuelSlip = async (slipNo, fillData) => {
  const slips = load(KEYS.FUEL_SLIPS);
  const idx = slips.findIndex(sl => sl.slipNo === slipNo);
  if (idx === -1) throw new Error('Slip not found');
  if (slips[idx].status !== 'Pending') throw new Error(`Slip ${slipNo} is already ${slips[idx].status}`);
  const slip = slips[idx];
  const fuel = await addFuel({
    vehicleId: slip.vehicleId,
    carName: slip.carName,
    registrationNo: slip.registrationNo,
    pumpName: slip.fillingLocation,
    filledBy: slip.issuedTo,
    lastKm: slip.lastKm,
    slipNo,
    fullTank: 'Yes',
    ...fillData,
  });
  const now = createTimestamp();
  const fresh = load(KEYS.FUEL_SLIPS);
  const i = fresh.findIndex(sl => sl.slipNo === slipNo);
  fresh[i] = { ...fresh[i], status: 'Filled', fuelNo: fuel.fuelNo, entryBy: fillData.entryBy || '', filledAt: now, updatedAt: now };
  save(KEYS.FUEL_SLIPS, fresh);
  return fuel;
};

export const markSlipNotFilled = async (slipNo, { entryBy = '', reason = '' } = {}) => {
  const slips = load(KEYS.FUEL_SLIPS);
  const idx = slips.findIndex(sl => sl.slipNo === slipNo);
  if (idx === -1) throw new Error('Slip not found');
  const now = createTimestamp();
  slips[idx] = { ...slips[idx], status: 'Not Filled', entryBy, notFilledReason: reason, closedAt: now, updatedAt: now };
  save(KEYS.FUEL_SLIPS, slips);
  return slips[idx];
};

export const deleteFuelSlip = async (slipNo) => {
  save(KEYS.FUEL_SLIPS, load(KEYS.FUEL_SLIPS).filter(sl => sl.slipNo !== slipNo));
};
