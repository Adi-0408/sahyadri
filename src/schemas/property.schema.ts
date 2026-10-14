import * as z from 'zod';

const ownerDetailsSchema = z.object({
  ownerName: z.string().min(2, "Owner name is required"),
  mobileNumber: z.string().regex(/^[0-9]{10}$/, "Invalid mobile number (must be 10 digits)"),
  alternateMobile: z.string().regex(/^[0-9]{10}$/, "Invalid mobile number").optional().or(z.literal('')),
  email: z.string().email("Invalid email address").optional().or(z.literal(''))
});

const propertyLayoutSchema = z.object({
  areaType: z.string().optional(),
  plotArea: z.number().optional().or(z.literal(0)),
  plotAreaType: z.string().optional(),
  builtUpArea: z.number().min(1, "Built-up area is required"),
  constructionAreaType: z.string().optional(),
  carpetArea: z.number().optional().or(z.literal(0)),
  totalRooms: z.number().min(1, "Required"),
  bedrooms: z.number().min(0),
  bathrooms: z.number().min(0),
  hallCount: z.number().optional().or(z.literal(0)),
  kitchenCount: z.number().optional().or(z.literal(0)),
  balconies: z.number().min(0),
  totalFloors: z.number().min(1, "Required"),
  floorNumber: z.number().min(0, "Required"),
  floorDetails: z.array(z.any()).optional(),
  yearBuilt: z.number().min(1900).max(new Date().getFullYear()).optional()
});

const addressSchema = z.object({
  state: z.string().min(1, "State is required"),
  district: z.string().min(1, "District is required"),
  taluka: z.string().min(1, "Taluka is required"),
  cityVillage: z.string().min(1, "City/Village is required"),
  landmark: z.string().optional(),
  pincode: z.string().regex(/^[0-9]{6}$/, "Invalid PIN Code"),
  fullAddress: z.string().min(10, "Full address is required"),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

// SELL SCHEMA
export const sellPropertySchema = z.object({
  type: z.literal('sale'),
  ...ownerDetailsSchema.shape,

  propertyName: z.string().min(3, "Property name is required"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  expectedPrice: z.number().min(1000, "Price must be greater than 1000"),
  isNegotiable: z.boolean().optional(),

  ...propertyLayoutSchema.shape,

  facingDirection: z.string().optional(),
  gutNumber: z.string().optional(),
  furnishingStatus: z.enum(['Furnished', 'Semi-Furnished', 'Unfurnished']),
  carParking: z.boolean(),
  lift: z.boolean(),
  garden: z.boolean(),
  waterSupply: z.boolean(),
  powerBackup: z.boolean(),

  ...addressSchema.shape,

  // Plot details
  landType: z.string().optional(),
  occupancyClass: z.string().optional(),
  roadAvailable: z.boolean().optional(),
  roadTouch: z.boolean().optional(),
  gatedCommunity: z.boolean().optional(),
  cornerPlot: z.boolean().optional(),
  boundaryWall: z.boolean().optional(),
  roadType: z.string().optional(),
  isSharedRoad: z.boolean().optional(),
  hasLoan: z.boolean().optional(),
  loanBankName: z.string().optional(),
  loanAmount: z.number().optional().or(z.literal(0)).or(z.string().optional()),

  // Land details
  waterSourceAvailable: z.boolean().optional(),
  waterSourceType: z.string().optional(),
  electricityConnection: z.boolean().optional(),
  fencingAvailable: z.boolean().optional(),

  images: z.array(z.string()).optional().default([]),
  videoPath: z.string().optional().default(''),
  amenities: z.array(z.string()).optional()
});

// RENT SCHEMA
export const rentPropertySchema = z.object({
  type: z.literal('rent'),
  ...ownerDetailsSchema.shape,

  propertyName: z.string().min(3, "Property name is required"),
  description: z.string().min(20, "Description must be at least 20 characters").optional(),
  monthlyRent: z.number().min(500, "Rent must be greater than 500"),
  securityDeposit: z.number().min(0),
  maintenanceCharges: z.number().min(0).optional(),
  isNegotiable: z.boolean().optional(),

  ...propertyLayoutSchema.shape,

  facingDirection: z.string().optional(),
  gutNumber: z.string().optional(),
  furnishingStatus: z.enum(['Furnished', 'Semi-Furnished', 'Unfurnished']),
  carParking: z.boolean(),

  // Rental specific preferences
  bachelorsAllowed: z.boolean(),
  familyPreferred: z.boolean(),
  petsAllowed: z.boolean(),
  workingProfessionalsAllowed: z.boolean(),
  foodPreference: z.string().optional(),

  ...addressSchema.shape,

  // Plot details
  landType: z.string().optional(),
  occupancyClass: z.string().optional(),
  roadAvailable: z.boolean().optional(),
  roadTouch: z.boolean().optional(),
  gatedCommunity: z.boolean().optional(),
  cornerPlot: z.boolean().optional(),
  boundaryWall: z.boolean().optional(),
  roadType: z.string().optional(),
  isSharedRoad: z.boolean().optional(),
  hasLoan: z.boolean().optional(),
  loanBankName: z.string().optional(),
  loanAmount: z.number().optional().or(z.literal(0)).or(z.string().optional()),

  // Land details
  waterSourceAvailable: z.boolean().optional(),
  waterSourceType: z.string().optional(),
  electricityConnection: z.boolean().optional(),
  fencingAvailable: z.boolean().optional(),

  images: z.array(z.string()).optional().default([]),
  videoPath: z.string().optional().default(''),
  amenities: z.array(z.string()).optional()
});

export type SellPropertyValues = z.infer<typeof sellPropertySchema>;
export type RentPropertyValues = z.infer<typeof rentPropertySchema>;
