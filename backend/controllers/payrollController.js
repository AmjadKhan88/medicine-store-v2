const EmployeeProfile = require('../models/EmployeeProfile');
const PayrollRecord   = require('../models/PayrollRecord');
const Advance         = require('../models/Advance');
const User            = require('../models/User');

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

/* ════════ EMPLOYEE PROFILES ════════ */

exports.getProfiles = async (req, res) => {
  try {
    const profiles = await EmployeeProfile.find({ storeId: req.storeId, isActive: true })
      .populate('user', 'name email role phone isActive')
      .sort({ createdAt: 1 });
    res.json({ success: true, profiles });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getProfile = async (req, res) => {
  try {
    const profile = await EmployeeProfile.findOne({ storeId: req.storeId, _id: req.params.id })
      .populate('user', 'name email role phone');
    if (!profile) return res.status(404).json({ success: false, message: 'Profile not found' });
    res.json({ success: true, profile });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.createProfile = async (req, res) => {
  try {
    const { userId, basicSalary, allowances, designation, department,
      employeeCode, joiningDate, employmentType, cnic, dateOfBirth, gender,
      address, emergencyContactName, emergencyContactPhone,
      deductEOBI, deductIncomeTax, customDeductions,
      bankName, accountTitle, accountNumber, iban,
      annualLeaveBalance, sickLeaveBalance, workingHours, notes } = req.body;

    if (!userId || !basicSalary)
      return res.status(400).json({ success: false, message: 'Employee and basic salary required' });

    // Verify user belongs to this store
    const user = await User.findOne({ _id: userId, storeId: req.storeId });
    if (!user) return res.status(404).json({ success: false, message: 'Employee not found' });

    const existing = await EmployeeProfile.findOne({ user: userId });
    if (existing) return res.status(400).json({ success: false, message: 'Profile already exists for this employee' });

    const profile = await EmployeeProfile.create({
      storeId: req.storeId,
      user:    userId,
      basicSalary: Number(basicSalary),
      allowances:  allowances || [],
      designation: designation?.trim() || user.role,
      department:  department?.trim()  || '',
      employeeCode:employeeCode?.trim()|| '',
      joiningDate: joiningDate ? new Date(joiningDate) : null,
      employmentType: employmentType || 'Full-Time',
      cnic: cnic?.trim() || '',
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      gender: gender || '',
      address: address?.trim() || '',
      emergencyContactName:  emergencyContactName?.trim()  || '',
      emergencyContactPhone: emergencyContactPhone?.trim() || '',
      deductEOBI:        !!deductEOBI,
      deductIncomeTax:   !!deductIncomeTax,
      customDeductions:  customDeductions  || [],
      bankName:          bankName?.trim()          || '',
      accountTitle:      accountTitle?.trim()      || '',
      accountNumber:     accountNumber?.trim()     || '',
      iban:              iban?.trim()              || '',
      annualLeaveBalance:Number(annualLeaveBalance || 18),
      sickLeaveBalance:  Number(sickLeaveBalance   || 10),
      workingHours:      Number(workingHours       || 8),
      notes: notes || '',
    });

    await profile.populate('user', 'name email role phone');
    res.status(201).json({ success: true, profile, message: `Profile created for ${user.name}` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.updateProfile = async (req, res) => {
  try {
    const profile = await EmployeeProfile.findOneAndUpdate(
      { _id: req.params.id, storeId: req.storeId },
      req.body,
      { new: true }
    ).populate('user', 'name email role phone');
    if (!profile) return res.status(404).json({ success: false, message: 'Profile not found' });
    res.json({ success: true, profile, message: 'Profile updated' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ════════ PAYROLL ════════ */

/* ── GET payroll for a month ── */
exports.getMonthlyPayroll = async (req, res) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) return res.status(400).json({ success: false, message: 'Month and year required' });

    const records = await PayrollRecord.find({
      storeId: req.storeId,
      month:   Number(month),
      year:    Number(year),
    }).populate('employee', 'name email role phone').sort({ employeeName: 1 });

    const totals = records.reduce((acc, r) => ({
      grossSalary:   acc.grossSalary   + r.grossSalary,
      totalDeductions:acc.totalDeductions + r.totalDeductions,
      netSalary:     acc.netSalary     + r.netSalary,
      bonuses:       acc.bonuses       + r.bonuses,
      advanceDeducted:acc.advanceDeducted + r.advanceDeducted,
    }), { grossSalary:0, totalDeductions:0, netSalary:0, bonuses:0, advanceDeducted:0 });

    res.json({ success: true, records, totals, period: { month: Number(month), year: Number(year), monthName: MONTHS[Number(month)-1] } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── GENERATE payroll for all employees for a month ── */
exports.generatePayroll = async (req, res) => {
  try {
    const { month, year, workingDaysInMonth = 26 } = req.body;
    if (!month || !year) return res.status(400).json({ success: false, message: 'Month and year required' });

    // Get all active employee profiles
    const profiles = await EmployeeProfile.find({ storeId: req.storeId, isActive: true })
      .populate('user', 'name email role phone isActive');

    const activeProfiles = profiles.filter(p => p.user?.isActive);
    if (!activeProfiles.length) return res.status(400).json({ success: false, message: 'No active employees found' });

    // Get outstanding advances for each employee
    const advances = await Advance.find({
      storeId: req.storeId,
      employee: { $in: activeProfiles.map(p => p.user._id) },
      status: { $in: ['Outstanding','Partially Repaid'] },
    });
    const advanceMap = {};
    advances.forEach(a => {
      const eid = a.employee.toString();
      if (!advanceMap[eid]) advanceMap[eid] = 0;
      advanceMap[eid] += Math.min(a.monthlyDeduction || 0, a.remainingBalance || 0);
    });

    const created = [];
    const skipped = [];

    for (const profile of activeProfiles) {
      const userId = profile.user._id;

      // Check if record already exists
      const exists = await PayrollRecord.findOne({ storeId: req.storeId, employee: userId, month: Number(month), year: Number(year) });
      if (exists) { skipped.push(profile.user.name); continue; }

      // Calculate allowances
      const allowanceDetails = (profile.allowances || []).map(a => ({
        type:   a.type,
        amount: a.isFixed ? a.amount : Math.round(profile.basicSalary * a.percent / 100),
      }));
      const allowanceTotal = allowanceDetails.reduce((s, a) => s + a.amount, 0);
      const grossSalary    = profile.basicSalary + allowanceTotal;

      // Deductions
      const eobiDeduction    = profile.deductEOBI ? 570 : 0;
      const incomeTax        = profile.estimatedIncomeTax || 0;
      const advanceDeducted  = advanceMap[userId.toString()] || 0;
      const customDeds       = (profile.customDeductions || []).map(d => ({ type: d.type, amount: d.amount }));
      const customDedTotal   = customDeds.reduce((s, d) => s + d.amount, 0);
      const totalDeductions  = eobiDeduction + incomeTax + advanceDeducted + customDedTotal;
      const netSalary        = Math.max(0, grossSalary - totalDeductions);

      const record = await PayrollRecord.create({
        storeId:     req.storeId,
        employee:    userId,
        employeeProfile: profile._id,
        employeeName: profile.user.name,
        designation: profile.designation || profile.user.role,
        employeeCode:profile.employeeCode || '',
        month:       Number(month),
        year:        Number(year),
        workingDaysInMonth: Number(workingDaysInMonth),
        daysWorked:  Number(workingDaysInMonth),
        daysAbsent:  0,
        basicSalary: profile.basicSalary,
        allowances:  allowanceDetails,
        grossSalary,
        eobiDeduction,
        incomeTax,
        advanceDeducted,
        customDeductions: customDeds,
        totalDeductions,
        netSalary,
        processedBy:     req.user._id,
        processedByName: req.user.name,
      });

      created.push(record);
    }

    res.status(201).json({
      success: true,
      created: created.length,
      skipped: skipped.length,
      skippedNames: skipped,
      message: `Payroll generated for ${created.length} employees${skipped.length ? `. ${skipped.length} already existed.` : '.'}`,
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── UPDATE single payroll record (adjust absences, bonus, etc.) ── */
exports.updateRecord = async (req, res) => {
  try {
    const { daysAbsent, daysWorked, overtime, bonuses, bonusNote, notes, customDeductions } = req.body;

    const record = await PayrollRecord.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
    if (record.status === 'Paid') return res.status(400).json({ success: false, message: 'Cannot edit a paid record' });

    if (daysAbsent !== undefined) {
      record.daysAbsent = Number(daysAbsent);
      record.daysWorked = record.workingDaysInMonth - Number(daysAbsent);
      // Absence deduction = (basicSalary / workingDays) × daysAbsent
      const dailyRate = record.basicSalary / record.workingDaysInMonth;
      record.absenceDeduction = Math.round(dailyRate * Number(daysAbsent));
    }
    if (overtime !== undefined) {
      record.overtime = Number(overtime);
      const hourlyRate = record.basicSalary / (record.workingDaysInMonth * 8);
      record.overtimePay = Math.round(hourlyRate * 1.5 * Number(overtime));
    }
    if (bonuses !== undefined) {
      record.bonuses   = Number(bonuses);
      record.bonusNote = bonusNote || '';
    }
    if (customDeductions !== undefined) record.customDeductions = customDeductions;
    if (notes !== undefined) record.notes = notes;

    // Recalculate
    const allowanceTotal  = record.allowances.reduce((s, a) => s + a.amount, 0);
    record.grossSalary    = record.basicSalary + allowanceTotal + record.overtimePay + record.bonuses;
    const customDedTotal  = (record.customDeductions || []).reduce((s, d) => s + d.amount, 0);
    record.totalDeductions= record.eobiDeduction + record.incomeTax + record.advanceDeducted + record.absenceDeduction + customDedTotal;
    record.netSalary      = Math.max(0, record.grossSalary - record.totalDeductions);
    record.status         = 'Processed';

    await record.save();
    await record.populate('employee', 'name email phone');
    res.json({ success: true, record, message: 'Payroll record updated' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── MARK as paid ── */
exports.markPaid = async (req, res) => {
  try {
    const { paymentMethod, transactionRef } = req.body;
    const record = await PayrollRecord.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!record) return res.status(404).json({ success: false, message: 'Record not found' });

    record.status         = 'Paid';
    record.paidAt         = new Date();
    record.paymentMethod  = paymentMethod || 'Cash';
    record.transactionRef = transactionRef || '';
    await record.save();

    // Deduct advance repayments
    if (record.advanceDeducted > 0) {
      const advances = await Advance.find({
        storeId:  req.storeId,
        employee: record.employee,
        status:   { $in: ['Outstanding','Partially Repaid'] },
      });

      let remaining = record.advanceDeducted;
      for (const adv of advances) {
        if (remaining <= 0) break;
        const deduct = Math.min(remaining, adv.remainingBalance);
        adv.amountRepaid += deduct;
        adv.repaymentHistory.push({
          month:   record.month,
          year:    record.year,
          amount:  deduct,
          paidFrom:record._id,
          paidAt:  new Date(),
        });
        adv.status = adv.amountRepaid >= adv.amount ? 'Fully Repaid' : 'Partially Repaid';
        await adv.save();
        remaining -= deduct;
      }
    }

    await record.populate('employee', 'name email phone');
    res.json({ success: true, record, message: `Salary paid to ${record.employeeName}` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── MARK ALL as paid in a month ── */
exports.markAllPaid = async (req, res) => {
  try {
    const { month, year, paymentMethod } = req.body;
    const result = await PayrollRecord.updateMany(
      { storeId: req.storeId, month: Number(month), year: Number(year), status: { $ne: 'Paid' } },
      { $set: { status: 'Paid', paidAt: new Date(), paymentMethod: paymentMethod || 'Cash' } }
    );
    res.json({ success: true, count: result.modifiedCount, message: `${result.modifiedCount} salaries marked as paid` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── ANNUAL SUMMARY ── */
exports.getAnnualSummary = async (req, res) => {
  try {
    const { year, employeeId } = req.query;
    if (!year) return res.status(400).json({ success: false, message: 'Year required' });

    const query = { storeId: req.storeId, year: Number(year) };
    if (employeeId) query.employee = employeeId;

    const records = await PayrollRecord.find(query)
      .populate('employee', 'name email role')
      .sort({ month: 1 });

    // Group by employee
    const byEmployee = {};
    records.forEach(r => {
      const eid = r.employee._id.toString();
      if (!byEmployee[eid]) {
        byEmployee[eid] = {
          employee:     r.employee,
          employeeName: r.employeeName,
          designation:  r.designation,
          months:       [],
          totals: { gross:0, deductions:0, net:0, tax:0, eobi:0, advances:0, bonuses:0 },
        };
      }
      byEmployee[eid].months.push({ month: r.month, monthName: MONTHS[r.month-1], gross: r.grossSalary, net: r.netSalary, status: r.status });
      byEmployee[eid].totals.gross      += r.grossSalary;
      byEmployee[eid].totals.deductions += r.totalDeductions;
      byEmployee[eid].totals.net        += r.netSalary;
      byEmployee[eid].totals.tax        += r.incomeTax;
      byEmployee[eid].totals.eobi       += r.eobiDeduction;
      byEmployee[eid].totals.advances   += r.advanceDeducted;
      byEmployee[eid].totals.bonuses    += r.bonuses;
    });

    const grandTotals = Object.values(byEmployee).reduce((acc, e) => ({
      gross:      acc.gross      + e.totals.gross,
      deductions: acc.deductions + e.totals.deductions,
      net:        acc.net        + e.totals.net,
      tax:        acc.tax        + e.totals.tax,
      eobi:       acc.eobi       + e.totals.eobi,
    }), { gross:0, deductions:0, net:0, tax:0, eobi:0 });

    res.json({ success: true, year, employees: Object.values(byEmployee), grandTotals });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── Stats ── */
exports.getStats = async (req, res) => {
  try {
    const now   = new Date();
    const month = now.getMonth() + 1;
    const year  = now.getFullYear();

    const [employees, thisMonth, advances] = await Promise.all([
      EmployeeProfile.countDocuments({ storeId: req.storeId, isActive: true }),
      PayrollRecord.aggregate([
        { $match: { storeId: req.storeId, month, year } },
        { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$netSalary' } } },
      ]),
      Advance.find({ storeId: req.storeId, status: { $in: ['Outstanding','Partially Repaid'] } })
        .select('amount amountRepaid'),
    ]);

    const statusMap = Object.fromEntries(thisMonth.map(s => [s._id, s]));
    const totalAdvances = advances.reduce((s, a) => s + Math.max(0, a.amount - a.amountRepaid), 0);

    res.json({
      success: true,
      stats: {
        totalEmployees: employees,
        thisMonthPayroll: thisMonth.reduce((s, m) => s + m.total, 0),
        paidCount:     statusMap.Paid?.count     || 0,
        pendingCount:  (statusMap.Draft?.count || 0) + (statusMap.Processed?.count || 0),
        totalAdvancesOutstanding: totalAdvances,
      },
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ════════ ADVANCES ════════ */

exports.getAdvances = async (req, res) => {
  try {
    const { status, employeeId } = req.query;
    const query = { storeId: req.storeId };
    if (status)     query.status   = status;
    if (employeeId) query.employee = employeeId;

    const advances = await Advance.find(query)
      .populate('employee', 'name role')
      .sort({ createdAt: -1 });
    res.json({ success: true, advances });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.addAdvance = async (req, res) => {
  try {
    const { employeeId, amount, date, reason, monthlyDeduction, approvedBy, notes } = req.body;
    if (!employeeId || !amount || !reason)
      return res.status(400).json({ success: false, message: 'Employee, amount and reason required' });

    const user = await User.findOne({ _id: employeeId, storeId: req.storeId });
    if (!user) return res.status(404).json({ success: false, message: 'Employee not found' });

    const advance = await Advance.create({
      storeId:      req.storeId,
      employee:     employeeId,
      employeeName: user.name,
      amount:       Number(amount),
      date:         date ? new Date(date) : new Date(),
      reason,
      monthlyDeduction: Number(monthlyDeduction || 0),
      approvedBy:   approvedBy || req.user.name,
      notes:        notes || '',
      addedBy:      req.user._id,
    });

    res.status(201).json({ success: true, advance, message: `Advance of ₨${Number(amount).toLocaleString()} recorded for ${user.name}` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.updateAdvance = async (req, res) => {
  try {
    const advance = await Advance.findOneAndUpdate(
      { _id: req.params.id, storeId: req.storeId },
      req.body, { new: true }
    ).populate('employee', 'name role');
    if (!advance) return res.status(404).json({ success: false, message: 'Advance not found' });
    res.json({ success: true, advance, message: 'Advance updated' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.deleteAdvance = async (req, res) => {
  try {
    await Advance.findOneAndDelete({ _id: req.params.id, storeId: req.storeId });
    res.json({ success: true, message: 'Advance deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};