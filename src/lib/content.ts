export const cafe = {
  name: "LittleCafe",
  tagline: "Neighborhood coffee, warm plates, and unhurried mornings.",
  phone: "(555) 014-2026",
  email: "hello@littlecafe.example",
  address: "128 Willow Street, Chicago, IL",
  hours: [
    { day: "Mon-Fri", value: "7:00 AM - 6:00 PM" },
    { day: "Saturday", value: "8:00 AM - 5:00 PM" },
    { day: "Sunday", value: "8:00 AM - 3:00 PM" }
  ],
  agreements: [
    "I understand that cafe events may include food allergens and I am responsible for disclosing dietary needs.",
    "I agree to follow posted safety guidance and staff instructions during visits, workshops, and private events.",
    "I consent to LittleCafe storing this waiver submission for administrative records."
  ]
};

export const navItems = [
  { href: "/", label: "Home" },
  { href: "/pricing", label: "Pricing" },
  { href: "/gallery", label: "Gallery" },
  { href: "/menu", label: "Menu" },
  { href: "/calendar", label: "Calender" },
  { href: "/partnership", label: "Partnership" },
  { href: "/waiver", label: "Waiver" },
  { href: "/contact", label: "Contact" },
  { href: "/admin", label: "Admin" }
];

export const menuSections = [
  {
    title: "Coffee Bar",
    items: [
      { name: "House Drip", description: "Rotating single-origin roast", price: "$4" },
      { name: "Maple Latte", description: "Espresso, steamed milk, maple, cinnamon", price: "$6" },
      { name: "Cold Brew", description: "Slow-steeped and bright", price: "$5" }
    ]
  },
  {
    title: "Kitchen",
    items: [
      { name: "Garden Toast", description: "Sourdough, whipped feta, tomato, herbs", price: "$11" },
      { name: "Market Quiche", description: "Seasonal vegetables, greens", price: "$12" },
      { name: "Soup & Half Sandwich", description: "Daily soup with grilled focaccia", price: "$14" }
    ]
  },
  {
    title: "Sweet Case",
    items: [
      { name: "Lemon Olive Oil Cake", description: "Tender crumb, citrus glaze", price: "$6" },
      { name: "Brown Butter Cookie", description: "Sea salt and dark chocolate", price: "$4" },
      { name: "Berry Hand Pie", description: "Jammy fruit, flaky pastry", price: "$5" }
    ]
  }
];

export const pricing = [
  { title: "Morning Meeting", price: "$85", details: "Coffee service and pastry tray for up to 10 guests." },
  { title: "Community Table", price: "$160", details: "Reserved table block with coffee, tea, and light bites." },
  { title: "Private Cafe Hour", price: "$450", details: "After-hours cafe rental for small gatherings and workshops." }
];

export const fallbackGallery = [
  {
    id: "demo-1",
    public_url: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80",
    alt_text: "Barista pouring latte art"
  },
  {
    id: "demo-2",
    public_url: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=80",
    alt_text: "Warm cafe seating area"
  },
  {
    id: "demo-3",
    public_url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
    alt_text: "Cafe dining room with tables"
  }
];
