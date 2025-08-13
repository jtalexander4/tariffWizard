# 🧮 Tariff Wizard

A sophisticated web application for calculating US import tariffs with support for country-specific rates, special tariffs (Section 301, Section 232, Fentanyl), material-based calculations, and live metal pricing.

## ✨ Features

- **Comprehensive Tariff Calculation**: Base tariff rates, country-specific rates, and special tariffs
- **Country-Specific Special Rates**: Section 301 tariffs apply only to China, while Section 232 applies globally
- **Material-Based Calculations**: Calculate tariffs on material content (copper, aluminum) separately from product cost
- **Live Metal Pricing**: Real-time LME (London Metal Exchange) pricing for copper and aluminum
- **Exemption Handling**: Automatic application of trade exemptions that zero out country rates
- **MERN Stack**: Modern React frontend with Node.js/Express backend and MongoDB database

## Technology Stack

- **Frontend**: React 18, React Bootstrap, React Router
- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **API**: RESTful API with comprehensive endpoints
- **Security**: Helmet, CORS, Rate limiting

## How It Works

Tariff Wizard determines applicable tariffs using these primary factors:

1. **Country of Origin (COO)** - Base country-specific rates
2. **HS Code** - Harmonized System classification and normal tariff rates
3. **Materials Used** - Special material-based tariffs (Section 232, etc.)
4. **Product-Specific Tariffs** - Additional duties (Section 301, antidumping, etc.)
5. **Exemptions** - Trade agreement benefits and special exemptions

## Database Schema

The system includes five main data tables:

- **HS Codes** - {HS Code, Description, Normal Tariff Rate}
- **Country Rates** - {Country, Ad Valorem Rate}
- **Product Rates** - {HS Code, Special Product Rate, Rate Type}
- **Exemptions** - {HS Code, Exemption Rate, Eligible Countries}
- **Material Rates** - {Material, Special Rate, Applicable HS Codes}

## Getting Started

1. **Prerequisites**: Node.js (v16+), MongoDB (v5.0+), Git
2. **Installation**: Follow the detailed setup instructions in [INSTALL.md](INSTALL.md)
3. **Quick Start**:
   ```bash
   git clone <repository-url>
   cd tariffWizard
   npm install
   npm run install-all
   # Configure .env file in server directory
   npm run seed    # Populate sample data
   npm run dev     # Start both server and client
   ```
4. **Access**: Open http://localhost:3000 for the calculator interface

## API Usage

### Calculate Tariffs

```bash
POST /api/calculator/calculate
{
  "hsCode": "8471.30.01",
  "country": "CN",
  "productCost": 1000,
  "materials": ["aluminum"]
}
```

### Response Example

```json
{
  "hsCode": "8471.30.01",
  "country": "CN",
  "productCost": 1000,
  "baseTariff": { "rate": 0, "amount": 0 },
  "countrySpecific": { "rate": 7.4, "amount": 74 },
  "productSpecific": [],
  "materialSpecific": [{ "material": "aluminum", "rate": 10, "amount": 100 }],
  "exemptions": [],
  "totalTariffRate": 17.4,
  "totalTariffAmount": 174,
  "finalCost": 1174
}
```

## 🧪 Testing & Verification

### Basic Setup Tests

```bash
# Test database connection
cd server && node scripts/testConnection.js

# Test metal price API
cd server && node scripts/testMetalPrices.js
```

### Security Audit

Run the security check to ensure no sensitive data is exposed:

**Windows (PowerShell):**

```powershell
.\security-check.ps1
```

**Linux/Mac:**

```bash
chmod +x security-check.sh
./security-check.sh
```

## 🔒 Security

This project follows security best practices:

- All sensitive data stored in environment variables
- MongoDB credentials never hardcoded
- API keys managed through `.env` files
- Development scripts with sensitive data are gitignored
- Regular security audits with automated scanning

## 📁 Project Structure

```
tariffWizard/
├── package.json              # Root scripts for development
├── INSTALL.md               # Detailed installation guide
├── client/                  # React frontend application
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── TariffCalculator.js
│   │   │   └── AdminPanel.js
│   │   └── App.js
│   └── package.json
└── server/                  # Express backend application
    ├── server.js           # Main server file
    ├── models/             # MongoDB data models
    │   ├── HsCode.js
    │   ├── CountryRate.js
    │   ├── ProductRate.js
    │   ├── Exemption.js
    │   └── MaterialRate.js
    ├── routes/             # API route handlers
    │   ├── calculator.js   # Main calculation logic
    │   ├── hsCodes.js
    │   ├── countries.js
    │   ├── products.js
    │   ├── exemptions.js
    │   └── materials.js
    ├── scripts/
    │   └── seedDatabase.js # Sample data population
    └── package.json
```

## Future Enhancements

- **PDF Generation**: Automatic UPS customs form filling
- **User Authentication**: User accounts and calculation history
- **Data Import**: Import tariff data from government sources
- **Admin Interface**: Complete CRUD operations for all data types
- **Reporting**: Analytics and reporting dashboard
- **Export Functions**: CSV/Excel export of calculations
- **Mobile App**: React Native mobile application

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

See [LICENSE](LICENSE) for details.
