import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Package,
  Truck,
  ShieldCheck,
  CheckCircle2,
  Phone,
  MessageCircle,
  MapPin,
  Search,
  ShoppingBag,
  Plus,
  Minus,
  Sparkles,
  Layers,
  Hammer,
  Zap,
  Paintbrush,
  Droplets,
  Building2,
  Boxes,
  X,
  BadgeIndianRupee,
  Store,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../../app/providers/AuthProvider';
import {
  subscribeToCollection,
  fetchCollection,
  createDocument,
  getCachedCollection
} from '../../services/firebase';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Dialog } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';

const CATEGORIES = [
  { id: 'All', labelMr: 'सर्व साहित्य', labelEn: 'All Supplies', icon: Boxes },
  { id: 'Cement & Steel', labelMr: 'सिमेंट व स्टील', labelEn: 'Cement & Steel', icon: Building2 },
  { id: 'Sand & Aggregate', labelMr: 'वाळू व खडी', labelEn: 'Sand & Aggregate', icon: Layers },
  { id: 'Bricks & Blocks', labelMr: 'विटा व ब्लॉक्स', labelEn: 'Bricks & Blocks', icon: Boxes },
  { id: 'Tiles & Flooring', labelMr: 'टाईल्स व फरशी', labelEn: 'Tiles & Flooring', icon: Sparkles },
  { id: 'Plumbing & Sanitary', labelMr: 'प्लंबिंग व सॅनिटरी', labelEn: 'Plumbing & Sanitary', icon: Droplets },
  { id: 'Electrical & Lighting', labelMr: 'इलेक्ट्रिकल', labelEn: 'Electrical & Lighting', icon: Zap },
  { id: 'Paints & Waterproofing', labelMr: 'पेंट व वॉटरप्रूफिंग', labelEn: 'Paints & Waterproofing', icon: Paintbrush },
  { id: 'Hardware & Tools', labelMr: 'हार्डवेअर व टूल्स', labelEn: 'Hardware & Tools', icon: Hammer }
];

const DISTRICTS_FALLBACK = [
  { value: 'All', label: 'सर्व जिल्हे (All Districts)' },
  { value: 'Sangli', label: 'सांगली (Sangli)' },
  { value: 'Kolhapur', label: 'कोल्हापूर (Kolhapur)' },
  { value: 'Satara', label: 'सातारा (Satara)' },
  { value: 'Pune', label: 'पुणे (Pune)' },
  { value: 'Solapur', label: 'सोलापूर (Solapur)' }
];

const TALUKAS_MAP: Record<string, string[]> = {
  Sangli: ['Miraj', 'Walwa', 'Tasgaon', 'Shirala', 'Khanapur', 'Atpadi', 'Kavathe Mahankal', 'Jat', 'Palus', 'Kadegaon'],
  Kolhapur: ['Karvir', 'Hatkanangale', 'Shirol', 'Panhala', 'Shahuwadi', 'Radhanagari', 'Gaganbawda', 'Kagal', 'Gadhinglaj', 'Ajara', 'Chandgad', 'Bhudargad'],
  Satara: ['Satara', 'Karad', 'Wai', 'Mahabaleshwar', 'Phaltan', 'Koregaon', 'Khandala', 'Patan', 'Jaoli', 'Khatav', 'Man'],
  Pune: ['Haveli', 'Pune City', 'Khed', 'Baramati', 'Shirur', 'Daund', 'Maval', 'Mulshi', 'Bhor', 'Purandar', 'Ambegaon', 'Junnar', 'Velhe', 'Indapur'],
  Solapur: ['Solapur North', 'Solapur South', 'Barshi', 'Pandharpur', 'Sangole', 'Malshiras', 'Karmala', 'Madha', 'Mohol', 'Mangalwedha', 'Akkalkot']
};

