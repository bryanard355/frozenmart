// =====================================================================
//  Shop details + the STARTING product list.
//  Day-to-day, update stock, prices and photos on your admin page:
//    https://admin.frozenmart.bryanowusu.club
//  This list is only used as the starting point (and as a backup if storage is unreachable).
// =====================================================================

const SHOP = {
  name: "Frozen Mart",
  tagline: "Quality fresh and frozen foods",
  currency: "GH₵ ",               // e.g. "GH₵", "₦", "$", "£"
  whatsappNumber: "233509691257", // WhatsApp number for orders, with country code, digits only
  phones: ["055 286 9312", "050 969 1257"],
  location: "KNUST Campus",
  // Delivery is always FREE.
  lowStockAt: 5,                  // show "Only X left" at or below this number
  footer: "Open Mon–Sat, 8am–8pm • Orders are confirmed on WhatsApp before payment.",
};

// stock: how many you have. Set to 0 when sold out.
// PHOTOS: a picture in the "photos" folder named after the product's id shows automatically,
//   e.g. photos/gizzard.jpg. (Or upload photos from the admin page.)
const PRODUCTS = [
  { id: "sadia",        name: "Sadia",           category: "Chicken", unit: "", price: 21,  stock: 20, emoji: "🍗" },
  { id: "nat",          name: "Nat",             category: "Chicken", unit: "", price: 18,  stock: 20, emoji: "🍗" },
  { id: "chk-breast",   name: "Chicken Breast",  category: "Chicken", unit: "Boneless & skinless · 2 kg pack", price: 120, stock: 20, emoji: "🍗",
    images: ["photos/chk-breast.jpg"] },
  { id: "gizzard",      name: "Gizzard",         category: "Chicken", unit: "", price: 42,  stock: 20, emoji: "🍗",
    images: ["photos/gizzard.jpg"] },
  { id: "drumstick",    name: "Drumstick",       category: "Chicken", unit: "", price: 35,  stock: 20, emoji: "🍗",
    images: ["photos/drumstick-1.jpg", "photos/drumstick-2.jpg"] },
  { id: "layer-hard",   name: "Layer (Hard)",    category: "Chicken", unit: "", price: 42,  stock: 20, emoji: "🐔" },
  { id: "broiler-soft", name: "Broiler (Soft)",  category: "Chicken", unit: "", price: 35,  stock: 20, emoji: "🐔" },
];
