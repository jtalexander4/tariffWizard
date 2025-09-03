/**
 * PDF Generator for Tariff Calculations
 *
 * Generates professional tariff calculation reports for commercial invoice attachment.
 * Creates landscape-oriented         metalDetails.push({
          index === 0 ? hsCode : "",
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
        });sive tariff breakdowns including
 * metal-specific rates, country-specific tariffs, and special rates.
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * Generates a professional PDF report for tariff calculations
 * @param {Object} calculationData - Tariff calculation results from the API
 * @param {Object} formData - Form input data for additional context
 * @returns {string} - Generated PDF filename
 */
export const generateTariffPDF = (calculationData, formData) => {
  try {
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    // Add header
    doc.setFontSize(20);
    doc.text("Tariff Calculation Report", 20, 20);

    doc.setFontSize(12);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 30);

    doc.setFontSize(10);
    doc.text(`Current metal prices ref: LME (London Metal Exchange)`, 20, 40);

    // Add line separator
    doc.line(20, 45, 277, 45);

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
      specialRates = [],
      exemptions = [],
      totalTariffAmount,
      totalTariffRate,
    } = calculationData;

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
        totalMetalValue += material.materialCost || 0;
        totalMetalTariff += material.amount || 0;

        // Build description from available data - prioritize rateCode
        let description = "N/A";
        if (material.rateCode) {
          description = material.rateCode;
        } else if (material.type) {
          description = material.type;
        } else if (material.rateType) {
          description = material.rateType;
        } else if (material.specialRate?.rateCode) {
          description = material.specialRate.rateCode;
        } else if (material.specialRate?.type) {
          description = material.specialRate.type;
        } else if (material.specialRate?.rateType) {
          description = material.specialRate.rateType;
        } else if (material.description) {
          description = material.description;
        } else if (material.specialRate?.description) {
          description = material.specialRate.description;
        }

        // Format description with rate percentage like "Section 232 (50%)"
        const formattedDescription = material.rate > 0 
          ? `${description} (${material.rate}%)` 
          : description;

        metalDetails.push({
          material: material.material,
          weight: material.weight || 0,
          pricePerKg: material.currentMarketPrice?.price || 0,
          value: material.materialCost || 0,
          tariffRate: material.rate || 0,
          tariffAmount: material.amount || 0,
          description: formattedDescription,
        });
      });
    }

    // Calculate non-metal values
    const nonMetalValue = parseFloat(productCost) - totalMetalValue;
    const nonMetalTariff = totalTariffAmount - totalMetalTariff;

    // Get non-metal tariff descriptions
    let nonMetalTariffDescriptions = [];
    if (baseTariff && baseTariff.amount > 0) {
      // Prioritize rateCode for base tariff
      const baseDescription = baseTariff.rateCode || "Base Tariff";
      nonMetalTariffDescriptions.push(`${baseDescription} (${baseTariff.rate}%)`);
    }
    if (countrySpecific && countrySpecific.amount > 0) {
      // Prioritize rateCode for country-specific tariff
      const countryDescription = countrySpecific.rateCode || "Country Specific";
      nonMetalTariffDescriptions.push(`${countryDescription} (${countrySpecific.rate}%)`);
    }

    // Add special rates (like Section 301) if any
    if (specialRates && specialRates.length > 0) {
      specialRates.forEach((specialRate) => {
        // Prioritize rateCode over type for special rates
        const rateDescription = specialRate.rateCode || specialRate.type || "Special Rate";
        nonMetalTariffDescriptions.push(
          `${rateDescription} (${specialRate.rate}%)`
        );
      });
    }

    // Check if country-specific rate was exempted
    if (countrySpecific && countrySpecific.exempted) {
      nonMetalTariffDescriptions.push(
        `Exemption: Country Ad Valorem does not apply`
      );
    } else {
      // Add exemption descriptions if any (only if country rate wasn't already exempted)
      if (exemptions && exemptions.length > 0) {
        exemptions.forEach((exemption) => {
          nonMetalTariffDescriptions.push(
            `Exemption: Country Ad Valorem does not apply`
          );
        });
      }
    }

    if (nonMetalTariffDescriptions.length === 0) {
      nonMetalTariffDescriptions.push("No additional tariffs");
    }

    // If there are materials, create separate rows for each
    if (metalDetails.length > 0) {
      metalDetails.forEach((metal, index) => {
        tableData.push([
          index === 0 ? hsCode : "",
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

    // Add total row
    tableData.push([
      "TOTAL",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      `$${totalTariffAmount.toFixed(2)}`,
    ]);

    // Table headers
    const headers = [
      "HS Code",
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
      bodyStyles: {
        fontSize: 7,
      },
      // Style the total row differently
      didParseCell: function (data) {
        if (data.row.index === tableData.length - 1) {
          data.cell.styles.fillColor = [240, 240, 240];
          data.cell.styles.fontStyle = "bold";
        }
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

    // Save the PDF
    const filename = `tariff-calculation-${hsCode}-${Date.now()}.pdf`;
    doc.save(filename);

    return filename;
  } catch (error) {
    console.error("Error in generateTariffPDF:", error);
    throw error;
  }
};

/**
 * Generates a professional PDF report for multiple tariff calculations
 * @param {Object} reportData - Report data with products array and summary
 * @param {Object} formData - Form input data for additional context
 * @returns {string} - Generated PDF filename
 */
export const generateMultiProductPDF = (reportData, formData) => {
  try {
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    // Add header
    doc.setFontSize(20);
    doc.text("Tariff Declaration Addendum", 20, 20);

    doc.setFontSize(12);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 30);
    doc.text(`Report ID: ${reportData.reportId}`, 20, 35);

    doc.setFontSize(10);
    doc.text(`Current metal prices ref: LME (London Metal Exchange)`, 20, 45);

    // Add line separator
    doc.line(20, 50, 277, 50);

    // Prepare table data for all products
    const tableData = [];

    // Extract just the country code from formatted strings like "Taiwan (TW)" -> "TW"
    const extractCountryCode = (countryString) => {
      if (!countryString) return "N/A";
      const match = countryString.match(/\(([^)]+)\)$/);
      return match ? match[1] : countryString;
    };

    reportData.products.forEach((product) => {
      const {
        hsCode,
        country,
        productCost,
        quantity,
        baseTariff,
        countrySpecific,
        materialSpecific = [],
        specialRates = [],
        exemptions = [],
        totalTariffAmount,
        totalTariffRate,
      } = product;

      // Calculate metal content values
      let totalMetalValue = 0;
      let totalMetalTariff = 0;
      let metalDetails = [];

      if (materialSpecific && materialSpecific.length > 0) {
        materialSpecific.forEach((material) => {
          totalMetalValue += material.materialCost || 0;
          totalMetalTariff += material.amount || 0;

          // Build description from available data - prioritize rateCode
          let description = "N/A";
          if (material.rateCode) {
            description = material.rateCode;
          } else if (material.type) {
            description = material.type;
          } else if (material.rateType) {
            description = material.rateType;
          } else if (material.specialRate?.rateCode) {
            description = material.specialRate.rateCode;
          } else if (material.specialRate?.type) {
            description = material.specialRate.type;
          } else if (material.specialRate?.rateType) {
            description = material.specialRate.rateType;
          } else if (material.description) {
            description = material.description;
          } else if (material.specialRate?.description) {
            description = material.specialRate.description;
          }

          // Format description with rate percentage like "Section 232 (50%)"
          const formattedDescription = material.rate > 0 
            ? `${description} (${material.rate}%)` 
            : description;

          metalDetails.push({
            material: material.material,
            weight: material.weight || 0,
            pricePerKg: material.currentMarketPrice?.price || 0,
            value: material.materialCost || 0,
            tariffRate: material.rate || 0,
            tariffAmount: material.amount || 0,
            description: formattedDescription,
          });
        });
      }

      // Calculate non-metal values
      const nonMetalValue = parseFloat(productCost) - totalMetalValue;
      const nonMetalTariff = totalTariffAmount - totalMetalTariff;

      // Get non-metal tariff descriptions
      let nonMetalTariffDescriptions = [];
      if (baseTariff && baseTariff.amount > 0) {
        // Prioritize rateCode for base tariff
        const baseDescription = baseTariff.rateCode || "Base Tariff";
        nonMetalTariffDescriptions.push(`${baseDescription} (${baseTariff.rate}%)`);
      }
      if (countrySpecific && countrySpecific.amount > 0) {
        // Prioritize rateCode for country-specific tariff
        const countryDescription = countrySpecific.rateCode || "Country Specific";
        nonMetalTariffDescriptions.push(`${countryDescription} (${countrySpecific.rate}%)`);
      }

      // Add special rates
      if (specialRates && specialRates.length > 0) {
        specialRates.forEach((specialRate) => {
          // Prioritize rateCode over type for special rates
          const rateDescription = specialRate.rateCode || specialRate.type || "Special Rate";
          nonMetalTariffDescriptions.push(
            `${rateDescription} (${specialRate.rate}%)`
          );
        });
      }

      if (nonMetalTariffDescriptions.length === 0) {
        nonMetalTariffDescriptions.push("No additional tariffs");
      }

      // Add product header row
      tableData.push([
        product.manufacturerPartNumber || "N/A",
        hsCode,
        `$${parseFloat(productCost).toFixed(2)}`,
        quantity,
        country,
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        `$${totalTariffAmount.toFixed(2)}`,
      ]);

      // If there are materials, create separate rows for each
      if (metalDetails.length > 0) {
        metalDetails.forEach((metal, index) => {
          tableData.push([
            "",
            "",
            "",
            "",
            "",
            metal.material.charAt(0).toUpperCase() + metal.material.slice(1),
            `${metal.weight.toFixed(3)} kg`,
            `$${metal.pricePerKg.toFixed(2)}/kg`,
            `$${metal.value.toFixed(2)}`,
            `$${metal.tariffAmount.toFixed(2)}`,
            metal.description, // Tariff Type for metal
            product.countryOfCast ? extractCountryCode(product.countryOfCast) : extractCountryCode(country),
            product.countryOfSmelt ? extractCountryCode(product.countryOfSmelt) : extractCountryCode(country),
            "",
          ]);
        });
      }

      // Add non-metal row
      tableData.push([
        "",
        "",
        "",
        "",
        "",
        "Non-Metal",
        "",
        "",
        `$${nonMetalValue.toFixed(2)}`,
        `$${nonMetalTariff.toFixed(2)}`,
        nonMetalTariffDescriptions.join(", "),
        "",
        "",
        "",
      ]);

    });

    // Add total row
    const totalTariffDue = tableData.reduce((sum, row) => {
      const lastCell = row[row.length - 1];
      if (lastCell && typeof lastCell === 'string' && lastCell.startsWith('$')) {
        return sum + parseFloat(lastCell.replace('$', ''));
      }
      return sum;
    }, 0);

    tableData.push([
      "TOTAL",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      `$${totalTariffDue.toFixed(2)}`,
    ]);

    // Table headers
    const headers = [
      "Mfg Part #",
      "HS Code",
      "Unit Cost",
      "Quantity",
      "Country",
      "Component",
      "Weight",
      "Price/kg",
      "Value",
      "Tariff Due",
      "Tariff Type",
      "Cast Country",
      "Smelt Country",
      "Total Tariff",
    ];

    // Generate table
    autoTable(doc, {
      head: [headers],
      body: tableData,
      startY: 60,
      styles: {
        fontSize: 6,
        cellPadding: 1,
        overflow: "linebreak",
        cellWidth: "auto",
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 6,
      },
      bodyStyles: {
        fontSize: 6,
      },
      // Style the total row differently
      didParseCell: function (data) {
        if (data.row.index === tableData.length - 1) {
          data.cell.styles.fillColor = [240, 240, 240];
          data.cell.styles.fontStyle = "bold";
        }
      },
      tableWidth: "auto",
      theme: "grid",
      margin: { left: 5, right: 5 },
      didDrawPage: function (data) {
        doc.lastAutoTable = data;
      },
    });

    // Add summary section
    const finalY = (doc.lastAutoTable?.cursor?.y || 200) + 20;

    doc.setFontSize(14);
    doc.text("Report Summary", 20, finalY);

    doc.setFontSize(10);
    doc.text(
      `Total Products: ${reportData.summary.totalProducts}`,
      20,
      finalY + 10
    );
    doc.text(
      `Total Product Cost: $${reportData.summary.totalProductCost.toFixed(2)}`,
      20,
      finalY + 20
    );
    doc.text(
      `Total Tariff Amount: $${reportData.summary.totalTariffAmount.toFixed(2)}`,
      20,
      finalY + 30
    );
    doc.text(
      `Total Final Cost: $${reportData.summary.totalFinalCost.toFixed(2)}`,
      20,
      finalY + 40
    );

    // Add footer
    doc.setFontSize(8);
    doc.text(
      "Generated by Tariff Wizard - For commercial invoice attachment",
      20,
      200
    );

    // Save the PDF
    const filename = `tariff-declaration-${Date.now()}.pdf`;
    doc.save(filename);

    return filename;
  } catch (error) {
    console.error("Error in generateMultiProductPDF:", error);
    throw error;
  }
};
