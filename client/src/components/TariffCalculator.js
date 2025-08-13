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

const TariffCalculator = () => {
  const [formData, setFormData] = useState({
    hsCode: "",
    country: "",
    productCost: "",
    materials: [],
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

  const materialOptions = [
    { value: "steel", label: "Steel" },
    { value: "aluminum", label: "Aluminum" },
    { value: "copper", label: "Copper" },
    { value: "lumber", label: "Lumber" },
    { value: "textiles", label: "Textiles" },
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
                      <div className="breakdown-item">
                        <strong>Country-Specific Rate:</strong>{" "}
                        {calculation.countrySpecific.rate}% ($
                        {calculation.countrySpecific.amount.toFixed(2)})
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
                        {rate.rate}% (${rate.amount.toFixed(2)})
                      </div>
                    ))}

                    {calculation.exemptions.map((exemption, index) => (
                      <div key={index} className="breakdown-item text-success">
                        <strong>{exemption.type} Exemption:</strong> -
                        {exemption.rate}% (-${exemption.amount.toFixed(2)})
                      </div>
                    ))}
                  </Col>
                </Row>

                <div className="total-section">
                  <Row>
                    <Col md={6}>
                      <h4>
                        Total Tariff Rate:{" "}
                        {calculation.totalTariffRate.toFixed(2)}%
                      </h4>
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
