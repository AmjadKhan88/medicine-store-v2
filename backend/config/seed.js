require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Medicine = require('../models/Medicine');
const Patient = require('../models/Patient');

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/medistore');
  console.log('Connected to MongoDB...');
  await Promise.all([User.deleteMany(), Medicine.deleteMany(), Patient.deleteMany()]);
  console.log('Cleared existing data...');

  await User.create({ name: 'Dr. Sarah Ahmed', email: 'doctor@medistore.com', password: 'doctor123', role: 'doctor', phone: '0301-2345678' });

  await Medicine.insertMany([
    { name: 'Panadol Extra', genericName: 'Paracetamol', category: 'Analgesic', manufacturer: 'GSK', batchNumber: 'B001', dosageForm: 'Tablet', strength: '500mg', unit: 'Strip', purchasePrice: 15, salePrice: 25, stock: 500, minStock: 50, expiryDate: new Date('2026-12-01'), addedBy: admin._id },
    { name: 'Augmentin 625mg', genericName: 'Amoxicillin+Clavulanic', category: 'Antibiotic', manufacturer: 'GSK', batchNumber: 'B002', dosageForm: 'Tablet', strength: '625mg', unit: 'Strip', purchasePrice: 120, salePrice: 180, stock: 200, minStock: 20, expiryDate: new Date('2025-06-15'), addedBy: admin._id },
    { name: 'Metformin 500mg', genericName: 'Metformin HCl', category: 'Diabetes', manufacturer: 'Getz Pharma', batchNumber: 'B003', dosageForm: 'Tablet', strength: '500mg', unit: 'Strip', purchasePrice: 30, salePrice: 50, stock: 300, minStock: 30, expiryDate: new Date('2026-03-20'), addedBy: admin._id },
    { name: 'Brufen 400mg', genericName: 'Ibuprofen', category: 'Analgesic', manufacturer: 'Abbott', batchNumber: 'B004', dosageForm: 'Tablet', strength: '400mg', unit: 'Strip', purchasePrice: 18, salePrice: 30, stock: 8, minStock: 20, expiryDate: new Date('2026-08-10'), addedBy: admin._id },
    { name: 'Amoxil 250mg Syrup', genericName: 'Amoxicillin', category: 'Antibiotic', manufacturer: 'GSK', batchNumber: 'B005', dosageForm: 'Syrup', strength: '250mg/5ml', unit: 'Bottle', purchasePrice: 80, salePrice: 120, stock: 150, minStock: 15, expiryDate: new Date('2025-02-28'), addedBy: admin._id },
    { name: 'Lipitor 40mg', genericName: 'Atorvastatin', category: 'Cardiovascular', manufacturer: 'Pfizer', batchNumber: 'B006', dosageForm: 'Tablet', strength: '40mg', unit: 'Strip', purchasePrice: 200, salePrice: 320, stock: 100, minStock: 10, expiryDate: new Date('2027-01-15'), addedBy: admin._id },
    { name: 'Ventolin Inhaler', genericName: 'Salbutamol', category: 'Respiratory', manufacturer: 'GSK', batchNumber: 'B007', dosageForm: 'Inhaler', strength: '100mcg', unit: 'Pcs', purchasePrice: 250, salePrice: 380, stock: 60, minStock: 10, expiryDate: new Date('2026-05-30'), addedBy: admin._id },
    { name: 'Nexium 40mg', genericName: 'Esomeprazole', category: 'Gastrointestinal', manufacturer: 'AstraZeneca', batchNumber: 'B008', dosageForm: 'Capsule', strength: '40mg', unit: 'Strip', purchasePrice: 90, salePrice: 140, stock: 5, minStock: 15, expiryDate: new Date('2026-09-12'), addedBy: admin._id },
    { name: 'Vitamin C 500mg', genericName: 'Ascorbic Acid', category: 'Vitamin & Supplement', manufacturer: 'Roche', batchNumber: 'B009', dosageForm: 'Tablet', strength: '500mg', unit: 'Box', purchasePrice: 150, salePrice: 220, stock: 200, minStock: 20, expiryDate: new Date('2027-06-01'), addedBy: admin._id },
    { name: 'Insulin Glargine', genericName: 'Insulin Glargine', category: 'Diabetes', manufacturer: 'Sanofi', batchNumber: 'B010', dosageForm: 'Injection', strength: '100 IU/ml', unit: 'Vial', purchasePrice: 800, salePrice: 1200, stock: 30, minStock: 5, expiryDate: new Date('2025-11-30'), requiresPrescription: true, addedBy: admin._id },
  ]);

  await Patient.insertMany([
    { name: 'Muhammad Ali', age: 45, gender: 'Male', phone: '0311-1234567', bloodGroup: 'B+', city: 'Peshawar', doctor: 'Dr. Admin Khan', totalBilled: 2500, totalPaid: 2000, addedBy: admin._id },
    { name: 'Fatima Bibi', age: 32, gender: 'Female', phone: '0312-2345678', bloodGroup: 'A+', city: 'Peshawar', doctor: 'Dr. Sarah Ahmed', totalBilled: 1800, totalPaid: 1800, addedBy: admin._id },
    { name: 'Ahmed Khan', age: 60, gender: 'Male', phone: '0313-3456789', bloodGroup: 'O+', city: 'Nowshera', doctor: 'Dr. Admin Khan', totalBilled: 5000, totalPaid: 3000, addedBy: admin._id },
    { name: 'Zainab Noor', age: 28, gender: 'Female', phone: '0314-4567890', bloodGroup: 'AB+', city: 'Mardan', doctor: 'Dr. Sarah Ahmed', totalBilled: 900, totalPaid: 900, addedBy: admin._id },
    { name: 'Tariq Mehmood', age: 55, gender: 'Male', phone: '0315-5678901', bloodGroup: 'B-', city: 'Peshawar', doctor: 'Dr. Admin Khan', totalBilled: 3200, totalPaid: 1500, addedBy: admin._id },
  ]);

  console.log('Seed data inserted! Admin: admin@medistore.com / admin123');
  mongoose.disconnect();
};

seed().catch(console.error);
