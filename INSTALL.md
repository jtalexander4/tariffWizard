# Installation and Setup Guide

## Prerequisites

Before setting up Tariff Wizard, ensure you have the following installed:

- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **MongoDB** (v5.0 or higher) - [Download here](https://www.mongodb.com/try/download/community)
- **Git** - [Download here](https://git-scm.com/)

## Installation Steps

### 1. Clone the Repository

```bash
git clone <repository-url>
cd tariffWizard
```

### 2. Install Dependencies

Install dependencies for both server and client:

```bash
# Install root dependencies (for concurrent development)
npm install

# Install server dependencies
npm run install-server

# Install client dependencies
npm run install-client
```

### 3. Set Up Environment Variables

Copy the example environment file and configure it:

```bash
# In the server directory
cd server
copy .env.example .env
```

Edit the `.env` file with your configuration:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/tariffwizard
CLIENT_URL=http://localhost:3000
JWT_SECRET=your_secure_jwt_secret_here
DB_NAME=tariffwizard
```

### 4. Start MongoDB

Make sure MongoDB is running on your system:

- **Windows**: Start MongoDB service or run `mongod` in command prompt
- **macOS**: `brew services start mongodb/brew/mongodb-community`
- **Linux**: `sudo systemctl start mongod`

### 5. Seed the Database

Populate the database with sample data:

```bash
cd server
npm run seed
```

### 6. Start the Application

You can start both the server and client simultaneously:

```bash
# From the root directory
npm run dev
```

Or start them separately:

```bash
# Terminal 1 - Start the server
npm run server

# Terminal 2 - Start the client
npm run client
```

## Accessing the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Health Check**: http://localhost:5000/api/health

## Project Structure

```
tariffWizard/
├── package.json                 # Root package.json for concurrent scripts
├── README.md                   # Project documentation
├── INSTALL.md                  # This installation guide
├── client/                     # React frontend
│   ├── package.json
│   ├── public/
│   └── src/
│       ├── components/
│       ├── App.js
│       └── index.js
└── server/                     # Express backend
    ├── package.json
    ├── server.js              # Main server file
    ├── models/                # MongoDB models
    ├── routes/                # API routes
    └── scripts/               # Database scripts
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

## Database Schema

### HS Codes

```javascript
{
  hsCode: String,          // Required, unique
  description: String,     // Required
  normalTariffRate: Number, // Required, 0-100
  unit: String            // Default: 'percent'
}
```

### Country Rates

```javascript
{
  country: String,         // Required, unique
  countryCode: String,     // Required, unique
  adValoremRate: Number,   // Required, 0-100
  isActive: Boolean,       // Default: true
  effectiveDate: Date,     // Default: now
  expirationDate: Date     // Optional
}
```

### Product Rates

```javascript
{
  hsCode: String,          // Required
  specialProductRate: Number, // Required, 0-100
  productDescription: String,
  rateType: String,        // antidumping, countervailing, section232, section301, other
  isActive: Boolean,       // Default: true
  effectiveDate: Date,     // Default: now
  expirationDate: Date     // Optional
}
```

### Exemptions

```javascript
{
  hsCode: String,          // Required
  exemptionRate: Number,   // Required, 0-100
  exemptionType: String,   // mfn, gsp, nafta, usmca, fta, other
  exemptionDescription: String,
  eligibleCountries: [String],
  isActive: Boolean,       // Default: true
  effectiveDate: Date,     // Default: now
  expirationDate: Date     // Optional
}
```

### Material Rates

```javascript
{
  material: String,        // Required, unique
  specialProductRate: Number, // Required, 0-100
  materialCategory: String, // steel, aluminum, copper, lumber, textiles, other
  rateType: String,        // section232, section301, antidumping, countervailing, other
  applicableHsCodes: [String],
  isActive: Boolean,       // Default: true
  effectiveDate: Date,     // Default: now
  expirationDate: Date     // Optional
}
```

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

## Next Steps

1. **Data Management**: Use the Admin Panel (coming soon) to manage tariff data
2. **PDF Generation**: Implement PDF form filling for UPS customs forms
3. **User Authentication**: Add user accounts and calculation history
4. **Import/Export**: Add functionality to import tariff data from external sources
5. **Reporting**: Add analytics and reporting features

## Support

For issues and questions:

1. Check this installation guide
2. Review the troubleshooting section
3. Check the project's issue tracker
4. Contact the development team