export const Materials: React.FC = () => {
  const { i18n } = useTranslation();
  const isMr = Boolean(i18n.language?.startsWith('mr'));
  const { user } = useAuth();

  // Search and Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedDistrict, setSelectedDistrict] = useState('All');
  const [selectedTaluka, setSelectedTaluka] = useState('All');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc'>('default');

  // Real-time collections from database (only supplier-added items)
  const [dbProducts, setDbProducts] = useState<any[]>(() => {
    const cached = getCachedCollection('supplier_products');
    return Array.isArray(cached) ? cached : [];
  });
  const [suppliersMap, setSuppliersMap] = useState<Record<string, any>>({});
  const [districtsList, setDistrictsList] = useState<any[]>(DISTRICTS_FALLBACK);
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [orderQuantity, setOrderQuantity] = useState<number>(1);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState<string>('');
  const [placedOrderData, setPlacedOrderData] = useState<any>(null);

  // Buyer Form fields inside COD modal
  const [buyerName, setBuyerName] = useState(user?.displayName || '');
  const [buyerMobile, setBuyerMobile] = useState(
    user?.mobile || (user?.email && /^\d{10}@/.test(user.email) ? user.email.split('@')[0] : '') || ''
  );
  const [buyerEmail, setBuyerEmail] = useState(user?.email || '');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [orderDistrict, setOrderDistrict] = useState(selectedDistrict !== 'All' ? selectedDistrict : 'Sangli');
  const [orderTaluka, setOrderTaluka] = useState('');
  const [landmark, setLandmark] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [formError, setFormError] = useState('');

  // Buyer order history drawer / modal
  const [myOrdersModalOpen, setMyOrdersModalOpen] = useState(false);
  const [myOrders, setMyOrders] = useState<any[]>(() => {
    try {
      const stored = localStorage.getItem('sahyadri_my_material_orders');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Guest supplier onboarding prompt modal
  const [guestSupplierModalOpen, setGuestSupplierModalOpen] = useState(false);

  // Supplier & guest role detection: "Add Material" is available only to suppliers & guest accounts
  const isSupplier = Boolean(
    user && (
      user.role === 'supplier' ||
      user.role === 'admin' ||
      (typeof window !== 'undefined' && localStorage.getItem(`sahyadri_role_approved_${user.uid}`) === 'supplier')
    )
  );
  const isGuest = !user;
  const canAddMaterial = isSupplier || isGuest;

  // Sync user details when auth loads
  useEffect(() => {
    if (user) {
      if (!buyerName && user.displayName) setBuyerName(user.displayName);
      const cleanMob = (
        user.mobile ||
        (user.email && /^\d{10}@/.test(user.email) ? user.email.split('@')[0] : '') ||
        ''
      ).replace(/[^0-9]/g, '').slice(-10);
      if (!buyerMobile && cleanMob) setBuyerMobile(cleanMob);
      if (!buyerEmail && user.email) setBuyerEmail(user.email);
    }
  }, [user]);

  // Load districts
  useEffect(() => {
    fetchCollection('districts')
      .then((list) => {
        if (list && list.length > 0) {
          const formatted = [
            { value: 'All', label: isMr ? 'सर्व जिल्हे (All Districts)' : 'All Districts' },
            ...list.map((d: any) => ({
              value: d.nameEn || d.name || d.id,
              label: isMr && d.nameMr ? `${d.nameMr} (${d.nameEn || d.id})` : d.nameEn || d.name || d.id
            }))
          ];
          setDistrictsList(formatted);
        }
      })
      .catch(() => {});
  }, [isMr]);

  // Subscribe to live supplier products & suppliers
  useEffect(() => {
    setIsLoading(true);

    const unsubProducts = subscribeToCollection('supplier_products', (items) => {
      if (Array.isArray(items)) {
        setDbProducts(items);
      }
      setIsLoading(false);
    });

    const unsubSuppliers = subscribeToCollection('suppliers', (suppliers) => {
      if (Array.isArray(suppliers)) {
        const map: Record<string, any> = {};
        suppliers.forEach((s: any) => {
          if (s.userId) map[s.userId] = s;
          if (s.id) map[s.id] = s;
          if (s.uid) map[s.uid] = s;
          const sMob = (s.mobile || '').replace(/[^0-9]/g, '').slice(-10);
          if (sMob) map[sMob] = s;
        });
        setSuppliersMap(map);
      }
    });

    return () => {
      unsubProducts();
      unsubSuppliers();
    };
  }, []);

  // ONLY show items added by suppliers (NO HARD-CODED DATA)
  const allProducts = useMemo(() => {
    return dbProducts.map((p) => {
      const pMob = (p.supplierMobile || '').replace(/[^0-9]/g, '').slice(-10);
      const sup =
        suppliersMap[p.supplierId] ||
        suppliersMap[p.userId] ||
        (pMob ? suppliersMap[pMob] : null) ||
        null;

      const resolvedSupplierName =
        p.supplierName ||
        sup?.businessName ||
        sup?.name ||
        (isMr ? 'अधिकृत पुरवठादार' : 'Verified Supplier');

      const resolvedMobile = p.supplierMobile || sup?.mobile || '';
      const resolvedDistrict = p.district || sup?.operatingDistrict || sup?.district || '';
      const resolvedTaluka = p.taluka || sup?.operatingTaluka || sup?.taluka || '';
      const resolvedAddress = p.address || sup?.officeAddress || sup?.address || '';
      const resolvedDelivery = p.deliveryAvailable ?? sup?.deliveryAvailable ?? true;

      return {
        id: p.id,
        name: p.name,
        category: p.category || 'All Materials',
        price: Number(p.price) || 0,
        unit: p.unit || 'Per Unit',
        inStock: p.inStock !== false,
        supplierId: p.supplierId || p.userId || 'supplier',
        supplierName: resolvedSupplierName,
        supplierMobile: resolvedMobile,
        district: resolvedDistrict,
        taluka: resolvedTaluka,
        address: resolvedAddress,
        deliveryAvailable: resolvedDelivery,
        description: p.description || '',
        createdAt: p.createdAt
      };
    });
  }, [dbProducts, suppliersMap, isMr]);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    let result = [...allProducts];

    // Filter Category
    if (selectedCategory !== 'All') {
      result = result.filter(
        (p) => (p.category || '').toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    // Filter District
    if (selectedDistrict !== 'All') {
      result = result.filter(
        (p) => (p.district || '').toLowerCase() === selectedDistrict.toLowerCase()
      );
    }

    // Filter Taluka
    if (selectedTaluka !== 'All') {
      result = result.filter(
        (p) => (p.taluka || '').toLowerCase() === selectedTaluka.toLowerCase()
      );
    }

    // Filter In-Stock
    if (inStockOnly) {
      result = result.filter((p) => p.inStock === true);
    }

    // Filter Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          (p.name || '').toLowerCase().includes(q) ||
          (p.category || '').toLowerCase().includes(q) ||
          (p.supplierName || '').toLowerCase().includes(q) ||
          (p.district || '').toLowerCase().includes(q) ||
          (p.taluka || '').toLowerCase().includes(q) ||
          (p.description || '').toLowerCase().includes(q)
      );
    }

    // Sort by supplier price
    if (sortBy === 'price-asc') {
      result.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
    } else if (sortBy === 'price-desc') {
      result.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
    }

    return result;
  }, [allProducts, selectedCategory, selectedDistrict, selectedTaluka, inStockOnly, searchQuery, sortBy]);

  // Available talukas for selected district
  const availableTalukas = useMemo(() => {
    const list = TALUKAS_MAP[selectedDistrict] || [];
    return [
      { value: 'All', label: isMr ? 'सर्व तालुके (All Talukas)' : 'All Talukas' },
      ...list.map((t) => ({ value: t, label: t }))
    ];
  }, [selectedDistrict, isMr]);

  const modalTalukas = useMemo(() => {
    const list = TALUKAS_MAP[orderDistrict] || TALUKAS_MAP['Sangli'] || [];
    return list.map((t) => ({ value: t, label: t }));
  }, [orderDistrict]);

  // Open Order Modal for a specific product
  const handleOpenOrder = (product: any) => {
    setSelectedProduct(product);
    setOrderQuantity(1);
    setFormError('');
    setOrderConfirmed(false);
    setPlacedOrderId('');
    setPlacedOrderData(null);
    if (product.district) setOrderDistrict(product.district);
    if (product.taluka) setOrderTaluka(product.taluka);
    setOrderModalOpen(true);
  };

  // Stepper quantity handlers
  const handleIncrement = () => setOrderQuantity((prev) => prev + 1);
  const handleDecrement = () => setOrderQuantity((prev) => (prev > 1 ? prev - 1 : 1));

  // Total Amount Calculation based on supplier-set price
  const orderTotalAmount = useMemo(() => {
    if (!selectedProduct) return 0;
    return (Number(selectedProduct.price) || 0) * (Number(orderQuantity) || 1);
  }, [selectedProduct, orderQuantity]);

  // Submit Order (Payment on Delivery)
  const handleConfirmOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!selectedProduct) return;

    if (!buyerName.trim()) {
      setFormError(isMr ? 'कृपया आपले नाव टाका.' : 'Please enter your full name.');
      return;
    }

    const cleanMob = buyerMobile.replace(/[^0-9]/g, '');
    if (cleanMob.length !== 10) {
      setFormError(isMr ? 'कृपया वैध १० अंकी मोबाईल नंबर टाका.' : 'Please enter a valid 10-digit mobile number.');
      return;
    }

    if (!deliveryAddress.trim() || deliveryAddress.trim().length < 5) {
      setFormError(isMr ? 'कृपया संपूर्ण डिलिव्हरी पत्ता टाका (प्लॉट/घर क्र., गाव/शहर).' : 'Please enter complete site delivery address.');
      return;
    }

    setIsSubmittingOrder(true);

    try {
      const generatedOrderId = `SYD-COD-${Math.floor(100000 + Math.random() * 900000)}`;
      const orderPayload = {
        orderId: generatedOrderId,
        supplierId: selectedProduct.supplierId || 'supplier',
        supplierName: selectedProduct.supplierName || 'अधिकृत पुरवठादार',
        supplierMobile: selectedProduct.supplierMobile || '',
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        materialCategory: selectedProduct.category,
        price: Number(selectedProduct.price) || 0,
        unit: selectedProduct.unit || 'Per Unit',
        quantity: Number(orderQuantity),
        totalAmount: Number(orderTotalAmount),
        paymentMode: 'Cash on Delivery (COD) / डिलिव्हरीवर रोख',
        paymentStatus: 'Pay on Delivery (Unpaid)',
        orderType: 'payment_on_delivery',
        buyerUid: user?.uid || null,
        clientName: buyerName.trim(),
        name: buyerName.trim(),
        clientMobile: cleanMob,
        mobile: cleanMob,
        clientEmail: buyerEmail.trim(),
        email: buyerEmail.trim(),
        deliveryAddress: deliveryAddress.trim(),
        taluka: orderTaluka || selectedProduct.taluka || '',
        district: orderDistrict || selectedProduct.district || 'Sangli',
        landmark: landmark.trim(),
        notes: orderNotes.trim(),
        quantityNotes: `${orderQuantity} ${selectedProduct.unit} | एकूण: ₹${orderTotalAmount.toLocaleString('en-IN')} (पे ऑन डिलिव्हरी) | पत्ता: ${deliveryAddress.trim()}, ${orderTaluka || ''}, ${orderDistrict || ''}${landmark.trim() ? ` (लँडमार्क: ${landmark.trim()})` : ''}${orderNotes.trim() ? ` | टीप: ${orderNotes.trim()}` : ''}`,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      // Write to supplier_inquiries so this specific supplier sees the order in their dashboard
      await createDocument('supplier_inquiries', orderPayload);

      // Save in buyer local order history
      const currentOrders = [...myOrders];
      const updatedOrders = [orderPayload, ...currentOrders];
      setMyOrders(updatedOrders);
      try {
        localStorage.setItem('sahyadri_my_material_orders', JSON.stringify(updatedOrders));
      } catch {}

      setPlacedOrderId(generatedOrderId);
      setPlacedOrderData(orderPayload);
      setOrderConfirmed(true);
    } catch (err) {
      console.error('Order creation error:', err);
      setFormError(isMr ? 'ऑर्डर नोंदवताना त्रुटी आली. कृपया पुन्हा प्रयत्न करा.' : 'Failed to place order. Please try again.');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // WhatsApp Order Link generator
  const getWhatsAppLink = (order: any) => {
    if (!order) return '#';
    const targetMobile = (order.supplierMobile || '').replace(/[^0-9]/g, '');
    const cleanPhone = targetMobile.length === 10 ? `91${targetMobile}` : targetMobile;

    const message =
      `*नवीन बांधकाम साहित्य ऑर्डर (पे ऑन डिलिव्हरी / Cash on Delivery)*\n` +
      `ऑर्डर क्र: #${order.orderId || 'SYD-COD'}\n` +
      `विक्रेता पुरवठादार: ${order.supplierName}\n` +
      `--------------------------------\n` +
      `📦 साहित्य: ${order.productName}\n` +
      `🔢 प्रमाण: ${order.quantity} ${order.unit}\n` +
      `💵 एकूण रक्कम: ₹${Number(order.totalAmount || 0).toLocaleString('en-IN')} (डिलिव्हरीवर देय)\n` +
      `--------------------------------\n` +
      `👤 ग्राहक: ${order.clientName}\n` +
      `📞 फोन: ${order.clientMobile}\n` +
      `📍 डिलिव्हरी पत्ता: ${order.deliveryAddress}, ${order.taluka || ''}, ${order.district || ''}\n` +
      (order.landmark ? `🏛️ लँडमार्क: ${order.landmark}\n` : '') +
      (order.notes ? `📝 विशेष सूचना: ${order.notes}\n` : '') +
      `\nकृपया ऑर्डर कन्फर्म करून डिलिव्हरीची वेळ सांगावी. धन्यवाद! (सह्याद्री लँड डेव्हलपर)`;

    return cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}` : '#';
  };


  return (
    <div className="min-h-screen bg-slate-50/70 pt-20 sm:pt-24 pb-24 text-left">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">

        {/* ── TOP HERO BANNER ── */}
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-amber-950 to-orange-950 rounded-3xl p-6 sm:p-10 text-white shadow-xl border border-amber-900/40">
          <div className="absolute right-0 top-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute left-1/3 bottom-0 w-80 h-80 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500/20 to-amber-500/20 text-orange-200 border border-orange-400/30 text-xs font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full backdrop-blur-sm">
                <Truck className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
                <span>{isMr ? 'अधिकृत पुरवठादारांचे थेट साहित्य • पे ऑन डिलिव्हरी उपलब्ध' : 'Verified Suppliers • Pay on Delivery'}</span>
              </div>

              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-serif font-black tracking-tight leading-tight">
                {isMr ? 'बांधकाम साहित्य बाजारपेठ' : 'Building Materials & Supplies'}
              </h1>

              <p className="text-orange-200/90 text-sm sm:text-base leading-relaxed">
                {isMr
                  ? 'विविध नोंदणीकृत पुरवठादारांनी (Suppliers) थेट जोडलेले सिमेंट, स्टील, वाळू, विटा, टाईल्स व हार्डवेअर पहा. पुरवठादाराने ठरवलेल्या थेट घाऊक दरात ऑर्डर करा आणि पैसे डिलिव्हरीच्या वेळी द्या!'
                  : 'Browse construction supplies directly listed and priced by verified suppliers. Order with zero advance payment and pay upon delivery!'}
              </p>

              {/* Trust Badges */}
              <div className="pt-2 flex flex-wrap items-center gap-3 text-xs font-semibold text-amber-100">
                <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-xl backdrop-blur-xs border border-white/10">
                  <BadgeIndianRupee className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{isMr ? 'पे ऑन डिलिव्हरी (COD)' : 'Pay on Delivery'}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-xl backdrop-blur-xs border border-white/10">
                  <Store className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isMr ? 'पुरवठादारांचे थेट दर' : 'Direct Supplier Rates'}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-xl backdrop-blur-xs border border-white/10">
                  <Truck className="w-3.5 h-3.5 text-orange-400" />
                  <span>{isMr ? 'थेट साइटवर अनलोडिंग' : 'Site Unloading'}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions in Banner */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 w-full sm:w-auto shrink-0">
              <Button
                onClick={() => setMyOrdersModalOpen(true)}
                className="bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-2xl py-3 px-5 text-sm font-bold flex items-center justify-center gap-2 backdrop-blur-md transition-all cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4 text-orange-400" />
                <span>{isMr ? 'माझे ऑर्डर्स' : 'My Orders'}</span>
                {myOrders.length > 0 && (
                  <span className="bg-orange-500 text-white text-[11px] font-extrabold px-2 py-0.5 rounded-full">
                    {myOrders.length}
                  </span>
                )}
              </Button>

              {/* Add Material option: Available only to suppliers and guest accounts */}
              {isSupplier && (
                <Link to="/supplier/dashboard">
                  <Button className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white rounded-2xl py-3 px-5 text-sm font-bold shadow-lg shadow-orange-950/40 flex items-center justify-center gap-2 transition-transform hover:scale-102 cursor-pointer">
                    <Plus className="w-4 h-4" />
                    <span>{isMr ? 'सप्लायर: साहित्य जोडा' : 'Supplier: Add Supplies'}</span>
                  </Button>
                </Link>
              )}

              {isGuest && (
                <div>
                  <Button
                    onClick={() => setGuestSupplierModalOpen(true)}
                    className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white rounded-2xl py-3 px-5 text-sm font-bold shadow-lg shadow-orange-950/40 flex items-center justify-center gap-2 transition-transform hover:scale-102 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{isMr ? 'सप्लायर: साहित्य जोडा' : 'Supplier: Add Supplies'}</span>
                  </Button>
                  <button
                    type="button"
                    onClick={() => setGuestSupplierModalOpen(true)}
                    className="text-[11px] text-orange-300/80 hover:text-orange-200 underline block text-center mt-1 cursor-pointer bg-transparent border-0 p-0 w-full"
                  >
                    {isMr ? 'आपण पुरवठादार आहात का? येथे अर्ज करा →' : 'Apply to become a supplier →'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── SEARCH & FILTER CONTROLS ── */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-5">
          {/* Top Search Bar & District / Taluka Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5">
            {/* Search Input */}
            <div className="lg:col-span-5 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isMr ? 'साहित्य, सप्लायरचे नाव किंवा ठिकाण शोधा...' : 'Search material, supplier name, city...'}
                className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* District Select */}
            <div className="lg:col-span-3">
              <Select
                value={selectedDistrict}
                onChange={(e) => {
                  setSelectedDistrict(e.target.value);
                  setSelectedTaluka('All');
                }}
                options={districtsList}
                className="py-2.5 text-xs font-semibold rounded-2xl bg-slate-50 border-slate-200"
              />
            </div>

            {/* Taluka Select */}
            <div className="lg:col-span-2">
              <Select
                value={selectedTaluka}
                onChange={(e) => setSelectedTaluka(e.target.value)}
                options={availableTalukas}
                className="py-2.5 text-xs font-semibold rounded-2xl bg-slate-50 border-slate-200"
              />
            </div>

            {/* Sort Dropdown */}
            <div className="lg:col-span-2">
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                options={[
                  { value: 'default', label: isMr ? 'सर्वोत्कृष्ट' : 'Default' },
                  { value: 'price-asc', label: isMr ? 'किंमत: कमी ते जास्त' : 'Price: Low to High' },
                  { value: 'price-desc', label: isMr ? 'किंमत: जास्त ते कमी' : 'Price: High to Low' }
                ]}
                className="py-2.5 text-xs font-semibold rounded-2xl bg-slate-50 border-slate-200"
              />
            </div>
          </div>

          {/* Category Chips (Horizontal Scrollable) */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 text-xs">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isActive = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-md shadow-orange-500/20'
                        : 'bg-slate-100/80 text-slate-700 hover:bg-slate-200 hover:text-slate-900 border border-slate-200/60'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{isMr ? cat.labelMr : cat.labelEn}</span>
                  </button>
                );
              })}
            </div>

            {/* In-Stock Filter Toggle */}
            <label className="hidden md:flex items-center gap-2 text-xs font-bold text-slate-700 shrink-0 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-slate-300 cursor-pointer"
              />
              <span>{isMr ? 'केवळ स्टॉकमधील' : 'In Stock Only'}</span>
            </label>
          </div>
        </div>

        {/* ── PRODUCT CATALOG GRID (SUPPLIER-ADDED ITEMS ONLY) ── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold font-serif text-slate-900 flex items-center gap-2">
              <span>{isMr ? 'पुरवठादारांचे थेट साहित्य' : 'Supplies Listed by Vendors'}</span>
              <span className="text-xs font-extrabold text-orange-700 bg-orange-100 px-2.5 py-0.5 rounded-full">
                {filteredProducts.length}
              </span>
            </h2>

            <div className="text-xs text-slate-500">
              {isMr ? 'सर्व पुरवठादारांच्या ऑर्डर्सवर पे ऑन डिलिव्हरी उपलब्ध' : 'Pay on Delivery on all supplier items'}
            </div>
          </div>

          {isLoading ? (
            <div className="py-16 text-center">
              <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-xs font-bold text-slate-500">
                {isMr ? 'साहित्य लोड होत आहे...' : 'Loading supplier materials...'}
              </p>
            </div>
          ) : filteredProducts.length === 0 ? (
            /* Clean Empty State when no supplier items exist */
            <Card className="p-12 sm:p-16 text-center bg-white rounded-3xl border border-slate-200 shadow-sm">
              <div className="w-20 h-20 rounded-3xl bg-orange-50 text-orange-600 border border-orange-100 flex items-center justify-center mx-auto mb-5 shadow-xs">
                <Store className="w-10 h-10" />
              </div>

              <h3 className="text-lg sm:text-xl font-bold font-serif text-slate-900 mb-2">
                {isMr
                  ? 'अद्याप कोणत्याही सप्लायरने साहित्य जोडलेले नाही'
                  : 'No Materials Listed by Suppliers Yet'}
              </h3>

              <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto mb-6 leading-relaxed">
                {isMr
                  ? 'विविध बांधकाम साहित्य पुरवठादार (Suppliers) त्यांच्या डॅशबोर्डवरून सिमेंट, स्टील, वाळू, विटा, टाईल्स व इतर साहित्याची यादी आणि स्वतःचे दर थेट जोडू शकतात. ग्राहक थेट पुरवठादाराशी संपर्क साधून पे ऑन डिलिव्हरीवर साहित्य मागवू शकतात.'
                  : 'Verified local building material suppliers can list their products, available inventory, and set wholesale prices from their Supplier Dashboard. Buyers can order directly with Payment on Delivery.'}
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3">
                {isSupplier && (
                  <Link to="/supplier/dashboard">
                    <Button className="bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-2xl text-xs py-3 px-5 shadow-md flex items-center gap-2 cursor-pointer">
                      <Plus className="w-4 h-4" />
                      <span>{isMr ? 'सप्लायर डॅशबोर्ड: पहिले साहित्य जोडा' : 'Add First Supply Item (Supplier)'}</span>
                    </Button>
                  </Link>
                )}

                {isGuest && (
                  <Button
                    onClick={() => setGuestSupplierModalOpen(true)}
                    className="bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-2xl text-xs py-3 px-5 shadow-md flex items-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{isMr ? 'सप्लायर म्हणून साहित्य जोडा' : 'Add Supplies (Become Supplier)'}</span>
                  </Button>
                )}

                {!canAddMaterial && (
                  <Link to="/properties">
                    <Button variant="outline" className="border-slate-300 hover:bg-slate-50 text-slate-800 font-bold rounded-2xl text-xs py-3 px-5 flex items-center gap-2 cursor-pointer">
                      <span>{isMr ? 'इतर मालमत्ता व प्रकल्प पहा' : 'Browse Properties & Projects'}</span>
                    </Button>
                  </Link>
                )}
              </div>
            </Card>
          ) : (
            /* Grid of Real Supplier Products */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredProducts.map((item) => (
                <Card
                  key={item.id}
                  className="p-5 bg-white border border-slate-200/90 rounded-3xl shadow-xs hover:shadow-md transition-all flex flex-col justify-between group hover:border-orange-200"
                >
                  <div>
                    {/* Top Badges */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-800 border border-orange-200/80">
                        {item.category}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            item.inStock
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}
                        >
                          {item.inStock
                            ? isMr
                              ? 'स्टॉकमध्ये उपलब्ध'
                              : 'In Stock'
                            : isMr
                            ? 'स्टॉक संपला'
                            : 'Out of Stock'}
                        </span>
                      </div>
                    </div>

                    {/* Product Name */}
                    <h3 className="font-bold text-slate-900 text-base leading-snug group-hover:text-orange-700 transition-colors">
                      {item.name}
                    </h3>

                    {/* Optional Product Description */}
                    {item.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}

                    {/* ── SUPPLIER / SELLER HIGHLIGHT BOX ── */}
                    <div className="mt-4 pt-3 border-t border-slate-100 bg-orange-50/40 p-3 rounded-2xl border border-orange-100/70 space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-orange-900">
                        <span className="flex items-center gap-1">
                          <Store className="w-3.5 h-3.5 text-orange-600" />
                          <span>{isMr ? 'विक्रेता पुरवठादार (Seller)' : 'Sold by Supplier'}</span>
                        </span>
                        {item.deliveryAvailable && (
                          <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            {isMr ? 'डिलिव्हरी देईल' : 'Site Delivery'}
                          </span>
                        )}
                      </div>

                      {/* Supplier Business Name */}
                      <div className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                        <span className="truncate">{item.supplierName}</span>
                        <span title="Verified Supplier"><UserCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" /></span>
                      </div>

                      {/* Supplier Location */}
                      {(item.taluka || item.district || item.address) && (
                        <div className="flex items-center gap-1 text-[11px] text-slate-600">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">
                            {item.address ? `${item.address}, ` : ''}
                            {item.taluka ? `${item.taluka}, ` : ''}
                            {item.district}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── BOTTOM PRICE SET BY SUPPLIER & ACTIONS ── */}
                  <div className="mt-5 pt-3.5 border-t border-slate-100 space-y-3">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                          {isMr ? 'पुरवठादाराने ठरवलेला दर' : 'Price Set by Supplier'}
                        </div>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-2xl font-black text-orange-700 tracking-tight">
                            ₹{Number(item.price || 0).toLocaleString('en-IN')}
                          </span>
                          <span className="text-xs text-slate-500 font-semibold">
                            / {item.unit || 'Unit'}
                          </span>
                        </div>
                      </div>

                      {/* COD Tag */}
                      <div className="text-right">
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <BadgeIndianRupee className="w-3.5 h-3.5 text-emerald-600" />
                          {isMr ? 'पे ऑन डिलिव्हरी' : 'Pay on Delivery'}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <Button
                        onClick={() => handleOpenOrder(item)}
                        disabled={!item.inStock}
                        className="w-full py-2.5 px-3 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-transform active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>{isMr ? 'ऑर्डर करा (COD)' : 'Order (COD)'}</span>
                      </Button>

                      {item.supplierMobile ? (
                        <a
                          href={`tel:${item.supplierMobile}`}
                          className="w-full py-2.5 px-3 rounded-2xl border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Phone className="w-3.5 h-3.5 text-slate-600" />
                          <span>{isMr ? 'कॉल करा' : 'Call'}</span>
                        </a>
                      ) : (
                        <Button
                          onClick={() => handleOpenOrder(item)}
                          variant="outline"
                          className="w-full py-2.5 px-3 rounded-2xl border-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-orange-600" />
                          <span>{isMr ? 'चौकशी करा' : 'Inquire'}</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* ── BOTTOM INFO CARD ── */}
        <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 rounded-3xl p-6 sm:p-8 border border-orange-200/80 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-xl text-center md:text-left">
            <h3 className="text-lg sm:text-xl font-bold font-serif text-slate-900">
              {isMr ? 'बांधकाम साहित्य पुरवठादार (Supplier) आहात का?' : 'Are You a Building Material Supplier?'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {isMr
                ? 'आपल्या परिसरातील हजारो बांधकाम व्यावसायिक व ग्राहकांपर्यंत पोहोचा. सह्याद्री प्लॅटफॉर्मवर नोंदणी करा आणि आपल्या बांधकाम साहित्याची थेट विक्री सुरू करा!'
                : 'Reach thousands of builders and homeowners across Western Maharashtra. Register on Sahyadri and list your construction materials for direct sales!'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 shrink-0 w-full sm:w-auto">
            {isSupplier && (
              <Link to="/supplier/dashboard">
                <Button className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-6 rounded-2xl text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer">
                  <Store className="w-4 h-4" />
                  <span>{isMr ? 'पुरवठादार डॅशबोर्ड: साहित्य जोडा' : 'Supplier Dashboard: Add Supplies'}</span>
                </Button>
              </Link>
            )}

            {isGuest && (
              <Button
                onClick={() => setGuestSupplierModalOpen(true)}
                className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-6 rounded-2xl text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <Store className="w-4 h-4" />
                <span>{isMr ? 'पुरवठादार म्हणून नोंदणी करा व साहित्य जोडा' : 'Register as Supplier & Add Supplies'}</span>
              </Button>
            )}

            {!canAddMaterial && (
              <a
                href="tel:+919822000000"
                className="inline-flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-6 rounded-2xl text-xs sm:text-sm shadow-md transition-colors"
              >
                <Phone className="w-4 h-4" />
                <span>{isMr ? 'सह्याद्री हेल्पलाइन संपर्क' : 'Contact Support'}</span>
              </a>
            )}
          </div>
        </div>

      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── MODAL 1: PAYMENT ON DELIVERY ORDER MODAL ── */}
      {/* ══════════════════════════════════════════════════════════ */}
      <Dialog
        isOpen={orderModalOpen}
        onClose={() => setOrderModalOpen(false)}
        maxWidth="max-w-xl"
        title={
          <div className="flex items-center gap-2 text-slate-900 font-serif">
            <ShoppingBag className="w-5 h-5 text-orange-600" />
            <span>{isMr ? 'ऑर्डर नोंदवा (पे ऑन डिलिव्हरी)' : 'Order Material (Pay on Delivery)'}</span>
          </div>
        }
      >
        {selectedProduct && (
          <div className="text-left space-y-5">
            {!orderConfirmed ? (
              <form onSubmit={handleConfirmOrder} className="space-y-5">
                {/* Product Summary Box */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-orange-100 text-orange-800">
                        {selectedProduct.category}
                      </span>
                      <h4 className="font-bold text-slate-900 text-base mt-1.5">
                        {selectedProduct.name}
                      </h4>
                      {/* Supplier Name */}
                      <p className="text-xs text-orange-950 font-bold mt-1 flex items-center gap-1">
                        <Store className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                        <span>विक्रेता: {selectedProduct.supplierName}</span>
                      </p>
                      {(selectedProduct.taluka || selectedProduct.district) && (
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {selectedProduct.taluka ? `${selectedProduct.taluka}, ` : ''}
                          {selectedProduct.district || 'Maharashtra'}
                        </p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs text-slate-400 block">{selectedProduct.unit}</span>
                      <span className="text-lg font-black text-orange-700">
                        ₹{Number(selectedProduct.price || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Quantity Stepper & Total Calculation */}
                  <div className="pt-3 border-t border-slate-200/70 flex items-center justify-between">
                    <div>
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                        {isMr ? 'प्रमाण (Quantity) *' : 'Quantity *'}
                      </label>
                      <span className="text-[11px] text-slate-400">
                        दर एकक: {selectedProduct.unit}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleDecrement}
                        className="w-8 h-8 rounded-xl bg-white border border-slate-300 text-slate-700 font-bold flex items-center justify-center hover:bg-slate-100 cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>

                      <input
                        type="number"
                        min="1"
                        value={orderQuantity}
                        onChange={(e) => {
                          const val = Math.max(1, parseInt(e.target.value) || 1);
                          setOrderQuantity(val);
                        }}
                        className="w-16 py-1.5 text-center font-black text-slate-900 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                      />

                      <button
                        type="button"
                        onClick={handleIncrement}
                        className="w-8 h-8 rounded-xl bg-white border border-slate-300 text-slate-700 font-bold flex items-center justify-center hover:bg-slate-100 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Subtotal Calculation Box */}
                  <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200/80 flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900">
                      {isMr ? 'एकूण देय रक्कम (Total Payable):' : 'Total Amount Payable:'}
                    </span>
                    <span className="text-lg font-black text-orange-800">
                      ₹{orderTotalAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* ── GUARANTEE BADGE: PAYMENT ON DELIVERY ── */}
                <div className="bg-emerald-50/90 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-extrabold text-emerald-900 uppercase tracking-wide">
                      {isMr ? '💵 पे ऑन डिलिव्हरी (Cash on Delivery) हमी' : '💵 Pay on Delivery Guarantee'}
                    </h5>
                    <p className="text-xs text-emerald-800 mt-0.5 leading-relaxed">
                      {isMr
                        ? 'कोणतीही आगाऊ रक्कम (Advance) देण्याची गरज नाही. साहित्य आपल्या बांधकाम साइटवर आल्यावर तपासून रोख (Cash) किंवा UPI द्वारे पेमेंट करा.'
                        : 'Zero advance payment required. Pay by Cash or UPI directly to the delivery person once materials arrive at your site.'}
                    </p>
                  </div>
                </div>

                {/* Form fields */}
                <div className="space-y-3.5">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    {isMr ? 'डिलिव्हरी माहिती (Site Delivery Address)' : 'Site Delivery Address'}
                  </h5>

                  {formError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                      {formError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {isMr ? 'ग्राहकाचे पूर्ण नाव *' : 'Full Name *'}
                      </label>
                      <Input
                        value={buyerName}
                        onChange={(e) => setBuyerName(e.target.value)}
                        placeholder={isMr ? 'उदा. राहुल पाटील' : 'e.g. Rahul Patil'}
                        required
                        className="text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {isMr ? '१० अंकी मोबाईल नंबर *' : 'Mobile Number (10 digits) *'}
                      </label>
                      <Input
                        type="tel"
                        maxLength={10}
                        value={buyerMobile}
                        onChange={(e) => setBuyerMobile(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="9822000000"
                        required
                        className="text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {isMr ? 'डिलिव्हरी साइटचा संपूर्ण पत्ता (प्लॉट क्र., रस्ता, गाव/शहर) *' : 'Delivery Address (Plot No, Road, Village/City) *'}
                    </label>
                    <Input
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder={isMr ? 'उदा. प्लॉट क्र. १२, सह्याद्री पार्क, कुपवाड रोड, सांगली' : 'Plot 12, Sahyadri Park, Kupwad Road, Sangli'}
                      required
                      className="text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {isMr ? 'जिल्हा (District) *' : 'District *'}
                      </label>
                      <Select
                        value={orderDistrict}
                        onChange={(e) => {
                          setOrderDistrict(e.target.value);
                          setOrderTaluka('');
                        }}
                        options={[
                          { value: 'Sangli', label: 'सांगली (Sangli)' },
                          { value: 'Kolhapur', label: 'कोल्हापूर (Kolhapur)' },
                          { value: 'Satara', label: 'सातारा (Satara)' },
                          { value: 'Pune', label: 'पुणे (Pune)' },
                          { value: 'Solapur', label: 'सोलापूर (Solapur)' }
                        ]}
                        className="text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {isMr ? 'तालुका (Taluka)' : 'Taluka'}
                      </label>
                      <Select
                        value={orderTaluka}
                        onChange={(e) => setOrderTaluka(e.target.value)}
                        options={[
                          { value: '', label: isMr ? 'तालुका निवडा' : 'Select Taluka' },
                          ...modalTalukas
                        ]}
                        className="text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {isMr ? 'जवळचा लँडमार्क (ऐच्छिक)' : 'Nearby Landmark (Optional)'}
                      </label>
                      <Input
                        value={landmark}
                        onChange={(e) => setLandmark(e.target.value)}
                        placeholder={isMr ? 'उदा. मारुती मंदिराशेजारी' : 'Near Water Tank'}
                        className="text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {isMr ? 'विशेष सूचना / टीप' : 'Special Notes'}
                      </label>
                      <Input
                        value={orderNotes}
                        onChange={(e) => setOrderNotes(e.target.value)}
                        placeholder={isMr ? 'उदा. सकाळी डिलिव्हरी हवी' : 'Morning delivery preferred'}
                        className="text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Submit Order Button */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOrderModalOpen(false)}
                    className="rounded-xl text-xs py-2.5 font-bold cursor-pointer"
                  >
                    {isMr ? 'रद्द करा' : 'Cancel'}
                  </Button>

                  <Button
                    type="submit"
                    disabled={isSubmittingOrder}
                    className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs py-2.5 px-6 font-bold shadow-md flex items-center gap-2 cursor-pointer"
                  >
                    {isSubmittingOrder ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>{isMr ? 'ऑर्डर नोंदवत आहे...' : 'Placing Order...'}</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>
                          {isMr
                            ? `ऑर्डर निश्चित करा (देय: ₹${orderTotalAmount.toLocaleString('en-IN')})`
                            : `Confirm Order (Pay ₹${orderTotalAmount.toLocaleString('en-IN')} on Delivery)`}
                        </span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            ) : (
              /* Order Success Screen */
              <div className="py-4 space-y-5 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto animate-bounce">
                  <CheckCircle2 className="w-10 h-10" />
                </div>

                <div>
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-extrabold uppercase bg-emerald-100 text-emerald-800 mb-1">
                    {isMr ? 'ऑर्डर यशस्वीपणे नोंदवली गेली!' : 'Order Placed Successfully!'}
                  </span>
                  <h4 className="text-xl font-bold font-serif text-slate-900">
                    ऑर्डर क्र: #{placedOrderId}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    {isMr
                      ? `आपली ऑर्डर सप्लायर (${placedOrderData?.supplierName}) कडे पाठवण्यात आली आहे. सप्लायर लवकरच आपल्याशी फोन किंवा व्हॉट्सॲपवर संपर्क साधतील.`
                      : `Your order has been notified to ${placedOrderData?.supplierName}. They will contact you shortly to confirm the delivery time.`}
                  </p>
                </div>

                {/* Summary Card */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-left text-xs space-y-2 max-w-md mx-auto">
                  <div className="flex justify-between">
                    <span className="text-slate-500">{isMr ? 'साहित्य:' : 'Item:'}</span>
                    <span className="font-bold text-slate-900">{placedOrderData?.productName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{isMr ? 'विक्रेता पुरवठादार:' : 'Supplier:'}</span>
                    <span className="font-bold text-orange-900">{placedOrderData?.supplierName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{isMr ? 'प्रमाण:' : 'Quantity:'}</span>
                    <span className="font-bold text-slate-900">
                      {placedOrderData?.quantity} {placedOrderData?.unit}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{isMr ? 'पेमेंट पद्धत:' : 'Payment Mode:'}</span>
                    <span className="font-extrabold text-emerald-700">
                      डिलिव्हरीवर रोख (Cash on Delivery)
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200">
                    <span className="font-bold text-slate-900">{isMr ? 'एकूण देय रक्कम:' : 'Total Payable:'}</span>
                    <span className="font-black text-orange-700 text-sm">
                      ₹{Number(placedOrderData?.totalAmount || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2.5 pt-2 max-w-md mx-auto">
                  {placedOrderData?.supplierMobile && (
                    <a
                      href={getWhatsAppLink(placedOrderData)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>{isMr ? 'सप्लायरशी व्हॉट्सॲपवर संपर्क करा' : 'Chat with Supplier on WhatsApp'}</span>
                    </a>
                  )}

                  {placedOrderData?.supplierMobile && (
                    <a
                      href={`tel:${placedOrderData.supplierMobile}`}
                      className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                    >
                      <Phone className="w-4 h-4 text-orange-600" />
                      <span>{isMr ? 'सप्लायरला कॉल करा' : 'Call Supplier Directly'}</span>
                    </a>
                  )}

                  <Button
                    onClick={() => {
                      setOrderModalOpen(false);
                      setOrderConfirmed(false);
                    }}
                    variant="outline"
                    className="w-full py-2 rounded-xl text-xs font-bold text-slate-600 cursor-pointer"
                  >
                    {isMr ? 'खरेदी सुरू ठेवा (Done)' : 'Continue Shopping'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Dialog>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── MODAL 2: BUYER ORDER HISTORY (MY ORDERS) ── */}
      {/* ══════════════════════════════════════════════════════════ */}
      <Dialog
        isOpen={myOrdersModalOpen}
        onClose={() => setMyOrdersModalOpen(false)}
        maxWidth="max-w-2xl"
        title={
          <div className="flex items-center gap-2 text-slate-900 font-serif">
            <ShoppingBag className="w-5 h-5 text-orange-600" />
            <span>{isMr ? 'माझे बांधकाम साहित्य ऑर्डर्स' : 'My Material Orders (Pay on Delivery)'}</span>
          </div>
        }
      >
        <div className="text-left space-y-4">
          {myOrders.length === 0 ? (
            <div className="text-center py-10">
              <Package className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">
                {isMr ? 'आपण अद्याप कोणतीही ऑर्डर दिलेली नाही' : 'No material orders placed yet'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {isMr ? 'साहित्य निवडून "ऑर्डर करा" वर क्लिक करा.' : 'Select supplies and click "Order (COD)" to place orders.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3.5 max-h-[60vh] overflow-y-auto no-scrollbar pr-1">
              {myOrders.map((ord, idx) => (
                <div
                  key={ord.orderId || idx}
                  className="p-4 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-3 hover:border-orange-200 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900">
                          #{ord.orderId}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                          {isMr ? 'डिलिव्हरी प्रलंबित' : 'Pending Delivery'}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm mt-1">
                        {ord.productName}
                      </h4>
                      <p className="text-xs text-orange-950 font-bold mt-0.5 flex items-center gap-1">
                        <Store className="w-3 h-3 text-orange-600" />
                        <span>{ord.supplierName}</span>
                        <span className="text-slate-400 font-normal">• {ord.quantity} {ord.unit}</span>
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-slate-400 block">{isMr ? 'पे ऑन डिलिव्हरी' : 'Pay on Delivery'}</span>
                      <span className="text-base font-black text-orange-700">
                        ₹{Number(ord.totalAmount || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200/70">
                    <div className="flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                      <span className="leading-snug">
                        {ord.deliveryAddress}, {ord.taluka || ''}, {ord.district || ''}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    {ord.supplierMobile && (
                      <a
                        href={getWhatsAppLink(ord)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-xs hover:bg-emerald-100 flex items-center gap-1.5 transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>
                    )}

                    {ord.supplierMobile && (
                      <a
                        href={`tel:${ord.supplierMobile}`}
                        className="px-3 py-1.5 rounded-xl bg-orange-50 text-orange-700 font-bold text-xs hover:bg-orange-100 flex items-center gap-1.5 transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>{isMr ? 'कॉल' : 'Call'}</span>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── MODAL 3: GUEST SUPPLIER ONBOARDING MODAL ── */}
      {/* ══════════════════════════════════════════════════════════ */}
      <Dialog
        isOpen={guestSupplierModalOpen}
        onClose={() => setGuestSupplierModalOpen(false)}
        maxWidth="max-w-md"
        title={
          <div className="flex items-center gap-2 text-slate-900 font-serif">
            <Store className="w-5 h-5 text-orange-600" />
            <span>{isMr ? 'साहित्य जोडा (पुरवठादार नोंदणी)' : 'Add Supplies (Supplier Registration)'}</span>
          </div>
        }
      >
        <div className="text-left space-y-5">
          <div className="p-4 bg-orange-50/70 border border-orange-200/80 rounded-2xl space-y-2">
            <div className="flex items-center gap-2 text-orange-950 font-bold text-sm">
              <UserCheck className="w-4 h-4 text-orange-600" />
              <span>{isMr ? 'साहित्य जोडण्यासाठी पुरवठादार खाते आवश्यक' : 'Supplier Account Required'}</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {isMr
                ? 'सह्याद्री बाजारपेठेत आपले बांधकाम साहित्य (सिमेंट, स्टील, वाळू, विटा, टाईल्स इ.) जोडण्यासाठी आणि स्वतःचे दर ठरवण्यासाठी, कृपया आपले खाते तयार करा आणि पुरवठादार (Supplier) म्हणून अर्ज करा.'
                : 'To list your construction supplies and set your own wholesale prices on Sahyadri, please create an account and apply to become an authorized supplier.'}
            </p>
          </div>

          {/* Quick Steps */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {isMr ? 'साहित्य कसे जोडावे?' : 'How It Works:'}
            </h5>
            <div className="grid grid-cols-1 gap-2.5 text-xs">
              <div className="flex items-start gap-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-200/70">
                <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-800 font-black text-[11px] flex items-center justify-center shrink-0">1</span>
                <div>
                  <p className="font-bold text-slate-800">{isMr ? 'खाते तयार करा' : 'Create an Account'}</p>
                  <p className="text-slate-500 text-[11px]">{isMr ? 'मोबाईल नंबर किंवा ईमेलद्वारे १ मिनिटात नोंदणी करा.' : 'Register in 1 minute using mobile or email.'}</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-200/70">
                <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-800 font-black text-[11px] flex items-center justify-center shrink-0">2</span>
                <div>
                  <p className="font-bold text-slate-800">{isMr ? 'पुरवठादार (Supplier) अर्ज भरा' : 'Apply as Supplier'}</p>
                  <p className="text-slate-500 text-[11px]">{isMr ? 'व्यवसायाचे नाव, जिल्हा व साहित्य श्रेणी निवडून सबमिट करा.' : 'Submit business details, district, and supply category.'}</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-200/70">
                <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-800 font-black text-[11px] flex items-center justify-center shrink-0">3</span>
                <div>
                  <p className="font-bold text-slate-800">{isMr ? 'थेट साहित्य जोडा व विक्री सुरू करा' : 'Add Supplies & Start Selling'}</p>
                  <p className="text-slate-500 text-[11px]">{isMr ? 'मंजूरीनंतर डॅशबोर्डवरून अमर्यादित साहित्याची यादी व स्वतःचे दर जोडा.' : 'Access supplier dashboard to add supplies and set your own rates.'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Links */}
          <div className="space-y-2 pt-2">
            <Link
              to="/register?role=supplier&redirect=%2Frole-inquiry%3Frole%3Dsupplier"
              onClick={() => setGuestSupplierModalOpen(false)}
              className="w-full block"
            >
              <Button className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white rounded-2xl py-3 px-4 text-xs sm:text-sm font-bold shadow-md flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-98">
                <Plus className="w-4 h-4" />
                <span>{isMr ? 'नवीन खाते तयार करा व पुरवठादार अर्ज करा' : 'Create Account & Apply as Supplier'}</span>
              </Button>
            </Link>

            <Link
              to="/login?redirect=%2Fsupplier%2Fdashboard"
              onClick={() => setGuestSupplierModalOpen(false)}
              className="w-full block"
            >
              <Button
                variant="outline"
                className="w-full rounded-2xl py-2.5 text-xs font-bold border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <span>{isMr ? 'आधीच खाते आहे का? लॉग इन करा' : 'Already have an account? Sign In'}</span>
              </Button>
            </Link>
          </div>
        </div>
      </Dialog>

    </div>
  );
};
