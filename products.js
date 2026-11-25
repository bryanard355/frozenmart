// =====================================================================
//  EDIT THIS FILE to change your shop details, prices and stock.
//  Save the file and refresh the page — that's it.
// =====================================================================

const SHOP = {
  name: "Frozen Mart",
  tagline: "Frozen foods • Free delivery",
  currency: "GH₵ ",             // e.g. "GH₵", "₦", "$", "£"
  whatsappNumber: "233509691257", // YOUR WhatsApp number with country code, digits only
  // Delivery is always FREE.
  lowStockAt: 5,             // show "Only X left" at or below this number
  footer: "Open Mon–Sat, 8am–8pm • Orders are confirmed on WhatsApp before payment.",
};

// stock: how many you have. Set to 0 when sold out.
// TIP: once the admin page is set up, update stock, prices and photos there instead.
// This file is only the starting list (and the backup if storage is unreachable).
//
// PHOTOS: put a picture in the "photos" folder named after the product's id, e.g.
//   photos/chk-whole.jpg   photos/prawns.png   (jpg, jpeg, png or webp all work)
// It shows up automatically. No photo yet? The emoji is shown instead.
// (You can also point to any file yourself with:  image: "photos/my-picture.jpg")
const PRODUCTS = [
  // Chicken
  { id: "chk-whole",   name: "Whole Chicken",         category: "Chicken",    unit: "approx. 1.5 kg", price: 9.5,  stock: 24, emoji: "🐔" },
  { id: "chk-thighs",  name: "Chicken Thighs",        category: "Chicken",    unit: "1 kg pack",      price: 7.0,  stock: 30, emoji: "🍗" },
  { id: "chk-wings",   name: "Chicken Wings",         category: "Chicken",    unit: "1 kg pack",      price: 6.5,  stock: 4,  emoji: "🍗" },
  { id: "chk-breast",  name: "Chicken Breast",        category: "Chicken",    unit: "Boneless & skinless · 2 kg pack", price: 120, stock: 20, emoji: "🍗" },

  // Meat
  { id: "beef-mince",  name: "Beef Mince",            category: "Meat",       unit: "500 g",          price: 6.0,  stock: 15, emoji: "🥩" },
  { id: "goat-meat",   name: "Goat Meat",             category: "Meat",       unit: "1 kg",           price: 12.0, stock: 8,  emoji: "🥩" },
  { id: "sausages",    name: "Beef Sausages",         category: "Meat",       unit: "pack of 12",     price: 5.0,  stock: 20, emoji: "🌭" },

  // Fish & Seafood
  { id: "mackerel",    name: "Mackerel",              category: "Fish & Seafood", unit: "1 carton piece (approx. 1 kg)", price: 7.5, stock: 18, emoji: "🐟" },
  { id: "tilapia",     name: "Tilapia",               category: "Fish & Seafood", unit: "per fish (large)", price: 4.5, stock: 3, emoji: "🐠" },
  { id: "prawns",      name: "Prawns",                category: "Fish & Seafood", unit: "500 g",        price: 10.0, stock: 10, emoji: "🦐" },

  // Vegetables & Sides
  { id: "fries",       name: "French Fries",          category: "Vegetables & Sides", unit: "2.5 kg bag", price: 8.0, stock: 12, emoji: "🍟" },
  { id: "mixed-veg",   name: "Mixed Vegetables",      category: "Vegetables & Sides", unit: "1 kg bag",   price: 4.0, stock: 25, emoji: "🥦" },
  { id: "sweetcorn",   name: "Sweet Corn",            category: "Vegetables & Sides", unit: "1 kg bag",   price: 3.5, stock: 0,  emoji: "🌽" },

  // Snacks & Desserts
  { id: "spring-rolls", name: "Spring Rolls",         category: "Snacks & Desserts", unit: "pack of 20",  price: 5.5, stock: 14, emoji: "🥟" },
  { id: "ice-cream",   name: "Vanilla Ice Cream",     category: "Snacks & Desserts", unit: "2 litre tub", price: 6.0, stock: 9,  emoji: "🍨" },
];
