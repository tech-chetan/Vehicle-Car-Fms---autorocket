// store/seedData.js
// Dummy demo data for Vehicle App. Dates are generated relative to today so
// reminders (insurance renewal, EMI due, etc.) always look realistic.

import { createTimestamp } from '../utils/dateUtils';

export const SEED_VERSION = 'vehicle_app_seeded_v1';

export const MASTER_FIRM_NAMES = [
  'Vehicle App Logistics Pvt Ltd',
  'Vehicle App Transport Services',
  'Vehicle App Industries Ltd',
];

export const MASTER_FILLING_LOCATIONS = [
  'Amar Jawan Fuels', 'Indian Oil – City Centre', 'Bharat Petroleum – Highway', 'HP Petrol Pump', 'Nayara Energy', 'Shell Fuel Station', 'Tata Power EZ Charge',
];

export const MASTER_REPAIR_TYPES = [
  'Tyre Change', 'Regular Maintainance', 'Body Repair', 'Major Repair',
  'Denting', 'Painting', 'Mechanical', 'Electrical', 'AC Servicing', 'General Checkup',
];

const pad = (n) => String(n).padStart(2, '0');
const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const daysFromNow = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
};
const day = (days) => isoDate(daysFromNow(days));
const ts = (days, hour = 10) => {
  const d = daysFromNow(days);
  d.setHours(hour, 15, 0, 0);
  return createTimestamp(d);
};
const monthsFromNow = (months, dayOfMonth) => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  if (dayOfMonth) d.setDate(dayOfMonth);
  return isoDate(d);
};

const [FIRM_A, FIRM_B, FIRM_C] = MASTER_FIRM_NAMES;

// Builds an EMI car record from a few loan inputs
const emiCar = (base, { bank, loanAmount, emiAmount, startMonthsAgo, totalEmis, emiDay }) => {
  const paidEmis = Math.min(startMonthsAgo, totalEmis);
  return {
    ...base,
    hypothecationBank: bank,
    loanAmount: String(loanAmount),
    emiAmount: String(emiAmount),
    emiStartDate: monthsFromNow(-startMonthsAgo, emiDay),
    lastEmiDate: monthsFromNow(totalEmis - startMonthsAgo - 1, emiDay),
    dateOfReleaseHypothecation: monthsFromNow(totalEmis - startMonthsAgo + 1, emiDay),
    totalEmis: String(totalEmis),
    paidEmis: String(paidEmis),
    paidEmiAmount: String(paidEmis * emiAmount),
    remainingLoanAmount: String(Math.max(totalEmis - paidEmis, 0) * emiAmount),
    hasEmi: true,
    emiStatus: 'Yes',
  };
};

