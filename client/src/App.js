import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Container, Navbar, Nav } from "react-bootstrap";
import TariffCalculator from "./components/TariffCalculator";
import AdminPanel from "./components/AdminPanel";
import "./App.css";

function App() {
  return (
    <Router>
      <div className="App">
        <Navbar bg="light" expand="lg" className="mb-4">
          <Container>
            <Navbar.Brand href="/">🧙‍♂️ Tariff Wizard</Navbar.Brand>
            <Navbar.Toggle aria-controls="basic-navbar-nav" />
            <Navbar.Collapse id="basic-navbar-nav">
              <Nav className="me-auto">
                <Nav.Link href="/">Calculator</Nav.Link>
                <Nav.Link href="/admin">Admin</Nav.Link>
              </Nav>
            </Navbar.Collapse>
          </Container>
        </Navbar>

        <Container>
          <Routes>
            <Route path="/" element={<TariffCalculator />} />
            <Route path="/admin" element={<AdminPanel />} />
          </Routes>
        </Container>
      </div>
    </Router>
  );
}

export default App;
