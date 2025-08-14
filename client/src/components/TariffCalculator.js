import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Form,
  Button,
  Alert,
  Spinner,
} from "react-bootstrap";
import Select from "react-select";
import axios from "axios";
import { generateTariffPDF, testPDF } from "../utils/pdfGenerator";

const TariffCalculator = () => {
  const [formData, setFormData] = useState({
    hsCode: "",
    country: "",
    productCost: "",
    manufacturerPartNumber: "", // New field
    countryOfCast: "", // New field
    countryOfSmelt: "", // New field
    materials: [],
    materialWeights: {}, // New: track material weights in kg
  });
  const [hsCodes, setHsCodes] = useState([]);
  const [countries, setCountries] = useState([]);
  const [calculation, setCalculation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchHsCodes();
    fetchCountries();
  }, []);

  const fetchHsCodes = async () => {
    try {
      const response = await axios.get("/api/hscodes");
      const options = response.data.hsCodes.map((hs) => ({
        value: hs.hsCode,
        label: `${hs.hsCode} - ${hs.description}`,
      }));
      setHsCodes(options);
    } catch (error) {
      console.error("Error fetching HS codes:", error);
    }
  };

  const fetchCountries = async () => {
    try {
      const response = await axios.get("/api/countries");
      const options = response.data.map((country) => ({
        value: country.countryCode,
        label: `${country.country} (${country.countryCode})`,
      }));
      setCountries(options);
    } catch (error) {
      console.error("Error fetching countries:", error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSelectChange = (selectedOption, actionMeta) => {
    setFormData((prev) => ({
      ...prev,
      [actionMeta.name]: selectedOption ? selectedOption.value : "",
    }));
  };

  const handleMaterialsChange = (selectedOptions) => {
    const materials = selectedOptions
      ? selectedOptions.map((option) => option.value)
      : [];
    setFormData((prev) => ({
      ...prev,
      materials,
      // Reset material weights when materials change
      materialWeights: materials.reduce((acc, material) => {
        acc[material] = prev.materialWeights[material] || "";
        return acc;
      }, {}),
    }));
  };

  const handleMaterialWeightChange = (material, weight) => {
    setFormData((prev) => ({
      ...prev,
      materialWeights: {
        ...prev.materialWeights,
        [material]: weight,
      },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await axios.post("/api/calculator/calculate", formData);
      setCalculation(response.data);
    } catch (error) {
      setError(
        error.response?.data?.error || "An error occurred during calculation"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePDF = () => {
    console.log("PDF generation started...");
    console.log("Calculation data:", calculation);
    console.log("Form data:", formData);
    
    if (!calculation) {
      setError("Please calculate tariffs first before generating PDF");
      return;
    }

    try {
      // Add the HS code description to the calculation data
      const selectedHsCode = hsCodes.find(hs => hs.value === formData.hsCode);
      const selectedCastCountry = countries.find(c => c.value === formData.countryOfCast);
      const selectedSmeltCountry = countries.find(c => c.value === formData.countryOfSmelt);
      
      console.log("Selected HS Code:", selectedHsCode);
      console.log("Selected Cast Country:", selectedCastCountry);
      console.log("Selected Smelt Country:", selectedSmeltCountry);
      
      const enhancedCalculation = {
        ...calculation,
        hsCodeDescription: selectedHsCode ? selectedHsCode.label.split(' - ')[1] : 'Product Description',
        manufacturerPartNumber: formData.manufacturerPartNumber,
        countryOfCast: selectedCastCountry ? selectedCastCountry.label : formData.country,
        countryOfSmelt: selectedSmeltCountry ? selectedSmeltCountry.label : formData.country
      };

      console.log("Enhanced calculation:", enhancedCalculation);
      console.log("About to call generateTariffPDF...");
      
      const filename = generateTariffPDF(enhancedCalculation, formData);
      console.log(`PDF generated successfully: ${filename}`);
      
      // Clear any existing errors
      setError("");
      
    } catch (error) {
      console.error("PDF generation error:", error);
      setError("Error generating PDF: " + error.message);
    }
  };

  const materialOptions = [
    { value: "aluminum", label: "Aluminum" },
    { value: "copper", label: "Copper" },
  ];

  return (
    <Container className="calculator-container">
      <Row>
        <Col md={12}>
          <Card className="mb-4">
            <Card.Header>
              <h2>Tariff Calculator</h2>
              <p className="mb-0">
                Calculate US import tariffs for your products
              </p>
            </Card.Header>
            <Card.Body>
              <Form onSubmit={handleSubmit}>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>HS Code *</Form.Label>
                      <Select
                        name="hsCode"
                        options={hsCodes}
                        onChange={handleSelectChange}
                        placeholder="Search and select HS Code..."
                        isSearchable
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Country of Origin *</Form.Label>
                      <Select
                        name="country"
                        options={countries}
                        onChange={handleSelectChange}
                        placeholder="Select country..."
                        isSearchable
                        required
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Manufacturer's Part Number (Optional)</Form.Label>
                      <Form.Control
                        type="text"
                        name="manufacturerPartNumber"
                        value={formData.manufacturerPartNumber}
                        onChange={handleInputChange}
                        placeholder="Enter manufacturer's part number..."
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}></Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Country of Most Recent Cast (Optional)</Form.Label>
                      <Select
                        name="countryOfCast"
                        options={countries}
                        onChange={handleSelectChange}
                        placeholder="Select country of cast (defaults to origin)..."
                        isSearchable
                        isClearable
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Country of Largest Smelt (Optional)</Form.Label>
                      <Select
                        name="countryOfSmelt"
                        options={countries}
                        onChange={handleSelectChange}
                        placeholder="Select country of smelt (defaults to origin)..."
                        isSearchable
                        isClearable
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Product Cost (USD) *</Form.Label>
                      <Form.Control
                        type="number"
                        step="0.01"
                        name="productCost"
                        value={formData.productCost}
                        onChange={handleInputChange}
                        placeholder="Enter product cost..."
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Materials (Optional)</Form.Label>
                      <Select
                        isMulti
                        options={materialOptions}
                        onChange={handleMaterialsChange}
                        placeholder="Select materials..."
                      />
                    </Form.Group>

                    {/* Material Weight Inputs */}
                    {formData.materials.length > 0 && (
                      <Form.Group className="mb-3">
                        <Form.Label>Material Weights (kg)</Form.Label>
                        {formData.materials.map((material) => (
                          <div key={material} className="mb-2">
                            <Form.Label className="small text-muted">
                              {material.charAt(0).toUpperCase() +
                                material.slice(1)}{" "}
                              content (kg):
                            </Form.Label>
                            <Form.Control
                              type="number"
                              step="0.001"
                              placeholder={`Enter ${material} weight in kg...`}
                              value={formData.materialWeights[material] || ""}
                              onChange={(e) =>
                                handleMaterialWeightChange(
                                  material,
                                  e.target.value
                                )
                              }
                            />
                          </div>
                        ))}
                        <small className="text-muted">
                          Material weights are used to calculate tariffs on
                          material content separately from the base product
                          cost.
                        </small>
                      </Form.Group>
                    )}
                  </Col>
                </Row>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={loading}
                  className="w-100"
                >
                  {loading ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Calculating...
                    </>
                  ) : (
                    "Calculate Tariff"
                  )}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger" className="mb-4">
          {error}
        </Alert>
      )}

      {calculation && (
        <Row>
          <Col md={12}>
            <Card className="results-section">
              <Card.Header>
                <h3>Tariff Calculation Results</h3>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md={6}>
                    <h5>Product Details</h5>
                    <div className="breakdown-item">
                      <strong>HS Code:</strong> {calculation.hsCode}
                    </div>
                    <div className="breakdown-item">
                      <strong>Country:</strong> {calculation.country}
                    </div>
                    <div className="breakdown-item">
                      <strong>Product Cost:</strong> $
                      {calculation.productCost.toFixed(2)}
                    </div>
                  </Col>
                  <Col md={6}>
                    <h5>Tariff Breakdown</h5>
                    <div className="breakdown-item">
                      <strong>Base Tariff:</strong>{" "}
                      {calculation.baseTariff.rate}% ($
                      {calculation.baseTariff.amount.toFixed(2)})
                    </div>

                    {calculation.countrySpecific && (
                      <div
                        className={`breakdown-item ${
                          calculation.countrySpecific.exempted
                            ? "text-success"
                            : ""
                        }`}
                      >
                        <strong>Country-Specific Rate:</strong>{" "}
                        {calculation.countrySpecific.rate}% ($
                        {calculation.countrySpecific.amount.toFixed(2)})
                        {calculation.countrySpecific.exempted && (
                          <span className="text-success">
                            {" "}
                            (Exempted - was{" "}
                            {calculation.countrySpecific.originalRate}%)
                          </span>
                        )}
                      </div>
                    )}

                    {calculation.productSpecific.map((rate, index) => (
                      <div key={index} className="breakdown-item">
                        <strong>{rate.type} Rate:</strong> {rate.rate}% ($
                        {rate.amount.toFixed(2)})
                      </div>
                    ))}

                    {calculation.materialSpecific.map((rate, index) => (
                      <div key={index} className="breakdown-item">
                        <strong>
                          {rate.material} ({rate.type}):
                        </strong>{" "}
                        {rate.weight > 0 ? (
                          <>
                            {rate.weight}kg × $
                            {rate.currentMarketPrice?.price?.toFixed(3)}/kg = $
                            {rate.materialCost?.toFixed(2)} →{rate.rate}% tariff
                            = ${rate.amount.toFixed(2)}
                          </>
                        ) : (
                          <>
                            {rate.rate}% (${rate.amount.toFixed(2)})
                          </>
                        )}
                        {rate.currentMarketPrice && (
                          <small className="text-muted d-block">
                            Current {rate.currentMarketPrice.source} price: $
                            {rate.currentMarketPrice.price?.toFixed(3)}/kg
                          </small>
                        )}
                      </div>
                    ))}

                    {calculation.exemptions.map((exemption, index) => (
                      <div key={index} className="breakdown-item text-success">
                        <strong>{exemption.type} Exemption:</strong>{" "}
                        {exemption.description} (Country rate zeroed)
                      </div>
                    ))}
                  </Col>
                </Row>

                {/* Cost Breakdown Section (if materials with weights are used) */}
                {calculation.costBreakdown &&
                  calculation.costBreakdown.totalMaterialCost > 0 && (
                    <Row className="mt-4">
                      <Col>
                        <Card className="bg-light">
                          <Card.Body>
                            <h5>Cost Breakdown</h5>
                            <div className="breakdown-item">
                              <strong>Original Product Cost:</strong> $
                              {calculation.costBreakdown.originalProductCost.toFixed(
                                2
                              )}
                            </div>
                            <div className="breakdown-item">
                              <strong>Material Content Cost:</strong> $
                              {calculation.costBreakdown.totalMaterialCost.toFixed(
                                2
                              )}
                            </div>
                            <div className="breakdown-item">
                              <strong>Remaining Product Cost:</strong> $
                              {calculation.costBreakdown.remainingProductCost.toFixed(
                                2
                              )}
                            </div>
                            <hr />
                            <div className="breakdown-item">
                              <strong>Tariff on Material Content:</strong> $
                              {calculation.costBreakdown.materialTariffAmount.toFixed(
                                2
                              )}
                            </div>
                            <div className="breakdown-item">
                              <strong>Tariff on Remaining Product:</strong> $
                              {calculation.costBreakdown.remainingProductTariffAmount.toFixed(
                                2
                              )}
                            </div>
                          </Card.Body>
                        </Card>
                      </Col>
                    </Row>
                  )}

                <div className="total-section">
                  <Row>
                    <Col md={6}>
                      <h4>
                        Total Tariff Rate:{" "}
                        {calculation.effectiveTotalTariffRate
                          ? calculation.effectiveTotalTariffRate.toFixed(2)
                          : calculation.totalTariffRate.toFixed(2)}
                        %
                      </h4>
                      {calculation.effectiveTotalTariffRate && (
                        <small className="text-muted">
                          Effective rate on original product cost
                        </small>
                      )}
                    </Col>
                    <Col md={6}>
                      <h4>
                        Total Tariff Amount: $
                        {calculation.totalTariffAmount.toFixed(2)}
                      </h4>
                    </Col>
                  </Row>
                  <hr />
                  <Row>
                    <Col md={12}>
                      <h3 className="text-primary">
                        Final Cost (Product + Tariffs): $
                        {calculation.finalCost.toFixed(2)}
                      </h3>
                    </Col>
                  </Row>
                  <hr />
                  <Row>
                    <Col md={12}>
                      <Button 
                        variant="success" 
                        onClick={handleGeneratePDF}
                        className="me-2"
                      >
                        📄 Download PDF Report
                      </Button>
                      <Button 
                        variant="outline-secondary" 
                        onClick={() => testPDF()}
                        className="me-2"
                      >
                        🧪 Test PDF
                      </Button>
                      <small className="text-muted">
                        Generate a detailed PDF report for commercial invoice attachment
                      </small>
                    </Col>
                  </Row>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </Container>
  );
};

export default TariffCalculator;