export const buildSeedData = () => {
  const baseCar = (i, data) => ({
    vehicleId: `CAR-${String(i).padStart(4, '0')}`,
    copyOfInsurance: '',
    copyOfRegistration: '',
    timestamp: ts(-400 + i * 20),
    createdAt: ts(-400 + i * 20),
    ...data,
  });

  const noEmi = { hypothecationBank: '', loanAmount: '', emiAmount: '', emiStartDate: '', lastEmiDate: '', dateOfReleaseHypothecation: '', totalEmis: '', paidEmis: '', paidEmiAmount: '', remainingLoanAmount: '', hasEmi: false, emiStatus: 'No' };

  const CARS = [
    emiCar(baseCar(1, {
      firmName: FIRM_A, carName: 'Toyota Fortuner', vehicleType: 'SUV', dateOfPurchase: day(-620), modelNo: 'Legender 4x4 AT',
      companyPurchasedFrom: 'Shree Toyota, Delhi', fuelType: 'Diesel', registrationNo: 'DL-01-AB-1234',
      chassisNo: 'MBJGA3GS900112345', engineNo: '1GDA112345', valueOfCar: '4650000', insuranceAmount: '58000',
      rtoAmount: '465000', companyMobileNo: '9876543210', servicePersonName: 'Ramesh Kumar', servicePersonMobileNo: '9123456789',
      nameOfCompany: 'New India Assurance', nameOfOwner: 'Mr. Vikram Singh', agentName: 'Suresh Sharma',
      dateOfInsurance: day(-358), pollutionDate: day(-150),
    }), { bank: 'HDFC Bank', loanAmount: 3500000, emiAmount: 74500, startMonthsAgo: 20, totalEmis: 60, emiDay: Math.min(new Date().getDate() + 3, 28) }),
    emiCar(baseCar(2, {
      firmName: FIRM_A, carName: 'Mahindra Scorpio-N', vehicleType: 'SUV', dateOfPurchase: day(-480), modelNo: 'Z8L Diesel MT',
      companyPurchasedFrom: 'Mahindra Autozone, Mumbai', fuelType: 'Diesel', registrationNo: 'MH-02-CD-5678',
      chassisNo: 'MA1NE2ZDXP2456789', engineNo: 'ZDP4N456789', valueOfCar: '2250000', insuranceAmount: '36500',
      rtoAmount: '225000', companyMobileNo: '9876543211', servicePersonName: 'Ajay Mehta', servicePersonMobileNo: '9234567890',
      nameOfCompany: 'ICICI Lombard', nameOfOwner: 'Ms. Priya Patel', agentName: 'Deepak Joshi',
      dateOfInsurance: day(-120), pollutionDate: day(-60),
    }), { bank: 'State Bank of India', loanAmount: 1600000, emiAmount: 33200, startMonthsAgo: 15, totalEmis: 60, emiDay: 10 }),
    emiCar(baseCar(3, {
      firmName: FIRM_B, carName: 'Maruti Suzuki Swift', vehicleType: 'Car', dateOfPurchase: day(-700), modelNo: 'VXi AMT',
      companyPurchasedFrom: 'Maruti Arena, Noida', fuelType: 'Petrol', registrationNo: 'UP-16-EF-9012',
      chassisNo: 'MA3EWDE1S00987654', engineNo: 'K12NP987654', valueOfCar: '780000', insuranceAmount: '14500',
      rtoAmount: '62000', companyMobileNo: '9876543212', servicePersonName: 'Karan Soni', servicePersonMobileNo: '9345678901',
      nameOfCompany: 'Bajaj Allianz', nameOfOwner: 'Mr. Anil Gupta', agentName: 'Mohit Verma',
      dateOfInsurance: day(-200), pollutionDate: day(-30),
    }), { bank: 'ICICI Bank', loanAmount: 600000, emiAmount: 16800, startMonthsAgo: 22, totalEmis: 36, emiDay: Math.min(new Date().getDate() + 5, 28) }),
    baseCar(4, {
      firmName: FIRM_B, carName: 'Hyundai Creta', vehicleType: 'SUV', dateOfPurchase: day(-900), modelNo: 'SX(O) 1.5 CRDi',
      companyPurchasedFrom: 'Hyundai Motors, Jaipur', fuelType: 'Diesel', registrationNo: 'RJ-14-GH-3456',
      chassisNo: 'MALPC81DLNM334455', engineNo: 'D4FENM334455', valueOfCar: '1850000', insuranceAmount: '29800',
      rtoAmount: '185000', companyMobileNo: '9876543213', servicePersonName: 'Sunil Rathore', servicePersonMobileNo: '9456789012',
      nameOfCompany: 'HDFC ERGO', nameOfOwner: 'Mr. Rohit Sharma', agentName: 'Ankit Jain',
      dateOfInsurance: day(-361), pollutionDate: day(-170), ...noEmi,
    }),
    emiCar(baseCar(5, {
      firmName: FIRM_C, carName: 'Tata Nexon EV', vehicleType: 'SUV', dateOfPurchase: day(-300), modelNo: 'Empowered+ LR',
      companyPurchasedFrom: 'Tata Motors, Pune', fuelType: 'Electric', registrationNo: 'MH-12-JK-7890',
      chassisNo: 'MAT612345EV778899', engineNo: 'EVM30778899', valueOfCar: '1795000', insuranceAmount: '32000',
      rtoAmount: '0', companyMobileNo: '9876543214', servicePersonName: 'Nikhil Pawar', servicePersonMobileNo: '9567890123',
      nameOfCompany: 'Tata AIG', nameOfOwner: 'Ms. Sneha Kulkarni', agentName: 'Rahul Deshmukh',
      dateOfInsurance: day(-300), pollutionDate: '',
    }), { bank: 'Axis Bank', loanAmount: 1400000, emiAmount: 29500, startMonthsAgo: 9, totalEmis: 60, emiDay: 5 }),
    baseCar(6, {
      firmName: FIRM_C, carName: 'Honda City', vehicleType: 'Car', dateOfPurchase: day(-1100), modelNo: 'ZX CVT Hybrid',
      companyPurchasedFrom: 'Honda Cars, Bengaluru', fuelType: 'Hybrid', registrationNo: 'KA-03-LM-2468',
      chassisNo: 'MAKGN654321246810', engineNo: 'LEB1246810', valueOfCar: '1950000', insuranceAmount: '27500',
      rtoAmount: '195000', companyMobileNo: '9876543215', servicePersonName: 'Manjunath Rao', servicePersonMobileNo: '9678901234',
      nameOfCompany: 'SBI General', nameOfOwner: 'Mr. Arjun Reddy', agentName: 'Kiran Gowda',
      dateOfInsurance: day(-90), pollutionDate: day(-100), ...noEmi,
    }),
    emiCar(baseCar(7, {
      firmName: FIRM_A, carName: 'Kia Seltos', vehicleType: 'SUV', dateOfPurchase: day(-540), modelNo: 'GTX+ 1.5 Turbo DCT',
      companyPurchasedFrom: 'Kia Motors, Gurugram', fuelType: 'Petrol', registrationNo: 'HR-26-NP-1357',
      chassisNo: 'MZBEN813LNN135791', engineNo: 'G4LDNN135791', valueOfCar: '2050000', insuranceAmount: '31000',
      rtoAmount: '205000', companyMobileNo: '9876543216', servicePersonName: 'Manoj Yadav', servicePersonMobileNo: '9789012345',
      nameOfCompany: 'Reliance General', nameOfOwner: 'Mr. Harish Chauhan', agentName: 'Vivek Malik',
      dateOfInsurance: day(-175), pollutionDate: day(-20),
    }), { bank: 'Kotak Mahindra Bank', loanAmount: 1500000, emiAmount: 31800, startMonthsAgo: 17, totalEmis: 48, emiDay: 15 }),
    baseCar(8, {
      firmName: FIRM_B, carName: 'Toyota Innova Crysta', vehicleType: 'MUV', dateOfPurchase: day(-1300), modelNo: '2.4 ZX 7-Seater',
      companyPurchasedFrom: 'Toyota Lakozy, Ahmedabad', fuelType: 'Diesel', registrationNo: 'GJ-01-QR-8642',
      chassisNo: 'MBJM29BT2JX864201', engineNo: '2GDJX864201', valueOfCar: '2600000', insuranceAmount: '38000',
      rtoAmount: '260000', companyMobileNo: '9876543217', servicePersonName: 'Bhavesh Patel', servicePersonMobileNo: '9890123456',
      nameOfCompany: 'United India Insurance', nameOfOwner: 'Mr. Jignesh Shah', agentName: 'Hardik Desai',
      dateOfInsurance: day(-366), pollutionDate: day(-200), ...noEmi,
    }),
    emiCar(baseCar(9, {
      firmName: FIRM_C, carName: 'Maruti Suzuki Ertiga', vehicleType: 'MUV', dateOfPurchase: day(-260), modelNo: 'ZXi+ CNG',
      companyPurchasedFrom: 'Nexa Arena, Lucknow', fuelType: 'CNG', registrationNo: 'UP-32-ST-9753',
      chassisNo: 'MA3BNC62SPA975310', engineNo: 'K15CPA975310', valueOfCar: '1250000', insuranceAmount: '19800',
      rtoAmount: '100000', companyMobileNo: '9876543218', servicePersonName: 'Imran Khan', servicePersonMobileNo: '9901234567',
      nameOfCompany: 'Go Digit', nameOfOwner: 'Mr. Alok Mishra', agentName: 'Saurabh Tiwari',
      dateOfInsurance: day(-260), pollutionDate: day(-80),
    }), { bank: 'Bank of Baroda', loanAmount: 900000, emiAmount: 19200, startMonthsAgo: 8, totalEmis: 60, emiDay: 20 }),
    baseCar(10, {
      firmName: FIRM_A, carName: 'Mahindra Thar', vehicleType: 'SUV', dateOfPurchase: day(-820), modelNo: 'LX 4WD Hard Top',
      companyPurchasedFrom: 'Mahindra Showroom, Chandigarh', fuelType: 'Diesel', registrationNo: 'CH-01-UV-1122',
      chassisNo: 'MA1TA2MHKM2112233', engineNo: 'MHAWK112233', valueOfCar: '1650000', insuranceAmount: '24500',
      rtoAmount: '165000', companyMobileNo: '9876543219', servicePersonName: 'Gurpreet Singh', servicePersonMobileNo: '9812345670',
      nameOfCompany: 'National Insurance', nameOfOwner: 'Mr. Manpreet Gill', agentName: 'Jaspal Sandhu',
      dateOfInsurance: day(-45), pollutionDate: day(-45), ...noEmi,
    }),
  ];

  const carById = Object.fromEntries(CARS.map(c => [c.vehicleId, c]));

  // ─── INSURANCE ────────────────────────────────────────────────────────────
  const insurance = (n, vehicleId, { company, idv, basic, tp, addOn, tax, ncb, claimed, cashless = 'Yes', addOns = {} }) => {
    const car = carById[vehicleId];
    const start = car.dateOfInsurance;
    const startDate = new Date(start);
    const end = new Date(startDate);
    end.setFullYear(end.getFullYear() + 1);
    end.setDate(end.getDate() - 1);
    const endIso = isoDate(end);
    const total = basic + tp + addOn + tax;
    return {
      id: `ins_${String(n).padStart(3, '0')}`,
      vehicleId,
      carName: car.carName,
      date: start,
      nameOfCompany: company,
      agentName: car.agentName,
      idvValue: String(idv),
      totalPremiumToBePaid: String(total),
      basicPremium: String(basic),
      thirdPartyPremium: String(tp),
      addOnPremium: String(addOn),
      depreciationReimbursement: !!addOns.dep,
      engineSecure: !!addOns.engine,
      consumableExpenses: !!addOns.consumable,
      personalBelonging: !!addOns.belonging,
      roadsideAssistance: !!addOns.rsa,
      keyReplacement: !!addOns.key,
      emergencyTransportHotel: !!addOns.hotel,
      taxAmount: String(tax),
      totalPremiumAmount: String(total),
      claimedLastYear: claimed ? 'Yes' : 'No',
      policyInclusiveOfNcb: ncb ? 'Yes' : 'No',
      premiumOfNcb: String(ncb || 0),
      cashlessPolicy: cashless,
      hasOwnDamage: 'Yes',
      odStartDate: start,
      odEndDate: endIso,
      hasThirdParty: 'Yes',
      tpPolicyNo: `TP-${company.slice(0, 3).toUpperCase()}-${2025000 + n * 137}`,
      tpStartDate: start,
      tpEndDate: endIso,
      tppdLimit: '750000',
      hasPaCover: 'Yes',
      paCoverType: 'Owner-Driver CPA (₹15 Lakhs)',
      paSumInsured: '1500000',
      paPremium: '375',
      paStartDate: start,
      paEndDate: endIso,
      paNomineeName: car.nameOfOwner.replace(/^(Mr\.|Ms\.)\s*/, 'Mrs. '),
      paNomineeRelation: 'Spouse',
      validityDate: endIso,
      renewalDate: endIso,
      timestamp: ts(-1),
      createdAt: ts(-1),
    };
  };

  const INSURANCE = [
    insurance(1, 'CAR-0001', { company: 'New India Assurance', idv: 3900000, basic: 38500, tp: 7890, addOn: 6200, tax: 9460, ncb: 7700, addOns: { dep: true, engine: true, rsa: true, key: true } }),
    insurance(2, 'CAR-0002', { company: 'ICICI Lombard', idv: 1900000, basic: 21800, tp: 7890, addOn: 3100, tax: 5900, ncb: 0, claimed: true, addOns: { dep: true, rsa: true } }),
    insurance(3, 'CAR-0003', { company: 'Bajaj Allianz', idv: 560000, basic: 7200, tp: 3416, addOn: 1500, tax: 2180, ncb: 1440, addOns: { rsa: true, consumable: true } }),
    insurance(4, 'CAR-0004', { company: 'HDFC ERGO', idv: 1350000, basic: 15600, tp: 7890, addOn: 2400, tax: 4650, ncb: 3900, addOns: { dep: true, engine: true, rsa: true } }),
    insurance(5, 'CAR-0005', { company: 'Tata AIG', idv: 1600000, basic: 18900, tp: 2010, addOn: 4800, tax: 4630, ncb: 0, addOns: { dep: true, consumable: true, rsa: true, key: true, hotel: true } }),
    insurance(6, 'CAR-0006', { company: 'SBI General', idv: 1350000, basic: 14200, tp: 3416, addOn: 2100, tax: 3550, ncb: 4260, addOns: { dep: true, rsa: true } }),
    insurance(7, 'CAR-0007', { company: 'Reliance General', idv: 1700000, basic: 17400, tp: 3416, addOn: 3300, tax: 4220, ncb: 2610, addOns: { dep: true, engine: true, belonging: true } }),
    insurance(8, 'CAR-0008', { company: 'United India Insurance', idv: 1600000, basic: 19800, tp: 7890, addOn: 2600, tax: 5450, ncb: 5940, cashless: 'No', addOns: { rsa: true } }),
    insurance(9, 'CAR-0009', { company: 'Go Digit', idv: 1100000, basic: 11200, tp: 3416, addOn: 1900, tax: 2970, ncb: 0, addOns: { dep: true, rsa: true, consumable: true } }),
  ];

  // ─── REPAIRS + VENDOR OFFERS + DELIVERIES + PAYMENTS ──────────────────────
  // Each repair is at a different stage of the workflow.
  const repairBase = (n, vehicleId, data) => ({
    id: `rep_${String(n).padStart(3, '0')}`,
    repairNo: `REP-${String(n).padStart(4, '0')}`,
    vehicleId,
    carName: carById[vehicleId].carName,
    ...data,
  });

  const REPAIRS = [
    repairBase(1, 'CAR-0001', { reasonForRepair: 'Front bumper damage due to minor accident', garage: 'AutoCare Garage, Sector 18 Noida', garageName: 'AutoCare Garage', whoTakingCar: 'Ramesh Kumar', insuranceToBeClaimed: 'Yes', department: 'Operations', repairStatus: 'Payment Completed', plannedDate: ts(-40), actualDate: ts(-39), plannedDate2: ts(-38), actualDate2: ts(-38, 15), plannedDate3: ts(-30), actualDate3: ts(-31), dateVehicleReceived: day(-31), expectedCompletionDate: day(-32), timestamp: ts(-41), createdAt: ts(-41) }),
    repairBase(2, 'CAR-0002', { reasonForRepair: 'Engine oil leak and periodic servicing', garage: 'Speed Motors Workshop, Andheri', garageName: 'Speed Motors Workshop', whoTakingCar: 'Ajay Mehta', insuranceToBeClaimed: 'No', department: 'Sales', repairStatus: 'Delivered', plannedDate: ts(-14), actualDate: ts(-13), plannedDate2: ts(-12), actualDate2: ts(-12, 16), actualDate3: ts(-6), dateVehicleReceived: day(-6), expectedCompletionDate: day(-7), timestamp: ts(-15), createdAt: ts(-15) }),
    repairBase(3, 'CAR-0004', { reasonForRepair: 'AC not cooling, compressor noise', garage: 'Cool Point Auto AC, Jaipur', garageName: 'Cool Point Auto AC', whoTakingCar: 'Sunil Rathore', insuranceToBeClaimed: 'No', department: 'Admin', repairStatus: 'Approved', plannedDate: ts(-6), actualDate: ts(-5), plannedDate2: ts(-4), actualDate2: ts(-3), expectedCompletionDate: day(2), timestamp: ts(-7), createdAt: ts(-7) }),
    repairBase(4, 'CAR-0007', { reasonForRepair: 'Rear door dent and scratch – parking lot hit', garage: 'Kia Service Centre, Gurugram', garageName: 'Kia Service Centre', whoTakingCar: 'Manoj Yadav', insuranceToBeClaimed: 'Yes', department: 'Marketing', repairStatus: 'Offer Received', plannedDate: ts(-3), actualDate: ts(-2), expectedCompletionDate: day(5), timestamp: ts(-4), createdAt: ts(-4) }),
    repairBase(5, 'CAR-0008', { reasonForRepair: 'Brake pads worn out, suspension noise', garage: 'Toyota Lakozy Service, Ahmedabad', garageName: 'Toyota Lakozy Service', whoTakingCar: 'Bhavesh Patel', insuranceToBeClaimed: 'No', department: 'Operations', repairStatus: 'Offer Received', plannedDate: ts(-2), actualDate: ts(-1), expectedCompletionDate: day(3), timestamp: ts(-3), createdAt: ts(-3) }),
    repairBase(6, 'CAR-0003', { reasonForRepair: 'Clutch plate replacement', garage: 'Maruti Arena Workshop, Noida', whoTakingCar: 'Karan Soni', insuranceToBeClaimed: 'No', department: 'Finance', repairStatus: 'Created', plannedDate: ts(1), timestamp: ts(-1), createdAt: ts(-1) }),
    repairBase(7, 'CAR-0010', { reasonForRepair: 'Windshield crack after stone hit on highway', garage: 'Glass Fix Auto, Chandigarh', whoTakingCar: 'Gurpreet Singh', insuranceToBeClaimed: 'Yes', department: 'Management', repairStatus: 'Created', plannedDate: ts(1), timestamp: ts(0, 9), createdAt: ts(0, 9) }),
    repairBase(8, 'CAR-0006', { reasonForRepair: 'Annual service + wheel alignment', garage: 'Honda Service, Whitefield', garageName: 'Honda Service Whitefield', whoTakingCar: 'Manjunath Rao', insuranceToBeClaimed: 'No', department: 'IT', repairStatus: 'Payment Completed', plannedDate: ts(-70), actualDate: ts(-69), plannedDate2: ts(-68), actualDate2: ts(-68, 14), actualDate3: ts(-64), dateVehicleReceived: day(-64), expectedCompletionDate: day(-65), timestamp: ts(-71), createdAt: ts(-71) }),
  ];

  const offer = (repair, { types, insuranceFlag = 'No', approval }) => ({
    id: `offer_${repair.repairNo}`,
    repairNo: repair.repairNo,
    vehicleId: repair.vehicleId,
    carName: repair.carName,
    garageName: repair.garageName || repair.garage,
    expectedCompletionDate: repair.expectedCompletionDate || '',
    plannedDate: repair.plannedDate || '',
    actualDate: repair.actualDate || '',
    plannedDate2: repair.plannedDate2 || '',
    actualDate2: approval === 'Approved' ? repair.actualDate2 : '',
    photoOfOffer: '',
    insurance: insuranceFlag,
    typesOfRepair: types,
    approvalStatus: approval,
    approvedAt: approval === 'Approved' ? repair.actualDate2 : '',
    approvalRemarks: approval === 'Approved' ? 'Rates verified, approved.' : '',
    timestamp: repair.actualDate,
    createdAt: repair.actualDate,
  });

  const [r1, r2, r3, r4, r5, , , r8] = REPAIRS;
  const VENDOR_OFFERS = [
    offer(r1, { types: ['Body Repair', 'Denting', 'Painting'], insuranceFlag: 'Yes', approval: 'Approved' }),
    offer(r2, { types: ['Regular Maintainance', 'Mechanical'], approval: 'Approved' }),
    offer(r3, { types: ['AC Servicing', 'Electrical'], approval: 'Approved' }),
    offer(r4, { types: ['Denting', 'Painting'], insuranceFlag: 'Yes', approval: 'Pending' }),
    offer(r5, { types: ['Mechanical', 'General Checkup'], approval: 'Pending' }),
    offer(r8, { types: ['Regular Maintainance', 'Tyre Change'], approval: 'Approved' }),
  ];

  const delivery = (repair, { km, work, parts, service, insClaimed = 'No', insAmount = '' }) => ({
    id: `del_${repair.repairNo}`,
    repairNo: repair.repairNo,
    vehicleId: repair.vehicleId,
    vehicleName: repair.carName,
    garageName: repair.garageName,
    dateVehicleReceived: repair.dateVehicleReceived,
    kmAtTimeOfRepair: String(km),
    repairWorkDone: work,
    partsAmount: String(parts),
    serviceAmount: String(service),
    insuranceClaimed: insClaimed,
    insuranceAmount: insAmount ? String(insAmount) : '',
    billAmount: String(parts + service),
    billImage: '',
    deliveryStatus: 'Delivery Submitted',
    deliveredAt: repair.actualDate3,
    actualDate3: repair.actualDate3,
    submittedAt: repair.actualDate3,
    timestamp: repair.actualDate3,
  });

  const DELIVERIES = [
    delivery(r1, { km: 38450, work: 'Bumper replaced, headlamp aligned, full panel paint', parts: 42500, service: 9500, insClaimed: 'Yes', insAmount: 38000 }),
    delivery(r2, { km: 27110, work: 'Oil seal replaced, engine oil + filters changed', parts: 6800, service: 2400 }),
    delivery(r8, { km: 61230, work: 'Periodic service, 4-wheel alignment & balancing, 2 tyres replaced', parts: 18600, service: 3200 }),
  ];

  const payment = (del, { status, method = 'Bank Transfer', paidOn }) => ({
    id: `pay_${del.repairNo}`,
    repairNo: del.repairNo,
    vehicleId: del.vehicleId,
    carName: del.vehicleName,
    vehicleName: del.vehicleName,
    garageName: del.garageName,
    dateVehicleReceived: del.dateVehicleReceived,
    kmAtTimeOfRepair: del.kmAtTimeOfRepair,
    serviceAmount: del.serviceAmount,
    billAmount: del.billAmount,
    billImage: '',
    paymentStatus: status,
    paymentMethod: method,
    paidAmount: status === 'Payment Completed' ? del.billAmount : '0',
    paymentDate: paidOn || '',
    paidAt: status === 'Payment Completed' ? paidOn : undefined,
    notes: status === 'Payment Completed' ? 'Paid via NEFT' : '',
    timestamp: del.timestamp,
    createdAt: del.timestamp,
  });

  const [d1, d2, d8] = DELIVERIES;
  const PAYMENTS = [
    payment(d1, { status: 'Payment Completed', paidOn: day(-28) }),
    payment(d2, { status: 'Payment Pending' }),
    payment(d8, { status: 'Payment Completed', method: 'UPI', paidOn: day(-60) }),
  ];

  // ─── ACCIDENT / INSURANCE CLAIMS ──────────────────────────────────────────
  const claimBase = (n, repair, data) => {
    const car = carById[repair.vehicleId];
    const ins = INSURANCE.find(i => i.vehicleId === repair.vehicleId);
    return {
      id: `clm_${String(n).padStart(3, '0')}`,
      claimNo: `CLM-${String(n).padStart(4, '0')}`,
      repairNo: repair.repairNo,
      vehicleId: repair.vehicleId,
      vehicleName: car.carName,
      registrationNo: car.registrationNo,
      accidentLocation: repair.garage,
      accidentReason: repair.reasonForRepair,
      driverName: repair.whoTakingCar,
      driverMobileNo: car.servicePersonMobileNo,
      insuranceCompany: ins?.nameOfCompany || car.nameOfCompany,
      policyNo: ins?.tpPolicyNo || '',
      policyValidity: ins?.odEndDate || '',
      insuranceClaim: 'Yes',
      typeOfClaim: 'Own Damage',
      claimMode: 'Cashless Claim (Network Garage)',
      accidentPhotos: null,
      firRequired: 'No',
      firCopy: null,
      policeReport: null,
      otherDocuments: null,
      claimIntimationNo: '',
      surveyorName: '',
      surveyorMobileNo: '',
      surveyDate: '',
      surveyStatus: 'Pending',
      claimStatus: 'Claim Under Process',
      claimApprovedAmount: '',
      claimRejectedReason: '',
      expectedSettlementDate: '',
      claimSettlementDate: '',
      remarks: '',
      stage1Completed: false,
      stage2Completed: false,
      stage3Completed: false,
      ...data,
    };
  };

  const [, , , , , , r7] = REPAIRS;
  const CLAIMS = [
    claimBase(1, r1, {
      dateOfAccident: day(-42), timeOfAccident: '14:30', estimatedClaimAmount: '52000',
      claimIntimatedDate: day(-41), claimIntimationNo: 'NIA-INT-2026-0412', surveyorName: 'Mr. Deepak Sharma', surveyorMobileNo: '9876501234',
      surveyDate: day(-39), surveyStatus: 'Completed', claimStatus: 'Settled', claimApprovedAmount: '38000',
      expectedSettlementDate: day(-30), claimSettlementDate: day(-29), remarks: 'Claim settled directly with garage (cashless).',
      stage1Completed: true, stage2Completed: true, stage3Completed: true, isProcessed: true, actual: ts(-39),
      timestamp: ts(-41), createdAt: ts(-41),
    }),
    claimBase(2, r4, {
      dateOfAccident: day(-4), timeOfAccident: '19:10', estimatedClaimAmount: '24500',
      claimIntimatedDate: day(-3), claimIntimationNo: 'REL-INT-2026-1187', surveyorName: 'Ms. Kavita Arora', surveyorMobileNo: '9811122233',
      surveyDate: day(1), surveyStatus: 'Scheduled', claimStatus: 'Survey Pending', expectedSettlementDate: day(10),
      stage1Completed: true, isProcessed: true, actual: ts(-3), remarks: 'Survey scheduled at Kia Service Centre.',
      timestamp: ts(-4), createdAt: ts(-4),
    }),
    claimBase(3, r7, {
      dateOfAccident: day(-1), timeOfAccident: '08:45', estimatedClaimAmount: '18000', typeOfClaim: 'Windshield',
      claimIntimatedDate: day(0), claimStatus: 'Claim Intimated', remarks: 'Stone hit on NH-5.',
      timestamp: ts(0, 9), createdAt: ts(0, 9),
    }),
  ];

  // ─── CHALLANS ─────────────────────────────────────────────────────────────
  const challan = (n, vehicleId, data) => {
    const car = carById[vehicleId];
    return {
      id: `ch_seed_${String(n).padStart(3, '0')}`,
      challanNo: `CHN${2026000 + n * 731}`,
      vehicleId,
      carName: car.carName,
      firmName: car.firmName,
      registrationNo: car.registrationNo,
      fuelType: car.fuelType,
      owner: car.nameOfOwner,
      paymentDate: '',
      transactionId: '',
      documentUrl: '',
      remarks: '',
      ...data,
      timestamp: ts(-(data.ago || 1)),
      createdAt: ts(-(data.ago || 1)),
    };
  };

  const CHALLANS = [
    challan(1, 'CAR-0001', { ago: 25, dateOfChallan: day(-25), reasonOfChallan: 'Over Speeding', driverName: 'Ramesh Kumar', driverMobile: '9123456789', challanAmount: '2000', location: 'Delhi Traffic Police – NH-48', paymentStatus: 'Paid', paymentDate: day(-20), transactionId: 'UPI4587123690', remarks: 'Paid online via Parivahan.' }),
    challan(2, 'CAR-0002', { ago: 10, dateOfChallan: day(-10), reasonOfChallan: 'Wrong Parking / No Parking Zone', driverName: 'Ajay Mehta', driverMobile: '9234567890', challanAmount: '500', location: 'Mumbai Traffic Police – Andheri', paymentStatus: 'Pending' }),
    challan(3, 'CAR-0003', { ago: 6, dateOfChallan: day(-6), reasonOfChallan: 'Red Light Jumping / Signal Violation', driverName: 'Karan Soni', driverMobile: '9345678901', challanAmount: '1000', location: 'Noida Traffic Police – Sector 18', paymentStatus: 'Pending' }),
    challan(4, 'CAR-0007', { ago: 40, dateOfChallan: day(-40), reasonOfChallan: 'Driving Without Seatbelt', driverName: 'Manoj Yadav', driverMobile: '9789012345', challanAmount: '1000', location: 'Gurugram Traffic Police – Golf Course Rd', paymentStatus: 'Paid', paymentDate: day(-35), transactionId: 'NEFT20260987' }),
    challan(5, 'CAR-0010', { ago: 3, dateOfChallan: day(-3), reasonOfChallan: 'Dark Tinted Glass / Sunfilm Violation', driverName: 'Gurpreet Singh', driverMobile: '9812345670', challanAmount: '1500', location: 'Chandigarh Traffic Police – Sector 17', paymentStatus: 'Pending', remarks: 'Sun film to be removed.' }),
    challan(6, 'CAR-0001', { ago: 2, dateOfChallan: day(-2), reasonOfChallan: 'Mobile Phone Usage While Driving', driverName: 'Ramesh Kumar', driverMobile: '9123456789', challanAmount: '5000', location: 'Delhi Traffic Police – ITO', paymentStatus: 'Pending' }),
  ];

  // ─── FASTAGS ──────────────────────────────────────────────────────────────
  const fastag = (vehicleId, data) => {
    const car = carById[vehicleId];
    return {
      id: `ft_seed_${vehicleId}`,
      vehicleId,
      carName: car.carName,
      firmName: car.firmName,
      registrationNo: car.registrationNo,
      fuelType: car.fuelType,
      owner: car.nameOfOwner,
      fastagStatus: 'Active',
      vehicleClass: 'VC4 - Car / Jeep / Van',
      lowBalanceLimit: '200',
      documentUrl: '',
      remarks: '',
      timestamp: ts(-200),
      createdAt: ts(-200),
      ...data,
    };
  };

  const FASTAGS = [
    fastag('CAR-0001', { tagId: '34161FA820328E4C1A2B3C01', bankName: 'HDFC Bank Fastag', linkedMobile: '9876543210', walletId: 'HDFCFT0001', balance: '2450', activationDate: day(-600), expiryDate: day(1225) }),
    fastag('CAR-0002', { tagId: '34161FA820328E4C1A2B3C02', bankName: 'ICICI Bank Fastag', linkedMobile: '9876543211', walletId: 'ICICFT0002', balance: '150', activationDate: day(-470), expiryDate: day(1355), remarks: 'Low balance – recharge required.' }),
    fastag('CAR-0003', { tagId: '34161FA820328E4C1A2B3C03', bankName: 'Paytm Payments Bank', linkedMobile: '9876543212', walletId: 'PYTMFT0003', balance: '0', activationDate: day(-690), expiryDate: day(1135), fastagStatus: 'Suspended', remarks: 'Bank discontinued, migrate to new issuer.' }),
    fastag('CAR-0004', { tagId: '34161FA820328E4C1A2B3C04', bankName: 'Axis Bank Fastag', linkedMobile: '9876543213', walletId: 'AXISFT0004', balance: '1280', activationDate: day(-880), expiryDate: day(945) }),
    fastag('CAR-0006', { tagId: '34161FA820328E4C1A2B3C06', bankName: 'State Bank of India (SBI)', linkedMobile: '9876543215', walletId: 'SBIFT0006', balance: '890', activationDate: day(-1080), expiryDate: day(745) }),
    fastag('CAR-0007', { tagId: '34161FA820328E4C1A2B3C07', bankName: 'Kotak Mahindra Bank', linkedMobile: '9876543216', walletId: 'KOTKFT0007', balance: '3120', activationDate: day(-530), expiryDate: day(1295) }),
    fastag('CAR-0008', { tagId: '34161FA820328E4C1A2B3C08', bankName: 'IDFC FIRST Bank', linkedMobile: '9876543217', walletId: 'IDFCFT0008', balance: '640', activationDate: day(-1280), expiryDate: day(545) }),
  ];

  // ─── DAILY TRIPS + FUEL ENTRIES ───────────────────────────────────────────
  // Simple deterministic random so the demo data looks the same on every reset
  let rnd = 7;
  const rand = () => { rnd = (rnd * 9301 + 49297) % 233280; return rnd / 233280; };
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];

  const ROUTES = {
    'CAR-0001': ['Delhi Office', ['Gurugram Plant', 'Noida Site', 'IGI Airport', 'Faridabad Depot', 'Jaipur (Outstation)']],
    'CAR-0002': ['Mumbai Office', ['Andheri Warehouse', 'Navi Mumbai Plant', 'Thane Client', 'Pune (Outstation)', 'CSMT Station']],
    'CAR-0003': ['Noida Office', ['Greater Noida Site', 'Ghaziabad Vendor', 'Delhi HQ', 'Sector 62 Client']],
    'CAR-0004': ['Jaipur Office', ['Sitapura Plant', 'Jaipur Airport', 'Ajmer (Outstation)', 'Malviya Nagar Client']],
    'CAR-0005': ['Pune Office', ['Hinjewadi Client', 'Chakan Plant', 'Pune Airport', 'Lonavala (Outstation)']],
    'CAR-0006': ['Bengaluru Office', ['Whitefield Client', 'Electronic City Plant', 'KIA Airport', 'Mysuru (Outstation)']],
    'CAR-0007': ['Gurugram Office', ['Manesar Plant', 'Cyber City Client', 'Delhi HQ', 'Rewari Vendor']],
    'CAR-0008': ['Ahmedabad Office', ['Sanand Plant', 'SG Highway Client', 'Vadodara (Outstation)', 'Ahmedabad Airport']],
    'CAR-0009': ['Lucknow Office', ['Gomti Nagar Client', 'Amausi Airport', 'Kanpur (Outstation)', 'Chinhat Depot']],
    'CAR-0010': ['Chandigarh Office', ['Mohali Plant', 'Panchkula Client', 'Ludhiana (Outstation)', 'Zirakpur Vendor']],
  };
  const PURPOSES = ['Client Meeting', 'Site Visit', 'Material Pickup', 'Airport Drop', 'Staff Pickup / Drop', 'Bank Work', 'Vendor Visit', 'Management Travel'];
  const PUMPS = MASTER_FILLING_LOCATIONS.filter(p => !p.includes('EZ Charge'));
  const startOdo = { 'CAR-0001': 36800, 'CAR-0002': 25600, 'CAR-0003': 41200, 'CAR-0004': 58300, 'CAR-0005': 9800, 'CAR-0006': 60100, 'CAR-0007': 29400, 'CAR-0008': 87200, 'CAR-0009': 7600, 'CAR-0010': 33900 };
  const rates = { Petrol: 94.7, Diesel: 87.6, CNG: 76.5, Electric: 18, Hybrid: 94.7 };
  const kmpl = { 'CAR-0001': 10, 'CAR-0002': 13, 'CAR-0003': 19, 'CAR-0004': 17, 'CAR-0005': 7, 'CAR-0006': 23, 'CAR-0007': 15, 'CAR-0008': 11, 'CAR-0009': 24, 'CAR-0010': 14 };
  const tankSize = { Petrol: 40, Diesel: 55, CNG: 12, Electric: 40, Hybrid: 40 };

  const TRIPS = [];
  const FUELS = [];
  CARS.forEach(car => {
    const vid = car.vehicleId;
    const [home, places] = ROUTES[vid];
    let odo = startOdo[vid];
    let sinceFill = 0;
    let lastFillOdo = odo;
    for (let ago = 45; ago >= -1; ago--) {
      if (rand() < 0.45 && ago > 0) continue; // car not used every day
      const to = pick(places);
      const outstation = to.includes('Outstation');
      const km = outstation ? 180 + Math.round(rand() * 220) : 18 + Math.round(rand() * 70);
      const status = ago > 0 ? 'Completed' : (ago === 0 ? (rand() < 0.5 ? 'In Progress' : 'Completed') : 'Scheduled');
      const startHour = 8 + Math.floor(rand() * 4);
      const done = status === 'Completed';
      const toll = outstation ? 150 + Math.round(rand() * 6) * 50 : (rand() < 0.3 ? 65 : 0);
      TRIPS.push({
        id: `trip_${vid}_${ago}`,
        tripNo: '',
        date: day(-ago),
        vehicleId: vid,
        carName: car.carName,
        registrationNo: car.registrationNo,
        driverName: car.servicePersonName,
        driverMobile: car.servicePersonMobileNo,
        tripType: outstation ? 'Outstation' : 'Local',
        purpose: pick(PURPOSES),
        department: pick(['Operations', 'Sales', 'Admin', 'Management', 'Finance']),
        fromLocation: home,
        toLocation: to,
        startTime: `${pad(startHour)}:${pick(['00', '15', '30', '45'])}`,
        endTime: done ? `${pad(Math.min(startHour + (outstation ? 9 : 3), 22))}:${pick(['00', '20', '40'])}` : '',
        startKm: status === 'Scheduled' ? '' : String(odo),
        endKm: done ? String(odo + km) : '',
        distance: done ? String(km) : '',
        tollAmount: done ? String(toll) : '',
        parkingAmount: done && rand() < 0.35 ? String(pick([20, 40, 50, 100])) : '',
        otherExpense: done && outstation ? String(pick([0, 150, 250, 400])) : '',
        billableAmount: done && outstation ? String(km * 14) : '',
        status,
        remarks: outstation && done ? 'Driver allowance included in other expense.' : '',
        timestamp: ts(-ago, startHour),
        createdAt: ts(-ago, startHour),
      });
      if (done) {
        odo += km;
        sinceFill += km;
      }
      // Refuel when roughly 70% of the tank has been used
      if (sinceFill > kmpl[vid] * tankSize[car.fuelType] * 0.7) {
        const qty = Math.round((sinceFill / kmpl[vid]) * (0.95 + rand() * 0.1) * 100) / 100;
        const rate = rates[car.fuelType];
        const electric = car.fuelType === 'Electric';
        FUELS.push({
          id: `fuel_${vid}_${ago}`,
          fuelNo: '',
          date: day(-ago),
          vehicleId: vid,
          carName: car.carName,
          registrationNo: car.registrationNo,
          fuelType: car.fuelType,
          quantity: String(qty),
          unit: electric ? 'kWh' : (car.fuelType === 'CNG' ? 'Kg' : 'Litre'),
          rate: String(rate),
          amount: String(Math.round(qty * rate)),
          odometer: String(odo),
          lastKm: String(lastFillOdo),
          kmImage: '',
          entryBy: 'Durgesh',
          fullTank: 'Yes',
          pumpName: electric ? 'Tata Power EZ Charge' : pick(PUMPS),
          location: home.replace(' Office', ''),
          paymentMode: pick(['Fuel Card', 'Company Account', 'UPI', 'Card']),
          filledBy: car.servicePersonName,
          billNo: `BL${100000 + Math.floor(rand() * 899999)}`,
          billImage: '',
          remarks: '',
          timestamp: ts(-ago, 19),
          createdAt: ts(-ago, 19),
        });
        sinceFill = 0;
        lastFillOdo = odo;
      }
    }
  });
  TRIPS.sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
  TRIPS.forEach((t, i) => { t.tripNo = `TRP-${String(i + 1).padStart(4, '0')}`; });
  FUELS.sort((a, b) => a.date.localeCompare(b.date));
  FUELS.forEach((f, i) => { f.fuelNo = `FUEL-${String(i + 1).padStart(4, '0')}`; });

  // Every fill came from a fuel request slip
  const FUEL_SLIPS = FUELS.map((f, i) => {
    const issued = new Date(f.date);
    issued.setHours(9, 30, 0, 0);
    return {
      id: `slip_${f.id}`,
      slipNo: String(1001 + i),
      vehicleId: f.vehicleId,
      carName: f.carName,
      registrationNo: f.registrationNo,
      vehicleType: carById[f.vehicleId].vehicleType || 'Car',
      fuelType: f.fuelType,
      firmName: carById[f.vehicleId].firmName,
      issuedTo: f.filledBy,
      lastKm: f.lastKm,
      fillingLocation: f.pumpName,
      requestedBy: 'Admin',
      remarks: '',
      issuedAt: createTimestamp(issued),
      status: 'Filled',
      fuelNo: f.fuelNo,
      entryBy: f.entryBy,
      filledAt: f.timestamp,
      timestamp: createTimestamp(issued),
      createdAt: createTimestamp(issued),
    };
  });
  FUELS.forEach((f, i) => { f.slipNo = FUEL_SLIPS[i].slipNo; });

  // A few open requests for the demo: pending today + one not filled yesterday
  const lastOdo = (vid) => Math.max(...TRIPS.filter(t => t.vehicleId === vid).map(t => Number(t.endKm || t.startKm) || 0), startOdo[vid]);
  [['CAR-0002', 0, 'Pending'], ['CAR-0008', 0, 'Pending'], ['CAR-0004', 0, 'Pending'], ['CAR-0007', 1, 'Not Filled']].forEach(([vid, ago, status], i) => {
    const car = carById[vid];
    FUEL_SLIPS.push({
      id: `slip_open_${i}`,
      slipNo: String(1001 + FUEL_SLIPS.length),
      vehicleId: vid,
      carName: car.carName,
      registrationNo: car.registrationNo,
      vehicleType: car.vehicleType || 'Car',
      fuelType: car.fuelType,
      firmName: car.firmName,
      issuedTo: car.servicePersonName,
      lastKm: String(lastOdo(vid)),
      fillingLocation: pick(PUMPS),
      requestedBy: 'Admin',
      remarks: '',
      issuedAt: ts(-ago, 9 + i),
      status,
      ...(status === 'Not Filled' ? { entryBy: 'Mdo', notFilledReason: 'Pump out of stock, slip cancelled.', closedAt: ts(-ago, 18) } : {}),
      timestamp: ts(-ago, 9 + i),
      createdAt: ts(-ago, 9 + i),
    });
  });

  return {
    CARS,
    TRIPS,
    FUELS,
    FUEL_SLIPS,
    INSURANCE,
    REPAIRS,
    CLAIMS,
    VENDOR_OFFERS,
    DELIVERY_PLANNING: [],
    DELIVERIES,
    PAYMENTS,
    CHALLANS,
    FASTAGS,
  };
};
