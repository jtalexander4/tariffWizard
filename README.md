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
- **Special Rates** - {HS Code, Special Product Rate, Rate Type, Applicable Countries}
- **Exemptions** - {HS Code, Exemption Rate, Eligible Countries}
- **Material Rates** - {Material, Special Rate, Applicable HS Codes}

## Getting Started

### Prerequisites

Before setting up Tariff Wizard, ensure you have the following installed:

- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **MongoDB** (v5.0 or higher) - [Download here](https://www.mongodb.com/try/download/community) or use MongoDB Atlas cloud
- **Git** - [Download here](https://git-scm.com/)

### API Key Setup

Sign up for a free API key at [metals.dev](https://metals.dev/) for live metal pricing.

### Installation Steps

1. **Clone the Repository**

   ```bash
   git clone <repository-url>
   cd tariffWizard
   ```

2. **Install Dependencies**

   ```bash
   # Install root dependencies (for concurrent development)
   npm install

   # Install server and client dependencies
   npm run install-all
   ```

3. **Set Up Environment Variables**

   ```bash
   # In the server directory
   cd server
   copy .env.example .env  # Windows
   # or cp .env.example .env  # macOS/Linux
   ```

   Edit the `.env` file with your configuration:

   ```env
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/tariffwizard  # or your MongoDB Atlas URI
   CLIENT_URL=http://localhost:3000
   JWT_SECRET=your_secure_jwt_secret_here
   DB_NAME=tariffwizard
   METAL_PRICE_API_KEY=your_metals_dev_api_key_here
   ```

4. **Start MongoDB**

   - **Windows**: Start MongoDB service or run `mongod` in command prompt
   - **macOS**: `brew services start mongodb/brew/mongodb-community`
   - **Linux**: `sudo systemctl start mongod`
   - **MongoDB Atlas**: No local setup required

5. **Seed the Database**

   ```bash
   # From the root directory
   npm run seed
   ```

6. **Start the Application**
   ```bash
   # Start both server and client simultaneously
   npm run dev
   ```

### Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Health Check**: http://localhost:5000/api/health

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

## API Endpoints

### HS Codes

- `GET /api/hscodes` - Get all HS codes
- `GET /api/hscodes/:hsCode` - Get specific HS code
- `POST /api/hscodes` - Create new HS code
- `PUT /api/hscodes/:hsCode` - Update HS code
- `DELETE /api/hscodes/:hsCode` - Delete HS code

### Countries

- `GET /api/countries` - Get all countries
- `GET /api/countries/:countryCode` - Get specific country
- `POST /api/countries` - Create new country rate
- `PUT /api/countries/:countryCode` - Update country rate
- `DELETE /api/countries/:countryCode` - Delete country rate

### Calculator

- `POST /api/calculator/calculate` - Calculate tariffs

### Materials

- `GET /api/materials` - Get all material rates
- `POST /api/materials` - Create new material rate

### Special Rates

- `GET /api/specialrates` - Get all special rates
- `POST /api/specialrates` - Create new special rate

### Exemptions

- `GET /api/exemptions` - Get all exemptions
- `POST /api/exemptions` - Create new exemption

## Troubleshooting

### Common Issues

1. **MongoDB Connection Error**

   - Ensure MongoDB is running
   - Check the MONGODB_URI in your .env file
   - Verify the database name is correct

2. **Port Already in Use**

   - Check if ports 3000 or 5000 are being used by other applications
   - Change the PORT in .env file if needed

3. **Dependencies Installation Failed**

   - Delete node_modules folders and package-lock.json files
   - Run npm install again
   - Check your Node.js version

4. **API Not Responding**

   - Check if the server is running on port 5000
   - Verify the proxy setting in client/package.json
   - Check for CORS issues

5. **Metal Price API Issues**
   - Verify your metals.dev API key is correct
   - Check if you've reached API rate limits
   - Ensure your API key has the necessary permissions

### Development Tips

1. **Database Management**

   - Use MongoDB Compass for visual database management
   - Re-run the seed script to reset data: `npm run seed`

2. **API Testing**

   - Use Postman or curl to test API endpoints
   - Check the API health endpoint: http://localhost:5000/api/health

3. **Frontend Development**
   - React DevTools extension is helpful for debugging
   - Check browser console for errors
   - Use React Bootstrap documentation for UI components

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
    │   ├── SpecialRate.js
    │   ├── Exemption.js
    │   └── MaterialRate.js
    ├── routes/             # API route handlers
    │   ├── calculator.js   # Main calculation logic
    │   ├── hsCodes.js
    │   ├── countries.js
    │   ├── specialRates.js
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
