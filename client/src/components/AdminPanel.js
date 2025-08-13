import React, { useState } from "react";
import { Container, Row, Col, Card, Tabs, Tab, Alert } from "react-bootstrap";

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState("hscodes");

  return (
    <Container>
      <Row>
        <Col md={12}>
          <Card>
            <Card.Header>
              <h2>Admin Panel</h2>
              <p className="mb-0">Manage tariff data and system settings</p>
            </Card.Header>
            <Card.Body>
              <Alert variant="info">
                <h5>Admin Panel Coming Soon</h5>
                <p className="mb-0">This section will allow you to manage:</p>
                <ul className="mt-2 mb-0">
                  <li>HS Codes and their descriptions</li>
                  <li>Country-specific tariff rates</li>
                  <li>Product-specific tariff rules</li>
                  <li>Material-based tariff rates</li>
                  <li>Exemptions and special rates</li>
                  <li>PDF template configuration for UPS forms</li>
                </ul>
              </Alert>

              <Tabs
                activeKey={activeTab}
                onSelect={(k) => setActiveTab(k)}
                className="mb-3"
              >
                <Tab eventKey="hscodes" title="HS Codes">
                  <Alert variant="secondary">
                    HS Code management interface will be implemented here.
                  </Alert>
                </Tab>
                <Tab eventKey="countries" title="Countries">
                  <Alert variant="secondary">
                    Country rate management interface will be implemented here.
                  </Alert>
                </Tab>
                <Tab eventKey="products" title="Product Rates">
                  <Alert variant="secondary">
                    Product-specific rate management interface will be
                    implemented here.
                  </Alert>
                </Tab>
                <Tab eventKey="materials" title="Material Rates">
                  <Alert variant="secondary">
                    Material-based rate management interface will be implemented
                    here.
                  </Alert>
                </Tab>
                <Tab eventKey="exemptions" title="Exemptions">
                  <Alert variant="secondary">
                    Exemption management interface will be implemented here.
                  </Alert>
                </Tab>
                <Tab eventKey="pdf" title="PDF Templates">
                  <Alert variant="secondary">
                    PDF template configuration for UPS forms will be implemented
                    here.
                  </Alert>
                </Tab>
              </Tabs>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default AdminPanel;
