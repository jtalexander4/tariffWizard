import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const generateTariffPDF = (calculationData, formData) => {
  console.log("generateTariffPDF called with:", calculationData, formData);

  try {
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });
    console.log("jsPDF instance created");

    // Add header
    doc.setFontSize(20);
    doc.text("Tariff Calculation Report", 20, 20);

    doc.setFontSize(12);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 30);

    doc.setFontSize(10);
    doc.text(`Current metal prices ref: LME (London Metal Exchange)`, 20, 40);

    // Add line separator
    doc.line(20, 45, 277, 45);
    console.log("Header added to PDF");

    // Prepare table data
    const tableData = [];

    // Main product row
    const {
      hsCode,
      country,
      productCost,
      manufacturerPartNumber = "N/A",
      countryOfCast,
      countryOfSmelt,
      baseTariff,
      countrySpecific,
      materialSpecific = [],
      exemptions = [],
      totalTariffAmount,
      totalTariffRate,
    } = calculationData;

    console.log("Extracted calculation data:", {
      hsCode,
      country,
      productCost,
      manufacturerPartNumber,
      totalTariffAmount,
      totalTariffRate,
    });

    // Use provided countries or default to country of origin
    const castCountry = countryOfCast || country;
    const smeltCountry = countryOfSmelt || country;

    // Extract just the country code from formatted strings like "Taiwan (TW)" -> "TW"
    const extractCountryCode = (countryString) => {
      if (!countryString) return "N/A";
      const match = countryString.match(/\(([^)]+)\)$/);
      return match ? match[1] : countryString;
    };

    const castCountryCode = extractCountryCode(castCountry);
    const smeltCountryCode = extractCountryCode(smeltCountry);

    // Calculate metal content values
    let totalMetalValue = 0;
    let totalMetalTariff = 0;
    let metalDetails = [];

    if (materialSpecific && materialSpecific.length > 0) {
      materialSpecific.forEach((material) => {
        console.log("Processing material for PDF:", material);
        totalMetalValue += material.materialCost || 0;
        totalMetalTariff += material.amount || 0;

        // Build description from available data - prioritize rateType
        let description = "N/A";
        if (material.type) {
          description = material.type;
        } else if (material.rateType) {
          description = material.rateType;
        } else if (material.specialRate?.type) {
          description = material.specialRate.type;
        } else if (material.specialRate?.rateType) {
          description = material.specialRate.rateType;
        } else if (material.description) {
          description = material.description;
        } else if (material.specialRate?.description) {
          description = material.specialRate.description;
        }

        metalDetails.push({
          material: material.material,
          weight: material.weight || 0,
          pricePerKg: material.currentMarketPrice?.price || 0,
          value: material.materialCost || 0,
          tariffRate: material.rate || 0,
          tariffAmount: material.amount || 0,
          description: description,
        });
      });
    }

    // Calculate non-metal values
    const nonMetalValue = parseFloat(productCost) - totalMetalValue;
    const nonMetalTariff = totalTariffAmount - totalMetalTariff;

    // Get non-metal tariff descriptions
    let nonMetalTariffDescriptions = [];
    if (baseTariff && baseTariff.amount > 0) {
      nonMetalTariffDescriptions.push(`Base Tariff (${baseTariff.rate}%)`);
    }
    if (countrySpecific && countrySpecific.amount > 0) {
      nonMetalTariffDescriptions.push(
        `Country Specific (${countrySpecific.rate}%)`
      );
    }

    // Add exemption descriptions if any
    if (exemptions && exemptions.length > 0) {
      exemptions.forEach((exemption) => {
        nonMetalTariffDescriptions.push(
          `Exemption: ${exemption.exemptionType} (${exemption.exemptionRate}%)`
        );
      });
    }

    if (nonMetalTariffDescriptions.length === 0) {
      nonMetalTariffDescriptions.push("No additional tariffs");
    }

    // If there are materials, create separate rows for each
    if (metalDetails.length > 0) {
      metalDetails.forEach((metal, index) => {
        tableData.push([
          hsCode,
          calculationData.hsCodeDescription || "Product Description",
          manufacturerPartNumber,
          index === 0 ? `$${parseFloat(productCost).toFixed(2)}` : "",
          index === 0 ? country : "",
          metal.material.charAt(0).toUpperCase() + metal.material.slice(1),
          index === 0 ? castCountryCode : "", // Country of most recent cast
          index === 0 ? smeltCountryCode : "", // Country of most recent smelt
          `${metal.weight.toFixed(3)} kg`,
          `$${metal.pricePerKg.toFixed(2)}/kg`,
          `$${metal.value.toFixed(2)}`,
          metal.description,
          `$${metal.tariffAmount.toFixed(2)}`,
          index === 0 ? `$${nonMetalValue.toFixed(2)}` : "",
          index === 0 ? nonMetalTariffDescriptions.join(", ") : "",
          index === 0 ? `$${nonMetalTariff.toFixed(2)}` : "",
          index === 0 ? `$${totalTariffAmount.toFixed(2)}` : "",
        ]);
      });
    } else {
      // No materials - single row
      tableData.push([
        hsCode,
        calculationData.hsCodeDescription || "Product Description",
        manufacturerPartNumber,
        `$${parseFloat(productCost).toFixed(2)}`,
        country,
        "N/A", // No metal
        castCountryCode, // Country of most recent cast
        smeltCountryCode, // Country of most recent smelt
        "N/A",
        "N/A",
        "N/A",
        "N/A",
        "N/A",
        `$${parseFloat(productCost).toFixed(2)}`,
        nonMetalTariffDescriptions.join(", "),
        `$${totalTariffAmount.toFixed(2)}`,
        `$${totalTariffAmount.toFixed(2)}`,
      ]);
    }

    // Table headers
    const headers = [
      "HS Code",
      "Description",
      "Mfg Part #",
      "Total Value",
      "Country of Origin",
      "Metal",
      "Country of Cast",
      "Country of Smelt",
      "Metal Weight",
      "Metal Price/kg",
      "Metal Value",
      "Metal Tariff Type",
      "Metal Tariff Due",
      "Non-Metal Value",
      "Non-Metal Tariff Type",
      "Non-Metal Tariff Due",
      "Total Tariff Due",
    ];

    // Generate table
    autoTable(doc, {
      head: [headers],
      body: tableData,
      startY: 55,
      styles: {
        fontSize: 7,
        cellPadding: 1.5,
        overflow: "linebreak",
        cellWidth: "auto",
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 7,
      },
      tableWidth: "auto",
      theme: "grid",
      margin: { left: 5, right: 5 },
      didDrawPage: function (data) {
        // Store the final Y position for summary section
        doc.lastAutoTable = data;
      },
    });

    // Add summary section
    const finalY = (doc.lastAutoTable?.cursor?.y || 200) + 20;

    doc.setFontSize(14);
    doc.text("Summary", 20, finalY);

    doc.setFontSize(10);
    doc.text(
      `Total Product Value: $${parseFloat(productCost).toFixed(2)}`,
      20,
      finalY + 10
    );
    doc.text(
      `Total Metal Value: $${totalMetalValue.toFixed(2)}`,
      20,
      finalY + 20
    );
    doc.text(
      `Total Non-Metal Value: $${nonMetalValue.toFixed(2)}`,
      20,
      finalY + 30
    );
    doc.text(
      `Total Tariff Rate: ${totalTariffRate.toFixed(2)}%`,
      20,
      finalY + 40
    );
    doc.text(
      `Total Tariff Amount: $${totalTariffAmount.toFixed(2)}`,
      20,
      finalY + 50
    );
    doc.text(
      `Final Landed Cost: $${(
        parseFloat(productCost) + totalTariffAmount
      ).toFixed(2)}`,
      20,
      finalY + 60
    );

    // Add footer
    doc.setFontSize(8);
    doc.text(
      "Generated by Tariff Wizard - For commercial invoice attachment",
      20,
      200
    );

    console.log("About to save PDF...");

    // Save the PDF
    const filename = `tariff-calculation-${hsCode}-${Date.now()}.pdf`;
    doc.save(filename);

    console.log("PDF saved with filename:", filename);
    return filename;
  } catch (error) {
    console.error("Error in generateTariffPDF:", error);
    throw error;
  }
};
