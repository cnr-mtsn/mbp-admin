# Paint Company Inventory Management System

A full-stack inventory management system designed for paint companies with QR code scanning, label printing, and real-time tracking.

## Features

- ✅ **Authentication & Authorization** - Secure JWT-based user authentication
- 📦 **Product Management** - Check-in/check-out inventory with detailed tracking
- 🏷️ **QR Code Generation** - Automatic QR code generation and printing for paint/stain products
- 📱 **QR Code Scanning** - Scan QR codes with handheld scanners or smartphone cameras
- 🔍 **Advanced Search** - Search by product ID, brand, color, color code, or category
- 📊 **Analytics Dashboard** - Real-time inventory summaries and low stock alerts
- 📝 **Transaction History** - Track all check-ins and check-outs with employee names
- 🎨 **Paint-Specific Fields** - Support for type, brand, color, SW color codes, sheen levels
- 💡 **Container Calculations** - Easy decimal input (0-1) with automatic gallon conversion

## Tech Stack

### Backend
- Node.js + Express
- PostgreSQL database
- JWT authentication
- QR code generation (qrcode library)

### Frontend
- React 18 + Vite
- Tailwind CSS
- Zustand (state management)
- React Router
- html5-qrcode (camera scanning)
- Axios (API client)

## Hardware Recommendations

### Handheld Barcode/QR Scanners
1. **Zebra DS2208** (~$150-200) - Recommended for durability
2. **Socket Mobile S700** (~$200-300) - Bluetooth + USB
3. **Honeywell Voyager 1200g** (~$100-150) - Budget option

### QR Code Label Printers
1. **Zebra ZD421** (~$400-500) - Best for harsh environments
2. **Brother QL-820NWB** (~$200) - WiFi/Bluetooth enabled
3. **Dymo LabelWriter 550** (~$200) - Good value option

**Important:** Get waterproof/chemical-resistant labels (polyester or vinyl) for paint shop environments.

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Git

## Quick Start

```bash
cd backend
npm install
npm run migrate
npm run dev

# In another terminal
cd frontend
npm install
npm run dev
```

See QUICKSTART.md for detailed setup instructions.

## Support

For detailed documentation, see the other markdown files in this directory.
