const { z } = require('zod');

const CATEGORIES = ['Antibiotic','Analgesic','Antiviral','Antifungal','Cardiovascular',
  'Diabetes','Respiratory','Gastrointestinal','Neurological','Vitamin & Supplement',
  'Dermatological','Other'];

const FORMS = ['Tablet','Capsule','Syrup','Injection','Cream','Drops','Inhaler','Patch','Other'];
const UNITS = ['Pcs','Strip','Box','Bottle','Vial','Tube'];

exports.createMedicineSchema = z.object({
  name:                z.string().trim().min(1,'Name is required').max(200,'Name too long'),
  genericName:         z.string().trim().max(200).optional(),
  category:            z.enum(CATEGORIES).default('Other'),
  manufacturer:        z.string().trim().max(200).optional(),
  batchNumber:         z.string().trim().max(100).optional(),
  dosageForm:          z.enum(FORMS).default('Tablet'),
  strength:            z.string().trim().max(100).optional(),
  unit:                z.enum(UNITS).default('Strip'),
  purchasePrice:       z.coerce.number().min(0,'Purchase price cannot be negative').max(1000000),
  salePrice:           z.coerce.number().min(0,'Sale price cannot be negative').max(1000000),
  stock:               z.coerce.number().int().min(0,'Stock cannot be negative').max(1000000),
  minStock:            z.coerce.number().int().min(0).max(100000).default(10),
  expiryDate:          z.string().min(1,'Expiry date is required'),
  manufacturingDate:   z.string().optional(),
  location:            z.string().trim().max(200).optional(),
  requiresPrescription:z.boolean().default(false),
  description:         z.string().trim().max(1000).optional(),
});

exports.updateMedicineSchema = exports.createMedicineSchema.partial();

exports.updateStockSchema = z.object({
  stock:     z.coerce.number().int().min(0,'Stock cannot be negative').max(1000000),
  operation: z.enum(['set','add','subtract']).default('set'),
});